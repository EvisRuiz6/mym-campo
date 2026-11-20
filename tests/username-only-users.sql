-- Run against a migrated database; every test is rolled back.
begin;

do $$
declare
  user_id uuid := gen_random_uuid();
  test_username text := 'test_' || substr(replace(user_id::text, '-', ''), 1, 20);
begin
  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values (user_id, test_username || '@users.mym-campo.invalid',
          jsonb_build_object('username', test_username, 'display_name', 'Test'), '{}'::jsonb);
  update auth.users set raw_app_meta_data = jsonb_build_object('mym_no_email_account', true) where id = user_id;
  set constraints auth.validate_username_only_auth_user immediate;
  update public.profiles set role = 'terrestre', status = 'active', allowed_zones = array['1'] where id = user_id;
  if not exists (select 1 from public.profiles where id = user_id and email is null
                 and role = 'terrestre' and status = 'active' and allowed_zones = array['1']) then
    raise exception 'Username-only profile was not created correctly';
  end if;
end;
$$;

set constraints auth.validate_username_only_auth_user deferred;
do $$
declare
  user_id uuid := gen_random_uuid();
  test_username text := 'test_' || substr(replace(user_id::text, '-', ''), 1, 20);
  rejected boolean := false;
begin
  begin
    insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
    values (user_id, test_username || '@users.mym-campo.invalid',
            jsonb_build_object('username', test_username, 'display_name', 'Test', 'mym_no_email_account', true), '{}'::jsonb);
    set constraints auth.validate_username_only_auth_user immediate;
  exception when raise_exception then
    if sqlerrm <> 'Username-only accounts must be created by an administrator' then
      raise;
    end if;
    rejected := true;
  end;
  if not rejected then
    raise exception 'Untrusted username-only signup was accepted';
  end if;
end;
$$;

set constraints auth.validate_username_only_auth_user deferred;
do $$
declare
  user_id uuid := gen_random_uuid();
  test_username text := 'test_' || substr(replace(user_id::text, '-', ''), 1, 20);
  rejected boolean := false;
begin
  begin
    insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
    values (user_id, 'wrong_' || test_username || '@users.mym-campo.invalid',
            jsonb_build_object('username', test_username, 'display_name', 'Test'),
            jsonb_build_object('mym_no_email_account', true));
  exception when raise_exception then
    if sqlerrm <> 'Username-only accounts must match their username' then
      raise;
    end if;
    rejected := true;
  end;
  if not rejected then
    raise exception 'Mismatched username-only address was accepted';
  end if;
end;
$$;

set constraints auth.validate_username_only_auth_user deferred;
do $$
declare
  user_id uuid := gen_random_uuid();
  test_username text := 'test_' || substr(replace(user_id::text, '-', ''), 1, 20);
begin
  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values (user_id, test_username || '@example.invalid',
          jsonb_build_object('username', test_username, 'display_name', 'Test'), '{}'::jsonb);
  set constraints auth.validate_username_only_auth_user immediate;
  if not exists (select 1 from public.profiles where id = user_id and email = test_username || '@example.invalid') then
    raise exception 'Ordinary email profile was not created correctly';
  end if;
end;
$$;

rollback;
