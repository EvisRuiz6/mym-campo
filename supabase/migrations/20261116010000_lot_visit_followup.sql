create or replace function public.is_valid_lot_visit_schedule(p_cycle_date date, p_visit_dates date[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    bool_and(
      date_value is not null
      and date_value >= p_cycle_date
      and (previous_date is null or date_value > previous_date)
    ),
    true
  )
  from (
    select
      scheduled_date as date_value,
      lag(scheduled_date) over (order by ordinal) as previous_date
    from unnest(coalesce(p_visit_dates, array[]::date[])) with ordinality as dates(scheduled_date, ordinal)
  ) as schedule;
$$;

revoke all on function public.is_valid_lot_visit_schedule(date, date[]) from public, anon;
grant execute on function public.is_valid_lot_visit_schedule(date, date[]) to authenticated;

create table if not exists public.lot_visit_plans (
  lot_code text primary key references public.field_lots (lot_code) on update cascade on delete restrict,
  cycle_date date not null,
  crop_state text not null default '',
  responsible text not null default '',
  visit_dates date[] not null default array[]::date[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lot_visit_plans drop constraint if exists lot_visit_plans_valid_schedule;
alter table public.lot_visit_plans
  add constraint lot_visit_plans_valid_schedule
  check (public.is_valid_lot_visit_schedule(cycle_date, visit_dates));

create index if not exists lot_visit_plans_cycle_date_idx
  on public.lot_visit_plans (cycle_date desc);

create index if not exists field_records_malezas_created_idx
  on public.field_records (created_at desc)
  where tipo = 'malezas';

alter table public.lot_visit_plans enable row level security;

drop policy if exists "Reviewers manage lot visit plans in assigned zones" on public.lot_visit_plans;
create policy "Reviewers manage lot visit plans in assigned zones"
  on public.lot_visit_plans for all to authenticated
  using (
    (select public.current_user_can_review())
    and exists (
      select 1
      from public.field_lots lot
      where lot.lot_code = lot_visit_plans.lot_code
        and (select public.current_user_can_access_zone(lot.zone))
    )
  )
  with check (
    (select public.current_user_can_review())
    and exists (
      select 1
      from public.field_lots lot
      where lot.lot_code = lot_visit_plans.lot_code
        and (select public.current_user_can_access_zone(lot.zone))
    )
  );

revoke all on table public.lot_visit_plans from public, anon, authenticated;
grant select, insert, update, delete on table public.lot_visit_plans to authenticated;

create or replace function public.get_lot_followup_visits()
returns table (record_id uuid, lot_code text, visit_date date)
language sql
stable
security definer
set search_path = ''
as $$
  with malezas_records as (
    select
      record.id as record_id,
      record.created_at,
      record.datos,
      case
        when jsonb_typeof(record.datos #> '{subregistros,malezas_detalle}') = 'array' then
          case
            when jsonb_array_length(record.datos #> '{subregistros,malezas_detalle}') > 0
              then record.datos #> '{subregistros,malezas_detalle}'
            when coalesce(
              nullif(btrim(record.datos ->> 'LOTE'), ''),
              nullif(btrim(record.datos ->> 'lote'), '')
            ) is not null
              then jsonb_build_array(jsonb_build_object(
                'LOTE', coalesce(nullif(btrim(record.datos ->> 'LOTE'), ''), nullif(btrim(record.datos ->> 'lote'), '')),
                'FECHA', coalesce(nullif(btrim(record.datos ->> 'FECHA'), ''), nullif(btrim(record.datos ->> 'fecha'), ''))
              ))
            else '[]'::jsonb
          end
        when coalesce(
          nullif(btrim(record.datos ->> 'LOTE'), ''),
          nullif(btrim(record.datos ->> 'lote'), '')
        ) is not null
          then jsonb_build_array(jsonb_build_object(
            'LOTE', coalesce(nullif(btrim(record.datos ->> 'LOTE'), ''), nullif(btrim(record.datos ->> 'lote'), '')),
            'FECHA', coalesce(nullif(btrim(record.datos ->> 'FECHA'), ''), nullif(btrim(record.datos ->> 'fecha'), ''))
          ))
        else '[]'::jsonb
      end as details
    from public.field_records as record
    where record.tipo = 'malezas'
      and (select public.current_user_can_review())
  ),
  raw_visits as (
    select
      record.record_id,
      record.created_at,
      nullif(btrim(coalesce(details.value ->> 'LOTE', details.value ->> 'lote')), '') as raw_lot,
      coalesce(
        nullif(btrim(details.value ->> 'FECHA'), ''),
        nullif(btrim(record.datos ->> 'FECHA'), ''),
        nullif(btrim(record.datos ->> 'fecha'), '')
      ) as raw_date
    from malezas_records as record
    cross join lateral jsonb_array_elements(record.details) as details(value)
  ),
  normalized_visits as (
    select
      record_id,
      case
        when raw_lot ~ '^[0-9]{1,7}$' then lpad(raw_lot, 7, '0')
        else raw_lot
      end as lot_code,
      case
        when raw_date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raw_date::date
        else created_at::date
      end as visit_date
    from raw_visits
    where raw_lot is not null
  ),
  scoped_visits as (
    select
      visits.record_id,
      visits.lot_code,
      visits.visit_date,
      row_number() over (
        partition by visits.record_id, visits.lot_code
        order by visits.visit_date
      ) as visit_row
    from normalized_visits as visits
    join public.lot_visit_plans plan
      on plan.lot_code = visits.lot_code
      and visits.visit_date >= plan.cycle_date
    where exists (
      select 1
      from public.field_lots lot
      where lot.lot_code = visits.lot_code
        and (select public.current_user_can_access_zone(lot.zone))
    )
  )
  select record_id, lot_code, visit_date
  from scoped_visits
  where visit_row = 1;
$$;

revoke all on function public.get_lot_followup_visits() from public, anon;
grant execute on function public.get_lot_followup_visits() to authenticated;
