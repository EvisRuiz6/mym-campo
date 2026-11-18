create table if not exists public.lot_weekly_visit_programs (
  id uuid primary key default gen_random_uuid(),
  farm text not null,
  farm_key text generated always as (
    lower(regexp_replace(btrim(farm), '[[:space:]]+', ' ', 'g'))
  ) stored,
  week_start date not null,
  scheduled_date date not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lot_weekly_visit_programs_farm_length
    check (length(btrim(farm)) between 1 and 120),
  constraint lot_weekly_visit_programs_monday_start
    check (extract(isodow from week_start) = 1),
  constraint lot_weekly_visit_programs_date_in_week
    check (scheduled_date between week_start and week_start + 6),
  constraint lot_weekly_visit_programs_farm_week_unique
    unique (farm_key, week_start)
);

create table if not exists public.lot_weekly_visit_program_lots (
  program_id uuid not null references public.lot_weekly_visit_programs (id) on delete cascade,
  lot_code text not null references public.field_lots (lot_code) on update cascade on delete restrict,
  reference_date date not null,
  created_at timestamptz not null default now(),
  primary key (program_id, lot_code)
);

create index if not exists lot_weekly_visit_program_lots_lot_idx
  on public.lot_weekly_visit_program_lots (lot_code);

alter table public.lot_weekly_visit_programs enable row level security;
alter table public.lot_weekly_visit_program_lots enable row level security;

drop policy if exists "Reviewers read weekly visit programs in assigned zones"
  on public.lot_weekly_visit_programs;
create policy "Reviewers read weekly visit programs in assigned zones"
  on public.lot_weekly_visit_programs for select to authenticated
  using (
    (select public.current_user_can_review())
    and exists (
      select 1
      from public.lot_weekly_visit_program_lots member
      join public.field_lots lot on lot.lot_code = member.lot_code
      where member.program_id = lot_weekly_visit_programs.id
        and (select public.current_user_can_access_zone(lot.zone))
    )
  );

drop policy if exists "Reviewers read weekly visit program lots in assigned zones"
  on public.lot_weekly_visit_program_lots;
create policy "Reviewers read weekly visit program lots in assigned zones"
  on public.lot_weekly_visit_program_lots for select to authenticated
  using (
    (select public.current_user_can_review())
    and exists (
      select 1
      from public.field_lots lot
      where lot.lot_code = lot_weekly_visit_program_lots.lot_code
        and (select public.current_user_can_access_zone(lot.zone))
    )
  );

revoke all on table public.lot_weekly_visit_programs from public, anon, authenticated;
revoke all on table public.lot_weekly_visit_program_lots from public, anon, authenticated;
grant select on table public.lot_weekly_visit_programs to authenticated;
grant select on table public.lot_weekly_visit_program_lots to authenticated;

create or replace function public.get_lot_weekly_visit_programs()
returns table (
  id uuid,
  farm text,
  week_start date,
  scheduled_date date,
  members jsonb,
  protected_date_start date,
  protected_date_end date,
  can_update_date boolean,
  can_delete boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    program.id,
    program.farm,
    program.week_start,
    program.scheduled_date,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'lot_code', member.lot_code,
          'reference_date', member.reference_date
        )
        order by member.lot_code
      )
      from public.lot_weekly_visit_program_lots member
      join public.field_lots lot on lot.lot_code = member.lot_code
      where member.program_id = program.id
        and (select public.current_user_can_access_zone(lot.zone))
    ), '[]'::jsonb) as members,
    hidden.date_start as protected_date_start,
    hidden.date_end as protected_date_end,
    not exists (
      select 1
      from public.lot_weekly_visit_program_lots member
      join public.field_lots lot on lot.lot_code = member.lot_code
      where member.program_id = program.id
        and not (select public.current_user_can_access_zone(lot.zone))
    ) as can_update_date,
    not exists (
      select 1
      from public.lot_weekly_visit_program_lots member
      join public.field_lots lot on lot.lot_code = member.lot_code
      where member.program_id = program.id
        and not (select public.current_user_can_access_zone(lot.zone))
    ) as can_delete
  from public.lot_weekly_visit_programs program
  left join lateral (
    select
      case
        when count(*) = 0 then null::date
        else greatest(program.week_start, max(member.reference_date - 5))
      end as date_start,
      case
        when count(*) = 0 then null::date
        else least(program.week_start + 6, min(member.reference_date + 5))
      end as date_end
    from public.lot_weekly_visit_program_lots member
    join public.field_lots lot on lot.lot_code = member.lot_code
    where member.program_id = program.id
      and not (select public.current_user_can_access_zone(lot.zone))
  ) as hidden on true
  where (select public.current_user_can_review())
    and exists (
      select 1
      from public.lot_weekly_visit_program_lots member
      join public.field_lots lot on lot.lot_code = member.lot_code
      where member.program_id = program.id
        and (select public.current_user_can_access_zone(lot.zone))
    );
$$;

create or replace function public.save_lot_weekly_visit_program(
  p_farm text,
  p_week_start date,
  p_scheduled_date date,
  p_lot_codes text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_farm text := btrim(coalesce(p_farm, ''));
  v_farm_key text;
  v_program_id uuid;
  v_existing_date date;
  v_invalid_count integer;
begin
  if not (select public.current_user_can_review()) then
    raise exception using errcode = '42501', message = 'Solo una cuenta administradora o supervisora activa puede gestionar programas semanales.';
  end if;
  if v_farm = '' or length(v_farm) > 120 then
    raise exception using errcode = '22023', message = 'Selecciona una finca válida.';
  end if;
  v_farm_key := lower(regexp_replace(v_farm, '[[:space:]]+', ' ', 'g'));
  if p_week_start is null or extract(isodow from p_week_start) <> 1 then
    raise exception using errcode = '22023', message = 'La semana debe comenzar un lunes.';
  end if;
  if p_scheduled_date is null or p_scheduled_date < p_week_start or p_scheduled_date > p_week_start + 6 then
    raise exception using errcode = '22023', message = 'La fecha programada debe pertenecer a la semana seleccionada.';
  end if;
  if p_lot_codes is null or cardinality(p_lot_codes) = 0 or array_position(p_lot_codes, null) is not null then
    raise exception using errcode = '22023', message = 'Selecciona al menos un lote válido.';
  end if;
  if (
    select count(distinct requested.lot_code)
    from unnest(p_lot_codes) as requested(lot_code)
  ) <> cardinality(p_lot_codes) then
    raise exception using errcode = '22023', message = 'Un lote no se puede repetir en el mismo programa.';
  end if;
  select count(*)
  into v_invalid_count
  from unnest(p_lot_codes) as requested(lot_code)
  left join public.field_lots lot on lot.lot_code = requested.lot_code
  where lot.lot_code is null
    or lower(regexp_replace(btrim(lot.finca), '[[:space:]]+', ' ', 'g')) <> v_farm_key
    or not (select public.current_user_can_access_zone(lot.zone));
  if v_invalid_count > 0 then
    raise exception using errcode = '42501', message = 'Uno o más lotes no pertenecen a la finca o a las zonas autorizadas.';
  end if;

  insert into public.lot_weekly_visit_programs (farm, week_start, scheduled_date, created_by)
  values (v_farm, p_week_start, p_scheduled_date, (select auth.uid()))
  on conflict (farm_key, week_start) do nothing
  returning id into v_program_id;

  if v_program_id is null then
    select program.id, program.scheduled_date
    into v_program_id, v_existing_date
    from public.lot_weekly_visit_programs program
    where program.farm_key = v_farm_key
      and program.week_start = p_week_start
    for update;
    if not found then
      raise exception using errcode = '40001', message = 'El programa cambió mientras se guardaba. Actualiza la lista e inténtalo de nuevo.';
    end if;
    if v_existing_date <> p_scheduled_date and exists (
      select 1
      from public.lot_weekly_visit_program_lots member
      join public.field_lots lot on lot.lot_code = member.lot_code
      where member.program_id = v_program_id
        and not (select public.current_user_can_access_zone(lot.zone))
    ) then
      raise exception using errcode = '42501', message = 'No puedes cambiar la fecha de un programa que incluye lotes de zonas no asignadas.';
    end if;
    update public.lot_weekly_visit_programs
    set farm = v_farm,
        scheduled_date = p_scheduled_date,
        updated_at = now()
    where id = v_program_id;
  end if;

  select count(*)
  into v_invalid_count
  from unnest(p_lot_codes) as requested(lot_code)
  join public.field_lots lot on lot.lot_code = requested.lot_code
  left join public.lot_weekly_visit_program_lots existing
    on existing.program_id = v_program_id
    and existing.lot_code = requested.lot_code
  left join public.lot_visit_plans plan on plan.lot_code = requested.lot_code
  where coalesce(existing.reference_date, plan.cycle_date) is null
    or p_scheduled_date < coalesce(existing.reference_date, plan.cycle_date) - 5
    or p_scheduled_date > coalesce(existing.reference_date, plan.cycle_date) + 5;
  if v_invalid_count > 0 then
    raise exception using errcode = '22023', message = 'La fecha común debe quedar dentro de ±5 días de la referencia de cada lote.';
  end if;

  delete from public.lot_weekly_visit_program_lots member
  using public.field_lots lot
  where member.program_id = v_program_id
    and lot.lot_code = member.lot_code
    and (select public.current_user_can_access_zone(lot.zone))
    and not (member.lot_code = any(p_lot_codes));

  insert into public.lot_weekly_visit_program_lots (program_id, lot_code, reference_date)
  select v_program_id, lot.lot_code, plan.cycle_date
  from unnest(p_lot_codes) as requested(lot_code)
  join public.field_lots lot on lot.lot_code = requested.lot_code
  join public.lot_visit_plans plan on plan.lot_code = requested.lot_code
  where not exists (
    select 1
    from public.lot_weekly_visit_program_lots existing
    where existing.program_id = v_program_id
      and existing.lot_code = requested.lot_code
  )
  on conflict (program_id, lot_code) do nothing;

  if exists (
    select 1
    from public.lot_weekly_visit_program_lots member
    join public.field_lots lot on lot.lot_code = member.lot_code
    where member.program_id = v_program_id
      and (
        lower(regexp_replace(btrim(lot.finca), '[[:space:]]+', ' ', 'g')) <> v_farm_key
        or p_scheduled_date < member.reference_date - 5
        or p_scheduled_date > member.reference_date + 5
      )
  ) then
    raise exception using errcode = '22023', message = 'La fecha común debe ser válida para todos los lotes del programa.';
  end if;

  return v_program_id;
end;
$$;

create or replace function public.update_lot_weekly_visit_program_date(
  p_program_id uuid,
  p_scheduled_date date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program public.lot_weekly_visit_programs%rowtype;
  v_member_count integer;
  v_allowed_start date;
  v_allowed_end date;
begin
  if not (select public.current_user_can_review()) then
    raise exception using errcode = '42501', message = 'Solo una cuenta administradora o supervisora activa puede gestionar programas semanales.';
  end if;
  select *
  into v_program
  from public.lot_weekly_visit_programs program
  where program.id = p_program_id
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'No se encontró el programa o no tienes acceso a sus lotes.';
  end if;
  if not exists (
    select 1
    from public.lot_weekly_visit_program_lots member
    join public.field_lots lot on lot.lot_code = member.lot_code
    where member.program_id = p_program_id
      and (select public.current_user_can_access_zone(lot.zone))
  ) then
    raise exception using errcode = '42501', message = 'No se encontró el programa o no tienes acceso a sus lotes.';
  end if;
  if exists (
    select 1
    from public.lot_weekly_visit_program_lots member
    join public.field_lots lot on lot.lot_code = member.lot_code
    where member.program_id = p_program_id
      and not (select public.current_user_can_access_zone(lot.zone))
  ) then
    raise exception using errcode = '42501', message = 'No puedes cambiar la fecha de un programa que incluye lotes de zonas no asignadas.';
  end if;
  if p_scheduled_date is null or p_scheduled_date < v_program.week_start or p_scheduled_date > v_program.week_start + 6 then
    raise exception using errcode = '22023', message = 'La fecha programada debe permanecer dentro de la misma semana.';
  end if;

  select count(*), max(member.reference_date - 5), min(member.reference_date + 5)
  into v_member_count, v_allowed_start, v_allowed_end
  from public.lot_weekly_visit_program_lots member
  where member.program_id = p_program_id;
  if v_member_count = 0 then
    raise exception using errcode = '22023', message = 'El programa no contiene lotes para validar.';
  end if;
  v_allowed_start := greatest(v_program.week_start, v_allowed_start);
  v_allowed_end := least(v_program.week_start + 6, v_allowed_end);
  if p_scheduled_date < v_allowed_start or p_scheduled_date > v_allowed_end then
    raise exception using errcode = '22023', message = 'La fecha debe estar dentro de ±5 días para todos los lotes del programa.';
  end if;

  update public.lot_weekly_visit_programs
  set scheduled_date = p_scheduled_date,
      updated_at = now()
  where id = p_program_id;
  return p_program_id;
end;
$$;

create or replace function public.delete_lot_weekly_visit_program(p_program_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_program_id uuid;
begin
  if not (select public.current_user_can_review()) then
    raise exception using errcode = '42501', message = 'Solo una cuenta administradora o supervisora activa puede gestionar programas semanales.';
  end if;
  select program.id
  into v_program_id
  from public.lot_weekly_visit_programs program
  where program.id = p_program_id
  for update;
  if not found then
    raise exception using errcode = '42501', message = 'No se encontró el programa o no tienes acceso a sus lotes.';
  end if;
  if not exists (
    select 1
    from public.lot_weekly_visit_programs program
    join public.lot_weekly_visit_program_lots member on member.program_id = program.id
    join public.field_lots lot on lot.lot_code = member.lot_code
    where program.id = p_program_id
      and (select public.current_user_can_access_zone(lot.zone))
  ) then
    raise exception using errcode = '42501', message = 'No se encontró el programa o no tienes acceso a sus lotes.';
  end if;
  if exists (
    select 1
    from public.lot_weekly_visit_program_lots member
    join public.field_lots lot on lot.lot_code = member.lot_code
    where member.program_id = p_program_id
      and not (select public.current_user_can_access_zone(lot.zone))
  ) then
    raise exception using errcode = '42501', message = 'No puedes eliminar un programa que incluye lotes de zonas no asignadas.';
  end if;
  delete from public.lot_weekly_visit_programs
  where id = v_program_id;
  return v_program_id;
end;
$$;

revoke all on function public.get_lot_weekly_visit_programs() from public, anon;
revoke all on function public.save_lot_weekly_visit_program(text, date, date, text[]) from public, anon;
revoke all on function public.update_lot_weekly_visit_program_date(uuid, date) from public, anon;
revoke all on function public.delete_lot_weekly_visit_program(uuid) from public, anon;
grant execute on function public.get_lot_weekly_visit_programs() to authenticated;
grant execute on function public.save_lot_weekly_visit_program(text, date, date, text[]) to authenticated;
grant execute on function public.update_lot_weekly_visit_program_date(uuid, date) to authenticated;
grant execute on function public.delete_lot_weekly_visit_program(uuid) to authenticated;
