alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('pending', 'aereo', 'terrestre', 'supervisor', 'coordinador', 'admin'));

create or replace function public.current_user_can_view_all_records()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active' and role in ('admin', 'coordinador')
  );
$$;
revoke all on function public.current_user_can_view_all_records() from public, anon;
grant execute on function public.current_user_can_view_all_records() to authenticated;

create or replace function public.current_user_can_capture_type(p_tipo text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active'
      and (
        role = 'admin'
        or (role = 'aereo' and p_tipo in ('clima', 'epp', 'vuelos'))
        or (role = 'terrestre' and p_tipo in ('variacion_aguilon', 'calibracion_aguilon', 'calibraciones_pcpm'))
        or (role = 'supervisor' and p_tipo in ('malezas', 'calidad'))
        or (role = 'coordinador' and p_tipo in ('clima', 'epp', 'vuelos', 'malezas', 'calidad'))
      )
  );
$$;

create or replace function public.current_user_can_access_zone(p_zone text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
      and (p.role in ('admin', 'aereo', 'coordinador') or p_zone = any(p.allowed_zones))
  );
$$;

create or replace function public.current_user_can_access_record_scope(p_payload jsonb)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.status = 'active'
      and p.role in ('admin', 'aereo', 'coordinador')
  ) or (
    (exists (select 1 from public.record_lot_codes(p_payload))
      or exists (select 1 from public.record_zone_codes(p_payload)))
    and not exists (
      select 1 from public.record_lot_codes(p_payload) submitted_lot
      where not exists (
        select 1 from public.field_lots lot
        where lot.lot_code = submitted_lot.lot_code
          and public.current_user_can_access_zone(lot.zone)
      )
    )
    and not exists (
      select 1 from public.record_zone_codes(p_payload) submitted_zone
      where not public.current_user_can_access_zone(submitted_zone.zone)
    )
  );
$$;

drop policy if exists "Coordinators read profiles for capture attribution" on public.profiles;
create policy "Coordinators read profiles for capture attribution"
  on public.profiles for select to authenticated
  using ((select public.current_user_can_view_all_records()));

drop policy if exists "Users read own records and reviewers read all records" on public.field_records;
create policy "Users read own records and reviewers read all records"
  on public.field_records for select to authenticated
  using (
    ((owner_id = (select auth.uid()) and (select public.current_profile_is_active()))
      or (select public.current_user_can_review())
      or (select public.current_user_can_view_all_records()))
    and (select public.current_user_can_access_record_scope(datos))
  );

drop policy if exists "Climate and flight records are private to owner and admins" on public.field_records;
drop policy if exists "Climate and flight records are private to owner and privileged readers" on public.field_records;
create policy "Climate and flight records are private to owner and privileged readers"
  on public.field_records as restrictive for select to authenticated
  using (tipo not in ('vuelos', 'clima') or owner_id = (select auth.uid())
    or (select public.current_user_can_view_all_records()));

drop policy if exists "Captures are private to owner and admins" on public.field_records;
drop policy if exists "Captures are private to owner and privileged readers" on public.field_records;
create policy "Captures are private to owner and privileged readers"
  on public.field_records as restrictive for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.current_user_can_view_all_records()));

create or replace function public.set_member_access(
  p_user_id uuid, p_role text, p_allowed_zones text[] default '{}'
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  caller_role text;
  caller_status text;
  active_admin_count integer;
  requested_zones text[] := coalesce(p_allowed_zones, '{}');
begin
  select role, status into caller_role, caller_status from public.profiles where id = (select auth.uid());
  if caller_role is distinct from 'admin' or caller_status is distinct from 'active' then
    raise exception 'Only an active administrator can change member access';
  end if;
  if p_role not in ('pending', 'aereo', 'terrestre', 'supervisor', 'coordinador', 'admin') then
    raise exception 'Invalid member role';
  end if;
  if exists (
    select 1 from unnest(requested_zones) as requested_zone(zone_name)
    where not exists (select 1 from public.field_lots lot where lot.zone = requested_zone.zone_name)
  ) then raise exception 'One or more zones are invalid'; end if;
  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'An administrator cannot remove their own administrator role';
  end if;
  if p_role <> 'admin' then
    select count(*) into active_admin_count from public.profiles where role = 'admin' and status = 'active';
    if active_admin_count <= 1 and exists (
      select 1 from public.profiles where id = p_user_id and role = 'admin' and status = 'active'
    ) then raise exception 'At least one active administrator must remain'; end if;
  end if;
  update public.profiles
  set role = p_role, status = case when p_role = 'pending' then 'pending' else 'active' end,
      allowed_zones = case when p_role in ('admin', 'aereo', 'coordinador') then
        array(select distinct lot.zone from public.field_lots lot order by lot.zone)
        else array(select distinct unnest(requested_zones) order by 1) end
  where id = p_user_id;
  if not found then raise exception 'Member not found'; end if;
end;
$$;

create or replace function public.admin_export_field_records(
  p_modules text[], p_after_created timestamptz default null, p_after_id uuid default null,
  p_limit integer default 250
)
returns table (
  id uuid, owner_id uuid, tipo text, created_at timestamptz, schema_version integer,
  datos jsonb, review_status text, reviewed_by uuid, reviewed_at timestamptz,
  review_note text, owner_username text, owner_name text
)
language plpgsql security invoker set search_path = ''
as $$
begin
  if not (select public.current_user_can_view_all_records()) then
    raise exception 'Solo una cuenta autorizada activa puede exportar las capturas';
  end if;
  if p_modules is null or cardinality(p_modules) = 0 or array_position(p_modules, null) is not null
    or not (p_modules <@ array['clima', 'malezas', 'epp', 'vuelos', 'calidad',
      'variacion_aguilon', 'calibracion_aguilon', 'calibraciones_pcpm']::text[]) then
    raise exception 'Selecciona módulos válidos para exportar';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 250 or
    ((p_after_created is null) <> (p_after_id is null)) then
    raise exception 'Paginación de exportación no válida';
  end if;
  return query
  select record.id, record.owner_id, record.tipo, record.created_at, record.schema_version,
    public.export_without_attachment_data(record.datos), record.review_status, record.reviewed_by,
    record.reviewed_at, record.review_note, profile.username, profile.display_name
  from public.field_records as record
  left join public.profiles as profile on profile.id = record.owner_id
  where record.tipo = any(p_modules)
    and (p_after_created is null or (record.created_at, record.id) > (p_after_created, p_after_id))
  order by record.created_at, record.id
  limit p_limit;
end;
$$;

create or replace function public.get_export_lot_visits()
returns table (record_id uuid, lot_code text, visit_date date, cycle_date date, visit_number integer)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not (select public.current_user_can_view_all_records()) then
    raise exception 'Solo una cuenta autorizada activa puede exportar las visitas';
  end if;
  return query
  select record.id, visit.lot_code, min(visit.visit_date), link.cycle_date, link.visit_number
  from public.field_records record
  cross join lateral public.lot_visit_details(record.datos, record.created_at::date) visit
  join public.lot_visit_plans plan on plan.lot_code = visit.lot_code and visit.visit_date >= plan.cycle_date
  left join public.lot_visit_capture_links link on link.record_id = record.id and link.lot_code = visit.lot_code
  where record.tipo = 'malezas'
  group by record.id, visit.lot_code, link.cycle_date, link.visit_number;
end;
$$;
revoke all on function public.get_export_lot_visits() from public, anon;
grant execute on function public.get_export_lot_visits() to authenticated;
