-- Run against a migrated database; fixtures and changes are rolled back.
begin;

do $$
declare
  admin_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  supervisor_id uuid := gen_random_uuid();
  fixture_id uuid := gen_random_uuid();
  user_id uuid;
  username text;
  zone_name text;
begin
  select zone into zone_name from public.field_lots order by lot_code limit 1;
  if zone_name is null then raise exception 'Export test requires a configured lot'; end if;
  foreach user_id in array array[admin_id, other_id, supervisor_id] loop
    username := 'test_' || substr(replace(user_id::text, '-', ''), 1, 20);
    insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
    values (user_id, username || '@example.invalid', jsonb_build_object('username', username, 'display_name', 'Test'), '{}'::jsonb);
  end loop;
  update public.profiles set role = 'admin', status = 'active' where id = admin_id;
  update public.profiles set role = 'aereo', status = 'active' where id = other_id;
  update public.profiles set role = 'supervisor', status = 'active', allowed_zones = array[zone_name] where id = supervisor_id;
  insert into public.field_records (id, owner_id, tipo, schema_version, datos)
  values (fixture_id, other_id, 'clima', 1, jsonb_build_object('zona', zone_name,
    'lecturas', jsonb_build_array(jsonb_build_object('hora', '09:00')),
    'imagen', jsonb_build_object('name', 'foto.jpg', 'mimeType', 'image/jpeg', 'size', 3, 'dataUrl', 'secret')));
  perform set_config('test.export_admin', admin_id::text, true);
  perform set_config('test.export_other', other_id::text, true);
  perform set_config('test.export_supervisor', supervisor_id::text, true);
  perform set_config('test.export_fixture', fixture_id::text, true);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.export_other'), true);
do $$
declare denied boolean := false;
begin
  begin
    perform * from public.admin_export_field_records(array['clima']);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'Non-admin can invoke the export'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.export_supervisor'), true);
do $$
declare denied boolean := false;
begin
  begin
    perform * from public.admin_export_field_records(array['clima']);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'Supervisor can invoke the export'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.export_admin'), true);
do $$
declare result record;
begin
  select * into result from public.admin_export_field_records(array['clima'], null, null, 250)
  where id = current_setting('test.export_fixture')::uuid;
  if not found then raise exception 'Administrator cannot export another user record'; end if;
  if result.datos #>> '{imagen,name}' <> 'foto.jpg' or result.datos #> '{imagen,dataUrl}' is not null then
    raise exception 'Attachment metadata was lost or image data was exposed';
  end if;
  if exists (select 1 from public.admin_export_field_records(array['vuelos']) where id = current_setting('test.export_fixture')::uuid) then
    raise exception 'Module filtering failed';
  end if;
end;
$$;

reset role;
update public.profiles set status = 'suspended' where id = current_setting('test.export_admin')::uuid;
set local role authenticated;
do $$
declare denied boolean := false;
begin
  begin
    perform * from public.admin_export_field_records(array['clima']);
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'Suspended administrator can invoke the export'; end if;
end;
$$;

rollback;
