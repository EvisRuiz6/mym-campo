begin;
do $$
declare
  admin_id uuid := gen_random_uuid();
  lot text := 'test_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 18);
  coordinator_lot text := 'test_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 18);
  zone_name text;
  username text := 'test_' || substr(replace(admin_id::text, '-', ''), 1, 20);
  first_id uuid := gen_random_uuid();
  second_id uuid := gen_random_uuid();
  payload jsonb;
  blocked boolean;
begin
  select zone into zone_name from public.field_lots order by lot_code limit 1;
  if zone_name is null then raise exception 'A configured zone is required'; end if;
  insert into auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
  values (admin_id, username || '@example.invalid',
    jsonb_build_object('username', username, 'display_name', 'Test'), '{}'::jsonb);
  update public.profiles set role = 'admin', status = 'active' where id = admin_id;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  insert into public.field_lots(lot_code, zone, finca) values (lot, zone_name, 'Finca de prueba');
  insert into public.lot_visit_plans(lot_code, cycle_date, visit_zero_date, visit_dates)
  values (lot, '2026-01-01', '2026-01-15', array['2026-02-01'::date]);
  payload := jsonb_build_object(
    'ID', first_id::text, 'FINCA', 'Finca de prueba', 'ZONA', zone_name, 'FECHA', '2026-01-15',
    'subregistros', jsonb_build_object('malezas_detalle', jsonb_build_array(
      jsonb_build_object('ID_NEW', first_id::text, 'LOTE', lot, 'LABOR', 'Soca', 'FECHA', '2026-01-15')
    ))
  );
  if public.save_lot_visit_capture(first_id, lot, '2026-01-01', 0, '2026-01-15', payload) <> first_id
    or public.save_lot_visit_capture(first_id, lot, '2026-01-01', 0, '2026-01-15', payload) <> first_id then
    raise exception 'Visit zero could not be saved or retried';
  end if;
  if not exists (select 1 from public.lot_visit_capture_links where record_id = first_id and visit_number = 0) then
    raise exception 'Visit zero was not linked';
  end if;
  payload := jsonb_set(jsonb_set(payload, '{ID}', to_jsonb(second_id::text)),
    '{subregistros,malezas_detalle,0,ID_NEW}', to_jsonb(second_id::text));
  blocked := false;
  begin
    perform public.save_lot_visit_capture(second_id, lot, '2026-01-01', 0, '2026-01-15', payload);
  exception when raise_exception then
    if sqlerrm not like '%ya fue realizada%' then raise; end if;
    blocked := true;
  end;
  if not blocked then raise exception 'Duplicate visit zero was accepted'; end if;
  blocked := false;
  begin
    update public.lot_visit_plans set visit_dates = array['2026-02-01'::date, '2026-03-01',
      '2026-04-01', '2026-05-01', '2026-06-01'] where lot_code = lot;
  exception when check_violation then blocked := true;
  end;
  if not blocked then raise exception 'Six scheduled visits were accepted'; end if;

  insert into public.field_lots(lot_code, zone, finca) values (coordinator_lot, zone_name, 'Finca de prueba');
  insert into public.lot_visit_plans(lot_code, cycle_date, visit_zero_date)
  values (coordinator_lot, '2026-01-01', '2026-01-15');
  update public.profiles set role = 'coordinador' where id = admin_id;
  payload := jsonb_set(payload, '{subregistros,malezas_detalle,0,LOTE}', to_jsonb(coordinator_lot));
  if public.save_lot_visit_capture(second_id, coordinator_lot, '2026-01-01', 0, '2026-01-15', payload) <> second_id then
    raise exception 'Coordinator could not save visit zero';
  end if;
end;
$$;
rollback;
