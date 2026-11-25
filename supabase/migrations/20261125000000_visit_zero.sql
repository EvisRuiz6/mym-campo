alter table public.lot_visit_plans
  add column visit_zero_date date;

alter table public.lot_visit_plans
  add constraint lot_visit_plans_valid_visit_zero check (
    visit_zero_date is null or (
      visit_zero_date >= cycle_date
      and cardinality(visit_dates) < 5
      and (cardinality(visit_dates) = 0 or visit_zero_date < visit_dates[1])
    )
  );

alter table public.lot_visit_capture_links
  drop constraint lot_visit_capture_links_visit_number_check;
alter table public.lot_visit_capture_links
  add constraint lot_visit_capture_links_visit_number_check check (visit_number between 0 and 5);

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
  if (public.current_user_can_review() is not true and public.current_user_can_view_all_records() is not true)
    or public.current_user_can_capture_type('malezas') is not true then
    raise exception 'No tienes permiso para capturar visitas';
  end if;
  if p_record_id is null or p_lot_code is null or p_cycle_date is null
    or p_visit_number is null or p_visit_number not between 0 and 5
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
    or (case when p_visit_number = 0 then plan_row.visit_zero_date
      else plan_row.visit_dates[p_visit_number] end) is distinct from p_scheduled_date then
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
    select visit.record_id, visit.visit_number, visit.cycle_date
    from public.get_weekly_capture_visits() visit
    where visit.lot_code = p_lot_code
      and (visit.visit_number is null or visit.cycle_date = p_cycle_date)
  ), slots as (
    select 0 as number where plan_row.visit_zero_date is not null
    union all
    select number from generate_series(1, cardinality(plan_row.visit_dates)) number
  ), free_slots as (
    select slot.number, row_number() over (order by slot.number) as position
    from slots slot
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
