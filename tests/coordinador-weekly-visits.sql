-- Run against an isolated migrated database; all fixtures are rolled back.
begin;
do $$
declare
  coord uuid := gen_random_uuid();
  supervisor uuid := gen_random_uuid();
  admin uuid := gen_random_uuid();
  other_user uuid := gen_random_uuid();
  historical uuid := gen_random_uuid();
  member uuid;
  username text;
  lot text;
  zone_name text;
  farm text;
begin
  select l.lot_code, l.zone, l.finca into lot, zone_name, farm
  from public.field_lots l
  where not exists (select 1 from public.lot_visit_plans p where p.lot_code = l.lot_code)
  order by l.lot_code limit 1;
  if lot is null then raise exception 'Test requires a lot without a plan'; end if;
  foreach member in array array[coord, supervisor, admin, other_user] loop
    username := 'test_' || substr(replace(member::text, '-', ''), 1, 20);
    insert into auth.users(id, email, raw_user_meta_data, raw_app_meta_data)
    values (member, username || '@example.invalid', jsonb_build_object('username', username, 'display_name', 'Test'), '{}'::jsonb);
  end loop;
  update public.profiles set role = 'coordinador', status = 'active' where id = coord;
  update public.profiles set role = 'supervisor', status = 'active', allowed_zones = array[zone_name] where id = supervisor;
  update public.profiles set role = 'admin', status = 'active' where id = admin;
  update public.profiles set role = 'aereo', status = 'active' where id = other_user;
  insert into public.lot_visit_plans(lot_code, cycle_date, visit_dates)
  values (lot, '2026-03-01', array['2026-03-02'::date, '2026-03-03'::date,
    '2026-03-04'::date, '2026-03-05'::date, '2026-03-06'::date]);
  insert into public.field_records(id, owner_id, tipo, schema_version, datos)
  values (historical, other_user, 'malezas', 1,
    jsonb_build_object('ZONA', zone_name, 'FINCA', farm, 'FECHA', '2026-03-02',
      'subregistros', jsonb_build_object('malezas_detalle', jsonb_build_array(
        jsonb_build_object('LOTE', lot, 'FECHA', '2026-03-02', 'LABOR', 'Soca')))));
  perform set_config('test.coord', coord::text, true);
  perform set_config('test.supervisor', supervisor::text, true);
  perform set_config('test.admin', admin::text, true);
  perform set_config('test.other', other_user::text, true);
  perform set_config('test.historical', historical::text, true);
  perform set_config('test.lot', lot, true);
  perform set_config('test.zone', zone_name, true);
  perform set_config('test.farm', farm, true);
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.coord'), true);
do $$
declare
  capture_id uuid := gen_random_uuid();
  payload jsonb;
  group_payload jsonb;
  denied boolean;
  changed integer;
  slot_number integer;
  visit_day text;
begin
  if not exists (select 1 from public.lot_visit_plans where lot_code = current_setting('test.lot')) then
    raise exception 'Coordinator cannot read plans';
  end if;
  if not exists (select 1 from public.get_export_lot_visits()
    where record_id = current_setting('test.historical')::uuid and visit_number is null) then
    raise exception 'Coordinator cannot read historical visits';
  end if;
  payload := jsonb_build_object('ID', capture_id::text, 'ZONA', current_setting('test.zone'),
    'FINCA', current_setting('test.farm'), 'FECHA', '2026-03-03',
    'subregistros', jsonb_build_object('malezas_detalle', jsonb_build_array(
      jsonb_build_object('LOTE', current_setting('test.lot'), 'ID_NEW', capture_id::text,
        'FECHA', '2026-03-03', 'LABOR', 'Soca'))));
  group_payload := jsonb_build_array(jsonb_build_object('record_id', capture_id,
    'lot_code', current_setting('test.lot'), 'cycle_date', '2026-03-01',
    'visit_number', 2, 'scheduled_date', '2026-03-03', 'datos', payload));
  if public.save_lot_visit_captures(group_payload) <> array[capture_id] then
    raise exception 'Coordinator batch capture failed';
  end if;
  if public.save_lot_visit_captures(group_payload) <> array[capture_id] then
    raise exception 'Coordinator batch retry is not idempotent';
  end if;
  if not exists (select 1 from public.field_records where id = capture_id and owner_id = auth.uid()) then
    raise exception 'Coordinator capture ownership incorrect';
  end if;
  capture_id := gen_random_uuid();
  payload := jsonb_set(jsonb_set(payload, '{ID}', to_jsonb(capture_id::text)),
    '{subregistros,malezas_detalle,0,ID_NEW}', to_jsonb(capture_id::text));
  denied := false;
  begin
    perform public.save_lot_visit_capture(capture_id, current_setting('test.lot'),
      '2026-03-01', 1, '2026-03-02', payload);
  exception when raise_exception then
    if sqlerrm not like '%visita ya fue realizada%' then raise; end if;
    denied := true;
  end;
  if not denied then raise exception 'Historical unlinked visit did not occupy first slot'; end if;
  denied := false;
  begin
    perform public.save_lot_visit_capture(capture_id, current_setting('test.lot'),
      '2026-03-01', 2, '2026-03-03', payload);
  exception when raise_exception then
    if sqlerrm not like '%visita ya fue realizada%' then raise; end if;
    denied := true;
  end;
  if not denied then raise exception 'Linked visit did not occupy second slot'; end if;
  group_payload := jsonb_build_array(
    jsonb_build_object('record_id', capture_id, 'lot_code', current_setting('test.lot'),
      'cycle_date', '2026-03-01', 'visit_number', 3, 'scheduled_date', '2026-03-04',
      'datos', jsonb_set(jsonb_set(payload, '{FECHA}', '"2026-03-04"'),
        '{subregistros,malezas_detalle,0,FECHA}', '"2026-03-04"')),
    jsonb_build_object('record_id', gen_random_uuid(), 'lot_code', current_setting('test.lot'),
      'cycle_date', '2026-03-01', 'visit_number', 4, 'scheduled_date', '2026-03-07', 'datos', payload));
  denied := false;
  begin
    perform public.save_lot_visit_captures(group_payload);
  exception when raise_exception then denied := true; end;
  if not denied or exists (select 1 from public.field_records where id = capture_id) then
    raise exception 'A failed batch did not roll back completely';
  end if;
  for slot_number in 3..5 loop
    capture_id := gen_random_uuid();
    visit_day := '2026-03-0' || (slot_number + 1)::text;
    payload := jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload, '{ID}', to_jsonb(capture_id::text)),
      '{subregistros,malezas_detalle,0,ID_NEW}', to_jsonb(capture_id::text)),
      '{FECHA}', to_jsonb(visit_day)), '{subregistros,malezas_detalle,0,FECHA}', to_jsonb(visit_day));
    perform public.save_lot_visit_capture(capture_id, current_setting('test.lot'),
      '2026-03-01', slot_number, visit_day::date, payload);
  end loop;
  capture_id := gen_random_uuid();
  payload := jsonb_set(jsonb_set(jsonb_set(jsonb_set(payload, '{ID}', to_jsonb(capture_id::text)),
    '{subregistros,malezas_detalle,0,ID_NEW}', to_jsonb(capture_id::text)),
    '{FECHA}', '"2026-03-07"'), '{subregistros,malezas_detalle,0,FECHA}', '"2026-03-07"');
  denied := false;
  begin
    insert into public.field_records(id, owner_id, tipo, schema_version, datos)
    values (capture_id, auth.uid(), 'malezas', 5, payload);
  exception when raise_exception then
    if sqlerrm not like '%cinco visitas%' then raise; end if;
    denied := true;
  end;
  if not denied then raise exception 'A sixth capture was allowed'; end if;
  update public.lot_visit_plans set responsible = 'unauthorized' where lot_code = current_setting('test.lot');
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Coordinator can modify plans'; end if;
  denied := false;
  begin
    perform public.save_lot_weekly_visit_program(current_setting('test.farm'),
      '2026-03-02', '2026-03-02', array[current_setting('test.lot')]);
  exception when raise_exception or insufficient_privilege then denied := true; end;
  if not denied then raise exception 'Coordinator can manage legacy weekly programs'; end if;
  denied := false;
  begin
    perform public.delete_field_record(current_setting('test.historical')::uuid);
  exception when raise_exception then denied := true; end;
  if not denied then raise exception 'Coordinator can delete another user capture'; end if;
end;
$$;
select set_config('request.jwt.claim.sub', current_setting('test.supervisor'), true);
do $$
begin
  if not exists (select 1 from public.get_weekly_capture_visits()
    where record_id = current_setting('test.historical')::uuid) then
    raise exception 'Supervisor lost weekly visit access';
  end if;
end;
$$;
select set_config('request.jwt.claim.sub', current_setting('test.admin'), true);
do $$
begin
  if not exists (select 1 from public.get_weekly_capture_visits()
    where record_id = current_setting('test.historical')::uuid) then
    raise exception 'Administrator lost weekly visit access';
  end if;
end;
$$;
reset role;
update public.profiles set status = 'suspended' where id = current_setting('test.coord')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.coord'), true);
do $$
declare denied boolean := false;
begin
  if exists (select 1 from public.lot_visit_plans where lot_code = current_setting('test.lot')) then
    raise exception 'Suspended coordinator can read plans';
  end if;
  begin
    perform * from public.get_weekly_capture_visits();
  exception when raise_exception then denied := true; end;
  if not denied then raise exception 'Suspended coordinator can read visits'; end if;
end;
$$;
rollback;
