-- Run against a migrated database; fixtures and changes are rolled back.
begin;

do $$
declare
  admin_id uuid := gen_random_uuid();
  owner_id uuid := gen_random_uuid();
  supervisor_id uuid := gen_random_uuid();
  private_id uuid := gen_random_uuid();
  own_id uuid := gen_random_uuid();
  user_id uuid;
  username text;
  zone_name text;
  test_lot text := 'test_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 18);
begin
  select zone into zone_name from public.field_lots order by lot_code limit 1;
  if zone_name is null then raise exception 'Supervisor privacy test requires a configured lot'; end if;
  foreach user_id in array array[admin_id, owner_id, supervisor_id] loop
    username := 'test_' || substr(replace(user_id::text, '-', ''), 1, 20);
    insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
    values (user_id, username || '@example.invalid', jsonb_build_object('username', username, 'display_name', 'Test'), '{}'::jsonb);
  end loop;
  update public.profiles set role = 'admin', status = 'active' where id = admin_id;
  update public.profiles set role = 'supervisor', status = 'active', allowed_zones = array[zone_name] where id in (owner_id, supervisor_id);
  insert into public.field_lots(lot_code, zone, finca) values (test_lot, zone_name, 'Finca de prueba');
  insert into public.lot_visit_plans(lot_code, cycle_date, visit_dates) values (test_lot, '2026-03-01', array['2026-03-02'::date]);
  insert into public.field_records(id, owner_id, tipo, schema_version, datos)
  values
    (private_id, owner_id, 'malezas', 1, jsonb_build_object('ZONA', zone_name, 'FINCA', 'Finca de prueba', 'FECHA', '2026-03-02',
      'subregistros', jsonb_build_object('malezas_detalle', jsonb_build_array(jsonb_build_object('LOTE', test_lot, 'FECHA', '2026-03-02', 'LABOR', 'Soca'))))),
    (own_id, supervisor_id, 'calidad', 1, jsonb_build_object('ZONA', zone_name));
  perform set_config('test.privacy_admin', admin_id::text, true);
  perform set_config('test.privacy_supervisor', supervisor_id::text, true);
  perform set_config('test.privacy_private', private_id::text, true);
  perform set_config('test.privacy_own', own_id::text, true);
  perform set_config('test.privacy_lot', test_lot, true);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.privacy_supervisor'), true);
do $$
declare denied boolean := false;
begin
  if exists (select 1 from public.field_records where id = current_setting('test.privacy_private')::uuid) then
    raise exception 'Supervisor can read another user capture';
  end if;
  if not exists (select 1 from public.field_records where id = current_setting('test.privacy_own')::uuid) then
    raise exception 'Supervisor cannot read their own capture';
  end if;
  if not exists (select 1 from public.get_lot_followup_visits_with_links()
      where record_id = current_setting('test.privacy_private')::uuid and lot_code = current_setting('test.privacy_lot')) then
    raise exception 'Shared weekly visit metadata is unavailable';
  end if;
  begin
    perform public.review_field_record(current_setting('test.privacy_private')::uuid, 'approved');
  exception when raise_exception then denied := true;
  end;
  if not denied then raise exception 'Supervisor can review another user capture'; end if;
  denied := false;
  begin
    insert into public.lot_visit_plans(lot_code, cycle_date, visit_dates)
    values (current_setting('test.privacy_lot'), '2026-03-01', array['2026-03-02'::date]);
  exception when insufficient_privilege then denied := true;
  end;
  if not denied then raise exception 'Supervisor can insert a visit plan'; end if;
  update public.lot_visit_plans set crop_state = 'unauthorized' where lot_code = current_setting('test.privacy_lot');
  if found then raise exception 'Supervisor can change a visit plan'; end if;
  delete from public.lot_visit_plans where lot_code = current_setting('test.privacy_lot');
  if found then raise exception 'Supervisor can delete a visit plan'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('test.privacy_admin'), true);
do $$
begin
  if not exists (select 1 from public.field_records where id = current_setting('test.privacy_private')::uuid) then
    raise exception 'Administrator cannot read another user capture';
  end if;
  update public.lot_visit_plans set crop_state = 'authorized' where lot_code = current_setting('test.privacy_lot');
  if not found then raise exception 'Administrator cannot change a visit plan'; end if;
  perform public.review_field_record(current_setting('test.privacy_private')::uuid, 'approved');
end;
$$;
rollback;
