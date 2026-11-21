-- Historical captures remain untouched. Validate them when a cycle changes or a
-- new visit is written so existing conflicts can be reviewed without data loss.
create function public.lot_visit_parse_date(p_value text)
returns date
language plpgsql
immutable
strict
set search_path = ''
as $$
begin
  if p_value !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then return null; end if;
  return p_value::date;
exception
  when datetime_field_overflow or invalid_datetime_format then return null;
end;
$$;
revoke all on function public.lot_visit_parse_date(text) from public, anon, authenticated;

create function public.lot_visit_details(p_data jsonb, p_fallback date)
returns table (lot_code text, visit_date date)
language sql
immutable
set search_path = ''
as $$
  with details as (
    select value as detail
    from jsonb_array_elements(
      case
        when jsonb_typeof(p_data #> '{subregistros,malezas_detalle}') = 'array' then
          case when jsonb_array_length(p_data #> '{subregistros,malezas_detalle}') > 0
            then p_data #> '{subregistros,malezas_detalle}'
            else jsonb_build_array(p_data) end
        else jsonb_build_array(p_data)
      end
    )
  ), raw as (
    select
      nullif(btrim(coalesce(detail ->> 'LOTE', detail ->> 'lote')), '') as lot,
      coalesce(
        nullif(btrim(detail ->> 'FECHA'), ''),
        nullif(btrim(detail ->> 'fecha'), ''),
        nullif(btrim(p_data ->> 'FECHA'), ''),
        nullif(btrim(p_data ->> 'fecha'), '')
      ) as day
    from details
  )
  select case when lot ~ '^[0-9]{1,7}$' then lpad(lot, 7, '0') else lot end,
    coalesce(public.lot_visit_parse_date(day), p_fallback)
  from raw
  where lot is not null;
$$;

revoke all on function public.lot_visit_details(jsonb, date) from public, anon, authenticated;

alter table public.lot_visit_plans
  add constraint lot_visit_plans_max_five_dates check (cardinality(visit_dates) <= 5) not valid;
alter table public.lot_visit_plans validate constraint lot_visit_plans_max_five_dates;

create function public.validate_lot_visit_cycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  proposed record;
  cycle_start date;
  existing_count bigint;
begin
  if new.tipo <> 'malezas' then return new; end if;
  if tg_op = 'UPDATE' and old.tipo = new.tipo and old.datos = new.datos then return new; end if;
  if auth.uid() is not null and (
    public.current_user_can_capture_type('malezas') is not true
    or public.current_user_can_access_record_scope(new.datos) is not true
  ) then
    raise exception 'No tienes permiso para capturar esta visita';
  end if;
  if not exists (select 1 from public.lot_visit_details(new.datos, null)) then
    raise exception 'La captura de Malezas debe contener un lote y una fecha de visita';
  end if;
  if exists (
    select 1 from public.lot_visit_details(new.datos, null)
    where visit_date is null
  ) then
    raise exception 'Cada visita debe tener una fecha válida';
  end if;
  if exists (
    select 1 from public.lot_visit_details(new.datos, null)
    group by lot_code having count(distinct visit_date) > 1
  ) then
    raise exception 'Un lote no puede tener varias fechas en la misma captura';
  end if;

  for proposed in
    select lot_code, min(visit_date) as visit_date
    from public.lot_visit_details(new.datos, null)
    group by lot_code order by lot_code
  loop
    select cycle_date into cycle_start
    from public.lot_visit_plans
    where lot_code = proposed.lot_code
    for update;
    if not found then
      raise exception 'El lote % necesita un plan con fecha de inicio del ciclo', proposed.lot_code;
    end if;
    if proposed.visit_date < cycle_start then
      raise exception 'La visita del lote % es anterior al inicio del ciclo', proposed.lot_code;
    end if;
    if exists (
      select 1 from public.field_records r
      cross join lateral public.lot_visit_details(r.datos, r.created_at::date) v
      where r.tipo = 'malezas' and r.id <> new.id
        and v.lot_code = proposed.lot_code and v.visit_date = proposed.visit_date
    ) then
      raise exception 'Ya existe una visita para el lote % en esa fecha', proposed.lot_code;
    end if;
    select count(distinct r.id) into existing_count
    from public.field_records r
    cross join lateral public.lot_visit_details(r.datos, r.created_at::date) v
    left join public.lot_visit_capture_links link
      on link.record_id = r.id and link.lot_code = v.lot_code
    where r.tipo = 'malezas' and r.id <> new.id
      and v.lot_code = proposed.lot_code and v.visit_date >= cycle_start
      and (link.record_id is null or link.cycle_date = cycle_start);
    if existing_count >= 5 then
      raise exception 'El lote % ya tiene cinco visitas en este ciclo', proposed.lot_code;
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function public.validate_lot_visit_cycle() from public, anon, authenticated;
create trigger validate_lot_visit_cycle
before insert or update on public.field_records
for each row execute function public.validate_lot_visit_cycle();

create function public.validate_lot_plan_cycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  total bigint;
  has_duplicates boolean;
begin
  if tg_op = 'UPDATE' and old.cycle_date = new.cycle_date and old.lot_code = new.lot_code then return new; end if;
  if auth.uid() is not null and (
    public.current_user_can_review() is not true
    or not exists (
      select 1 from public.field_lots lot
      where lot.lot_code = new.lot_code and public.current_user_can_access_zone(lot.zone)
    )
  ) then
    raise exception 'No tienes permiso para guardar este plan';
  end if;
  with visits as (
    select distinct r.id, v.visit_date, link.cycle_date
    from public.field_records r
    cross join lateral public.lot_visit_details(r.datos, r.created_at::date) v
    left join public.lot_visit_capture_links link
      on link.record_id = r.id and link.lot_code = v.lot_code
    where r.tipo = 'malezas' and v.lot_code = new.lot_code
      and v.visit_date >= new.cycle_date
  )
  select count(distinct id) filter (where cycle_date is null or cycle_date = new.cycle_date), exists (
    select 1 from visits group by visit_date having count(distinct id) > 1
  )
  into total, has_duplicates from visits;
  if total > 5 or has_duplicates then
    raise exception 'El ciclo del lote % tiene visitas históricas en conflicto; revísalas antes de cambiarlo', new.lot_code;
  end if;
  return new;
end;
$$;

revoke all on function public.validate_lot_plan_cycle() from public, anon, authenticated;
create trigger validate_lot_plan_cycle
before insert or update on public.lot_visit_plans
for each row execute function public.validate_lot_plan_cycle();

alter table public.lot_visit_capture_links
  drop constraint lot_visit_capture_links_visit_number_check;
alter table public.lot_visit_capture_links
  add constraint lot_visit_capture_links_visit_number_check check (visit_number between 1 and 5);

create or replace function public.save_lot_visit_capture(
  p_record_id uuid,
  p_lot_code text,
  p_cycle_date date,
  p_visit_number integer,
  p_scheduled_date date,
  p_datos jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan_row public.lot_visit_plans%rowtype;
  existing_record public.field_records%rowtype;
  existing_link public.lot_visit_capture_links%rowtype;
  detail jsonb;
  detail_date text;
  lot_zone text;
  lot_farm text;
  occupied boolean;
begin
  if public.current_user_can_review() is not true
    or public.current_user_can_capture_type('malezas') is not true then
    raise exception 'No tienes permiso para capturar visitas';
  end if;
  if p_record_id is null or p_lot_code is null or p_cycle_date is null
    or p_visit_number is null or p_visit_number not between 1 and 5
    or p_scheduled_date is null or jsonb_typeof(p_datos) is distinct from 'object' then
    raise exception 'Los datos de la visita no son válidos';
  end if;
  select zone, finca into lot_zone, lot_farm
  from public.field_lots where lot_code = p_lot_code;
  if not found or public.current_user_can_access_zone(lot_zone) is not true then
    raise exception 'No tienes acceso al lote';
  end if;
  select * into plan_row from public.lot_visit_plans where lot_code = p_lot_code for update;
  if not found then raise exception 'El plan del lote ya no existe'; end if;

  select * into existing_record from public.field_records where id = p_record_id;
  if found then
    select * into existing_link from public.lot_visit_capture_links where record_id = p_record_id;
    if found and existing_record.owner_id = auth.uid()
      and existing_link.lot_code = p_lot_code and existing_link.cycle_date = p_cycle_date
      and existing_link.visit_number = p_visit_number and existing_record.datos = p_datos then
      return p_record_id;
    end if;
    raise exception 'La captura ya existe o sus datos cambiaron; actualiza la agenda antes de continuar';
  end if;
  if plan_row.cycle_date <> p_cycle_date
    or plan_row.visit_dates[p_visit_number] is distinct from p_scheduled_date then
    raise exception 'El plan cambió; actualiza la agenda antes de capturar';
  end if;
  if public.current_user_can_access_record_scope(p_datos) is not true
    or p_datos ->> 'FINCA' is distinct from lot_farm
    or p_datos ->> 'ZONA' is distinct from lot_zone
    or p_datos ->> 'ID' is distinct from p_record_id::text
    or jsonb_typeof(p_datos #> '{subregistros,malezas_detalle}') is distinct from 'array' then
    raise exception 'Los datos de la captura no corresponden al lote autorizado';
  end if;
  if jsonb_array_length(p_datos #> '{subregistros,malezas_detalle}') <> 1 then
    raise exception 'La captura debe contener exactamente un lote';
  end if;
  detail := p_datos #> '{subregistros,malezas_detalle,0}';
  detail_date := coalesce(nullif(btrim(detail ->> 'FECHA'), ''), nullif(btrim(p_datos ->> 'FECHA'), ''));
  if detail ->> 'LOTE' is distinct from p_lot_code
    or detail ->> 'ID_NEW' is distinct from p_record_id::text
    or coalesce(detail ->> 'LABOR', '') not in ('Plantilla', 'Soca')
    or detail_date is null or detail_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or detail_date::date < p_cycle_date then
    raise exception 'El detalle debe tener el lote, labor y fecha válidos para el ciclo';
  end if;

  with visits as (
    select visit.record_id, link.visit_number, link.cycle_date
    from public.get_lot_followup_visits() visit
    left join public.lot_visit_capture_links link
      on link.record_id = visit.record_id and link.lot_code = visit.lot_code
    where visit.lot_code = p_lot_code
      and (link.record_id is null or link.cycle_date = p_cycle_date)
  ), free_slots as (
    select slot.number, row_number() over (order by slot.number) as position
    from generate_series(1, cardinality(plan_row.visit_dates)) slot(number)
    where not exists (select 1 from visits where visit_number = slot.number)
  )
  select exists (select 1 from visits where visit_number = p_visit_number)
    or exists (
      select 1 from free_slots
      where number = p_visit_number
        and position <= (select count(*) from visits where visit_number is null)
    )
  into occupied;
  if occupied then raise exception 'La visita ya fue realizada; actualiza la agenda'; end if;

  insert into public.field_records (id, owner_id, tipo, schema_version, datos)
  values (p_record_id, auth.uid(), 'malezas', 5, p_datos);
  insert into public.lot_visit_capture_links (lot_code, cycle_date, visit_number, record_id)
  values (p_lot_code, p_cycle_date, p_visit_number, p_record_id);
  return p_record_id;
end;
$$;
