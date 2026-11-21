-- Run against a migrated database; all fixtures are rolled back.
begin;

do $$
declare
  admin_id uuid := gen_random_uuid();
  lot_a text := 'test_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 18);
  lot_b text := 'test_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 18);
  no_plan text := 'test_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 18);
  lot_c text := 'test_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 18);
  lot_d text := 'test_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 18);
  record_ids uuid[] := array[]::uuid[];
  capture_id uuid;
  zone_name text;
  username text := 'test_' || substr(replace(admin_id::text, '-', ''), 1, 20);
  payload jsonb;
  batch jsonb;
  first_id uuid := gen_random_uuid();
  second_id uuid := gen_random_uuid();
  blocked boolean;
  n integer;
begin
  select zone into zone_name from public.field_lots order by lot_code limit 1;
  if zone_name is null then raise exception 'A configured zone is required'; end if;
  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values (admin_id, username || '@example.invalid',
    jsonb_build_object('username', username, 'display_name', 'Test'), '{}'::jsonb);
  update public.profiles set role = 'admin', status = 'active' where id = admin_id;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  insert into public.field_lots(lot_code, zone, finca)
  values (lot_a, zone_name, 'Finca de prueba'), (lot_b, zone_name, 'Finca de prueba'),
    (no_plan, zone_name, 'Finca de prueba'), (lot_c, zone_name, 'Finca de prueba'),
    (lot_d, zone_name, 'Finca de prueba');
  insert into public.lot_visit_plans(lot_code, cycle_date, visit_dates)
  values
    (lot_a, '2026-01-01', array[]::date[]),
    (lot_b, '2026-01-01', array['2026-01-02'::date, '2026-01-03'::date,
      '2026-01-04'::date, '2026-01-05'::date, '2026-01-06'::date]),
    (lot_c, '2026-01-01', array['2026-01-02'::date]),
    (lot_d, '2026-01-01', array['2026-01-03'::date]);

  blocked := false;
  begin
    insert into public.field_records(id, owner_id, tipo, schema_version, datos)
    values (gen_random_uuid(), admin_id, 'malezas', 5,
      jsonb_build_object('LOTE', no_plan, 'FECHA', '2026-01-02'));
  exception when raise_exception then
    if sqlerrm not like '%necesita un plan%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'A visit without a cycle was accepted'; end if;

  for n in 1..5 loop
    capture_id := gen_random_uuid();
    record_ids := array_append(record_ids, capture_id);
    insert into public.field_records(id, owner_id, tipo, schema_version, datos)
    values (capture_id, admin_id, 'malezas', 5,
      jsonb_build_object('LOTE', lot_a, 'FECHA', ('2026-01-01'::date + n)::text));
  end loop;
  blocked := false;
  begin
    insert into public.field_records(id, owner_id, tipo, schema_version, datos)
    values (gen_random_uuid(), admin_id, 'malezas', 5,
      jsonb_build_object('LOTE', lot_a, 'FECHA', '2026-01-10'));
  exception when raise_exception then
    if sqlerrm not like '%cinco visitas%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'A sixth visit was accepted'; end if;

  blocked := false;
  begin
    update public.field_records set datos = jsonb_build_object('LOTE', lot_a, 'FECHA', '2026-01-03')
    where id = record_ids[1];
  exception when raise_exception then
    if sqlerrm not like '%Ya existe una visita%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'A duplicate visit date was accepted'; end if;

  for n in 4..5 loop
    capture_id := gen_random_uuid();
    payload := jsonb_build_object(
      'ID', capture_id::text, 'FINCA', 'Finca de prueba', 'ZONA', zone_name, 'FECHA', '2026-01-0' || (n + 1),
      'subregistros', jsonb_build_object('malezas_detalle', jsonb_build_array(
        jsonb_build_object('ID_NEW', capture_id::text, 'LOTE', lot_b, 'LABOR', 'Soca', 'FECHA', '2026-01-0' || (n + 1))
      ))
    );
    if public.save_lot_visit_capture(capture_id, lot_b, '2026-01-01', n, '2026-01-01'::date + n, payload) <> capture_id then
      raise exception 'Could not save scheduled visit %', n;
    end if;
    if public.save_lot_visit_capture(capture_id, lot_b, '2026-01-01', n, '2026-01-01'::date + n, payload) <> capture_id then
      raise exception 'Retry was not idempotent';
    end if;
  end loop;
  update public.lot_visit_plans
  set cycle_date = '2026-01-05', visit_dates = array['2026-01-05'::date]
  where lot_code = lot_b;
  blocked := false;
  begin
    insert into public.field_records(id, owner_id, tipo, schema_version, datos)
    values (gen_random_uuid(), admin_id, 'malezas', 5,
      jsonb_build_object('LOTE', lot_b, 'FECHA', '2026-01-05'));
  exception when raise_exception then
    if sqlerrm not like '%Ya existe una visita%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'A visit duplicated a date from a previous cycle'; end if;

  insert into public.field_records(id, owner_id, tipo, schema_version, datos)
  values (gen_random_uuid(), admin_id, 'malezas', 5,
    jsonb_build_object('LOTE', lot_d, 'FECHA', '2026-01-03'));
  batch := jsonb_build_array(
    jsonb_build_object('record_id', first_id, 'lot_code', lot_c, 'cycle_date', '2026-01-01',
      'visit_number', 1, 'scheduled_date', '2026-01-02',
      'datos', jsonb_build_object('ID', first_id, 'FINCA', 'Finca de prueba', 'ZONA', zone_name,
        'FECHA', '2026-01-02', 'subregistros', jsonb_build_object('malezas_detalle', jsonb_build_array(
          jsonb_build_object('ID_NEW', first_id, 'LOTE', lot_c, 'LABOR', 'Soca', 'FECHA', '2026-01-02'))))),
    jsonb_build_object('record_id', second_id, 'lot_code', lot_d, 'cycle_date', '2026-01-01',
      'visit_number', 1, 'scheduled_date', '2026-01-03',
      'datos', jsonb_build_object('ID', second_id, 'FINCA', 'Finca de prueba', 'ZONA', zone_name,
        'FECHA', '2026-01-03', 'subregistros', jsonb_build_object('malezas_detalle', jsonb_build_array(
          jsonb_build_object('ID_NEW', second_id, 'LOTE', lot_d, 'LABOR', 'Soca', 'FECHA', '2026-01-03')))))
  );
  blocked := false;
  begin
    perform public.save_lot_visit_captures(batch);
  exception when raise_exception then blocked := true;
  end;
  if not blocked or exists (select 1 from public.field_records where id = first_id) then
    raise exception 'A conflicting batch was partially saved';
  end if;
end;
$$;
rollback;
