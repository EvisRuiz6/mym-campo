create table public.lot_visit_capture_links (
  lot_code text not null references public.field_lots (lot_code) on update cascade on delete restrict,
  cycle_date date not null,
  visit_number integer not null check (visit_number between 1 and 3),
  record_id uuid not null unique references public.field_records (id) on delete cascade,
  primary key (lot_code, cycle_date, visit_number)
);

alter table public.lot_visit_capture_links enable row level security;
revoke all on public.lot_visit_capture_links from public, anon, authenticated;

create function public.get_lot_followup_visits_with_links()
returns table (record_id uuid, lot_code text, visit_date date, cycle_date date, visit_number integer)
language sql
stable
security definer
set search_path = ''
as $$
  select visit.record_id, visit.lot_code, visit.visit_date, link.cycle_date, link.visit_number
  from public.get_lot_followup_visits() visit
  left join public.lot_visit_capture_links link
    on link.record_id = visit.record_id and link.lot_code = visit.lot_code;
$$;

revoke all on function public.get_lot_followup_visits_with_links() from public, anon;
grant execute on function public.get_lot_followup_visits_with_links() to authenticated;

-- Serialize ordinary Malezas writes with scheduled captures for every affected lot.
create function public.lock_lot_visit_capture_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  plan_row record;
  linked public.lot_visit_capture_links%rowtype;
  detail jsonb;
  detail_date text;
begin
  for plan_row in
    select plan.lot_code
    from public.lot_visit_plans plan
    where exists (
      select 1
      from (
        select lot_code from public.record_lot_codes(
          case when tg_op <> 'INSERT' and old.tipo = 'malezas' then old.datos else '{}'::jsonb end
        )
        union
        select lot_code from public.record_lot_codes(
          case when tg_op <> 'DELETE' and new.tipo = 'malezas' then new.datos else '{}'::jsonb end
        )
      ) codes
      where plan.lot_code = case
        when codes.lot_code ~ '^[0-9]{1,7}$' then lpad(codes.lot_code, 7, '0')
        else codes.lot_code
      end
    )
    order by plan.lot_code
    for update
  loop
    null;
  end loop;

  if tg_op = 'UPDATE' then
    select * into linked from public.lot_visit_capture_links where record_id = old.id;
    if found then
      if new.tipo <> 'malezas'
        or jsonb_typeof(new.datos #> '{subregistros,malezas_detalle}') is distinct from 'array' then
        raise exception 'La captura vinculada debe conservar un detalle de Malezas';
      end if;
      if jsonb_array_length(new.datos #> '{subregistros,malezas_detalle}') <> 1 then
        raise exception 'La captura vinculada debe conservar un detalle de Malezas';
      end if;
      detail := new.datos #> '{subregistros,malezas_detalle,0}';
      detail_date := coalesce(nullif(btrim(detail ->> 'FECHA'), ''), nullif(btrim(new.datos ->> 'FECHA'), ''));
      if detail ->> 'LOTE' is distinct from linked.lot_code
        or detail_date is null
        or detail_date !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        or detail_date::date < linked.cycle_date then
        raise exception 'La captura vinculada debe conservar su lote y una fecha válida del ciclo';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.lock_lot_visit_capture_records() from public, anon, authenticated;
create trigger lock_lot_visit_capture_records
before insert or update or delete on public.field_records
for each row execute function public.lock_lot_visit_capture_records();

create function public.save_lot_visit_capture(
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
    or p_visit_number is null or p_visit_number not between 1 and 3
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

revoke all on function public.save_lot_visit_capture(uuid, text, date, integer, date, jsonb) from public, anon;
grant execute on function public.save_lot_visit_capture(uuid, text, date, integer, date, jsonb) to authenticated;
