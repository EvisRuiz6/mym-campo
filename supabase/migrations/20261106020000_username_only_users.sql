alter table public.profiles
  alter column email drop not null;

create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_name text := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  profile_email text := lower(new.email);
begin
  if requested_username !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'A valid username is required';
  end if;
  if length(requested_name) not between 1 and 120 then
    raise exception 'A valid display name is required';
  end if;
  if profile_email is null then
    raise exception 'A valid email is required';
  end if;
  if profile_email like '%@users.mym-campo.invalid' then
    if new.raw_app_meta_data ->> 'mym_no_email_account' is distinct from 'true'
      or profile_email <> (requested_username || '@users.mym-campo.invalid') then
      raise exception 'Username-only accounts must be created by an administrator';
    end if;
    profile_email := null;
  end if;

  insert into public.profiles (id, email, username, display_name)
  values (new.id, profile_email, requested_username, requested_name);
  return new;
end;
$$;

create or replace function public.current_user_can_access_record_scope(p_payload jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'
      and p.role in ('admin', 'aereo')
  ) or (
    (
      exists (select 1 from public.record_lot_codes(p_payload))
      or exists (select 1 from public.record_zone_codes(p_payload))
    )
    and not exists (
      select 1
      from public.record_lot_codes(p_payload) submitted_lot
      where not exists (
        select 1
        from public.field_lots lot
        where lot.lot_code = submitted_lot.lot_code
          and public.current_user_can_access_zone(lot.zone)
      )
    )
    and not exists (
      select 1
      from public.record_zone_codes(p_payload) submitted_zone
      where not public.current_user_can_access_zone(submitted_zone.zone)
    )
  );
$$;
