-- Run against a migrated database; fixtures and changes are rolled back.
begin;

do $$
declare
  target_id uuid := gen_random_uuid();
  reviewer_id uuid := gen_random_uuid();
  incomplete_id uuid := gen_random_uuid();
  record_id uuid := gen_random_uuid();
  program_id uuid := gen_random_uuid();
  username text;
  zone_name text;
  rejected boolean := false;
begin
  select zone into zone_name from public.field_lots order by lot_code limit 1;
  if zone_name is null then raise exception 'User deletion test requires a configured lot'; end if;
  username := 'test_' || substr(replace(target_id::text, '-', ''), 1, 20);
  insert into auth.users(id, email, raw_user_meta_data, raw_app_meta_data)
  values (target_id, username || '@example.invalid', jsonb_build_object('username', username, 'display_name', 'Test owner'), '{}'::jsonb);
  username := 'test_' || substr(replace(reviewer_id::text, '-', ''), 1, 20);
  insert into auth.users(id, email, raw_user_meta_data, raw_app_meta_data)
  values (reviewer_id, username || '@example.invalid', jsonb_build_object('username', username, 'display_name', 'Test reviewer'), '{}'::jsonb);
  update public.profiles set role = 'supervisor', status = 'active', allowed_zones = array[zone_name] where id = target_id;
  insert into public.field_records(id, owner_id, tipo, schema_version, datos, review_status, reviewed_by, reviewed_at)
  values (record_id, target_id, 'malezas', 1, jsonb_build_object('ZONA', zone_name), 'approved', reviewer_id, now());
  insert into public.lot_weekly_visit_programs(id, farm, week_start, scheduled_date, created_by)
  values (program_id, 'Test ' || target_id::text, '2026-03-02', '2026-03-02', target_id);
  delete from auth.users where id = target_id;
  delete from auth.users where id = reviewer_id;
  if not exists (select 1 from public.profiles where id = target_id and auth_user_id is null
      and status = 'suspended' and cardinality(allowed_zones) = 0) then
    raise exception 'Deleted account did not retain a suspended historical profile';
  end if;
  if not exists (select 1 from public.field_records where id = record_id and owner_id = target_id
      and reviewed_by = reviewer_id and review_status = 'approved') then
    raise exception 'Deleting accounts changed historical captures or reviews';
  end if;
  if not exists (select 1 from public.lot_weekly_visit_programs where id = program_id and created_by = target_id) then
    raise exception 'Deleting an account changed the weekly program creator';
  end if;
  begin
    update public.profiles set status = 'active' where id = target_id;
  exception when check_violation then rejected := true;
  end;
  if not rejected then raise exception 'A deleted account could be reactivated'; end if;
  username := 'test_' || substr(replace(incomplete_id::text, '-', ''), 1, 20);
  insert into auth.users(id, email, raw_user_meta_data, raw_app_meta_data)
  values (incomplete_id, username || '@example.invalid', jsonb_build_object('username', username, 'display_name', 'Incomplete'), '{}'::jsonb);
  delete from auth.users where id = incomplete_id;
  delete from public.profiles where id = incomplete_id and auth_user_id is null;
  if not found then raise exception 'An unreferenced incomplete account could not be cleaned up'; end if;
end;
$$;
rollback;
