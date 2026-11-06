alter table public.field_lots
  drop constraint if exists field_lots_zone_fkey;

alter table public.field_lots
  drop constraint if exists field_lots_zone_check;

alter table public.field_lots
  add constraint field_lots_zone_check
  check (length(trim(zone)) between 1 and 32);

create or replace function public.set_member_access(
  p_user_id uuid,
  p_role text,
  p_allowed_zones text[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  caller_status text;
  active_admin_count integer;
  requested_zones text[] := coalesce(p_allowed_zones, '{}');
begin
  select role, status into caller_role, caller_status
  from public.profiles where id = (select auth.uid());
  if caller_role is distinct from 'admin' or caller_status is distinct from 'active' then
    raise exception 'Only an active administrator can change member access';
  end if;
  if p_role not in ('pending', 'aereo', 'terrestre', 'supervisor', 'admin') then
    raise exception 'Invalid member role';
  end if;
  if exists (
    select 1
    from unnest(requested_zones) as requested_zone(zone_name)
    where not exists (
      select 1 from public.field_lots lot where lot.zone = requested_zone.zone_name
    )
  ) then
    raise exception 'One or more zones are invalid';
  end if;

  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'An administrator cannot remove their own administrator role';
  end if;
  if p_role <> 'admin' then
    select count(*) into active_admin_count
    from public.profiles where role = 'admin' and status = 'active';
    if active_admin_count <= 1 and exists (
      select 1 from public.profiles where id = p_user_id and role = 'admin' and status = 'active'
    ) then
      raise exception 'At least one active administrator must remain';
    end if;
  end if;

  update public.profiles
  set role = p_role,
      status = case when p_role = 'pending' then 'pending' else 'active' end,
      allowed_zones = case
        when p_role in ('admin', 'aereo') then array(
          select distinct lot.zone from public.field_lots lot order by lot.zone
        )
        else array(select distinct unnest(requested_zones) order by 1)
      end
  where id = p_user_id;
  if not found then
    raise exception 'Member not found';
  end if;
end;
$$;

update public.profiles profile
set allowed_zones = case
  when profile.role in ('admin', 'aereo') then array(
    select distinct lot.zone from public.field_lots lot order by lot.zone
  )
  else array(
    select distinct assigned.zone
    from unnest(profile.allowed_zones) assigned(zone)
    where exists (
      select 1 from public.field_lots lot where lot.zone = assigned.zone
    )
    order by assigned.zone
  )
end;

drop table if exists public.field_zones;
