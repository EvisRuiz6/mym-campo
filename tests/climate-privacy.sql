-- Run against a migrated database; fixtures and changes are rolled back.
begin;

do $$
declare
  admin_id uuid := gen_random_uuid();
  first_id uuid := gen_random_uuid();
  second_id uuid := gen_random_uuid();
  supervisor_id uuid := gen_random_uuid();
  first_climate uuid := gen_random_uuid();
  second_climate uuid := gen_random_uuid();
  supervisor_climate uuid := gen_random_uuid();
  first_flight uuid := gen_random_uuid();
  other_record uuid := gen_random_uuid();
  zone_name text;
  user_id uuid;
  username text;
begin
  select zone into zone_name from public.field_lots order by lot_code limit 1;
  if zone_name is null then raise exception 'Climate privacy test requires a configured lot'; end if;
  foreach user_id in array array[admin_id, first_id, second_id, supervisor_id] loop
    username := 'test_' || substr(replace(user_id::text, '-', ''), 1, 20);
    insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
    values (user_id, username || '@example.invalid',
      jsonb_build_object('username', username, 'display_name', 'Test'), '{}'::jsonb);
  end loop;
  update public.profiles set role = 'admin', status = 'active' where id = admin_id;
  update public.profiles set role = 'aereo', status = 'active' where id in (first_id, second_id);
  update public.profiles set role = 'supervisor', status = 'active', allowed_zones = array[zone_name] where id = supervisor_id;
  insert into public.field_records (id, owner_id, tipo, schema_version, datos)
  values
    (first_climate, first_id, 'clima', 1, jsonb_build_object('zona', zone_name, 'lecturas', '[]'::jsonb)),
    (second_climate, second_id, 'clima', 1, jsonb_build_object('zona', zone_name, 'lecturas', '[]'::jsonb)),
    (supervisor_climate, supervisor_id, 'clima', 1, jsonb_build_object('zona', zone_name, 'lecturas', '[]'::jsonb)),
    (first_flight, first_id, 'vuelos', 1, jsonb_build_object('zona', zone_name)),
    (other_record, first_id, 'malezas', 1, jsonb_build_object('zona', zone_name));
  perform set_config('test.admin_id', admin_id::text, true);
  perform set_config('test.first_id', first_id::text, true);
  perform set_config('test.supervisor_id', supervisor_id::text, true);
  perform set_config('test.first_climate', first_climate::text, true);
  perform set_config('test.second_climate', second_climate::text, true);
  perform set_config('test.supervisor_climate', supervisor_climate::text, true);
  perform set_config('test.first_flight', first_flight::text, true);
  perform set_config('test.other_record', other_record::text, true);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.first_id'), true);
do $$
begin
  if (select count(*) from public.field_records where id in
      (current_setting('test.first_climate')::uuid, current_setting('test.second_climate')::uuid)) <> 1 then
    raise exception 'Owner must see only their own climate record';
  end if;
  if exists (select 1 from public.field_records where id = current_setting('test.second_climate')::uuid) then
    raise exception 'Direct lookup exposed another user climate record';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.supervisor_id'), true);
do $$
declare
  rejected boolean := false;
begin
  if exists (select 1 from public.field_records where id in
      (current_setting('test.first_climate')::uuid, current_setting('test.second_climate')::uuid,
       current_setting('test.first_flight')::uuid)) then
    raise exception 'Supervisor can see another user climate or flight record';
  end if;
  if not exists (select 1 from public.field_records where id = current_setting('test.supervisor_climate')::uuid) then
    raise exception 'Supervisor cannot see their own climate record';
  end if;
  if exists (select 1 from public.field_records where id = current_setting('test.other_record')::uuid) then
    raise exception 'Supervisor can see another user non-climate record';
  end if;
  begin
    perform public.review_field_record(current_setting('test.first_climate')::uuid, 'approved');
  exception when raise_exception then
    rejected := true;
  end;
  if not rejected then raise exception 'Supervisor could review another user climate record'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.admin_id'), true);
do $$
begin
  if (select count(*) from public.field_records where id in
      (current_setting('test.first_climate')::uuid, current_setting('test.second_climate')::uuid)) <> 2 then
    raise exception 'Administrator cannot see all climate records';
  end if;
  perform public.review_field_record(current_setting('test.first_climate')::uuid, 'approved');
end;
$$;

reset role;
update public.profiles set status = 'suspended' where id = current_setting('test.admin_id')::uuid;
set local role authenticated;
do $$
begin
  if exists (select 1 from public.field_records where id = current_setting('test.first_climate')::uuid) then
    raise exception 'Suspended administrator can see climate records';
  end if;
end;
$$;

rollback;
