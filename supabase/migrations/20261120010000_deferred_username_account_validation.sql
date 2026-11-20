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
    if profile_email <> (requested_username || '@users.mym-campo.invalid') then
      raise exception 'Username-only accounts must match their username';
    end if;
    profile_email := null;
  end if;

  insert into public.profiles (id, email, username, display_name)
  values (new.id, profile_email, requested_username, requested_name);
  return new;
end;
$$;

-- Supabase Auth sets app metadata after inserting the user, in the same transaction.
create or replace function public.validate_username_only_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  app_metadata jsonb;
begin
  if lower(new.email) like '%@users.mym-campo.invalid' then
    select u.raw_app_meta_data into app_metadata from auth.users u where u.id = new.id;
    if found and app_metadata ->> 'mym_no_email_account' is distinct from 'true' then
      raise exception 'Username-only accounts must be created by an administrator';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists validate_username_only_auth_user on auth.users;
create constraint trigger validate_username_only_auth_user
after insert on auth.users
deferrable initially deferred
for each row execute function public.validate_username_only_auth_user();
