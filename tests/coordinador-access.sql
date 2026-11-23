-- Run against an isolated migrated database; all fixtures are rolled back.
begin;
do $$
declare
  admin_id uuid := gen_random_uuid();
  coord_id uuid := gen_random_uuid();
  owner_id uuid := gen_random_uuid();
  capture_id uuid := gen_random_uuid();
  visit_id uuid := gen_random_uuid();
  member uuid;
  username text;
  zone_name text;
  lot_code text;
  farm text;
begin
  select l.zone, l.lot_code, l.finca into zone_name, lot_code, farm
  from public.field_lots l where not exists (select 1 from public.lot_visit_plans p where p.lot_code = l.lot_code)
  order by l.lot_code limit 1;
  if lot_code is null then raise exception 'Test requires a lot without a plan'; end if;
  foreach member in array array[admin_id, coord_id, owner_id] loop
    username := 'test_' || substr(replace(member::text, '-', ''), 1, 20);
    insert into auth.users(id, email, raw_user_meta_data, raw_app_meta_data)
    values (member, username || '@example.invalid', jsonb_build_object('username', username, 'display_name', 'Test'), '{}'::jsonb);
  end loop;
  update public.profiles set role = 'admin', status = 'active' where id = admin_id;
  update public.profiles set role = 'coordinador', status = 'active' where id = coord_id;
  update public.profiles set role = 'aereo', status = 'active' where id = owner_id;
  insert into public.field_records(id, owner_id, tipo, schema_version, datos)
  values (capture_id, owner_id, 'clima', 1, jsonb_build_object('zona', zone_name));
  insert into public.lot_visit_plans(lot_code, cycle_date, visit_dates)
  values (lot_code, '2026-03-01', array['2026-03-02'::date]);
  insert into public.field_records(id, owner_id, tipo, schema_version, datos)
  values (visit_id, owner_id, 'malezas', 1,
    jsonb_build_object('ZONA', zone_name, 'FINCA', farm, 'FECHA', '2026-03-02',
      'subregistros', jsonb_build_object('malezas_detalle', jsonb_build_array(
        jsonb_build_object('LOTE', lot_code, 'FECHA', '2026-03-02', 'LABOR', 'Soca')))));
  insert into public.lot_visit_capture_links(lot_code, cycle_date, visit_number, record_id)
  values (lot_code, '2026-03-01', 1, visit_id);
  perform set_config('test.coord', coord_id::text, true);
  perform set_config('test.admin', admin_id::text, true);
  perform set_config('test.owner', owner_id::text, true);
  perform set_config('test.capture', capture_id::text, true);
  perform set_config('test.visit', visit_id::text, true);
  perform set_config('test.zone', zone_name, true);
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.coord'), true);
do $$
declare
  kind text;
  denied boolean;
begin
  foreach kind in array array['clima', 'epp', 'vuelos', 'malezas', 'calidad'] loop
    if not public.current_user_can_capture_type(kind) then raise exception 'Cannot capture %', kind; end if;
  end loop;
  if public.current_user_can_capture_type('calibracion_aguilon') then raise exception 'Unexpected terrestrial capture'; end if;
  if not public.current_user_can_access_zone(current_setting('test.zone')) then raise exception 'Zone access denied'; end if;
  if not exists (select 1 from public.field_records where id = current_setting('test.capture')::uuid) then raise exception 'Shared record unavailable'; end if;
  if not exists (select 1 from public.admin_export_field_records(array['clima']) where id = current_setting('test.capture')::uuid) then raise exception 'Shared export unavailable'; end if;
  if not exists (select 1 from public.get_export_lot_visits()
    where record_id = current_setting('test.visit')::uuid and cycle_date = '2026-03-01' and visit_number = 1) then
    raise exception 'Exported visit metadata unavailable';
  end if;
  if (public.get_field_record_sync(null)->'ids') is null then raise exception 'Synchronization unavailable'; end if;
  if auth.uid() is distinct from current_setting('test.coord')::uuid then raise exception 'Test auth identity mismatch'; end if;
  if not public.current_user_can_access_record_scope('{}'::jsonb) then raise exception 'Empty scope denied'; end if;
  insert into public.field_records(id, owner_id, tipo, schema_version, datos)
  values (gen_random_uuid(), current_setting('test.coord')::uuid, 'calidad', 1, '{}'::jsonb);
  denied := false;
  begin
    perform public.update_field_record(current_setting('test.capture')::uuid, 1, '{}'::jsonb);
  exception when raise_exception then denied := true; end;
  if not denied then raise exception 'Coordinator can edit another user capture'; end if;
  denied := false;
  begin
    perform public.delete_field_record(current_setting('test.capture')::uuid);
  exception when raise_exception then denied := true; end;
  if not denied then raise exception 'Coordinator can delete another user capture'; end if;
  denied := false;
  begin
    perform public.set_member_access(current_setting('test.owner')::uuid, 'admin', '{}');
  exception when raise_exception then denied := true; end;
  if not denied then raise exception 'Coordinator can administer users'; end if;
  denied := false;
  begin
    perform public.review_field_record(current_setting('test.capture')::uuid, 'approved');
  exception when raise_exception then denied := true; end;
  if not denied then raise exception 'Coordinator can review another user capture'; end if;
end;
$$;
select set_config('request.jwt.claim.sub', current_setting('test.admin'), true);
do $$
begin
  perform public.set_member_access(current_setting('test.coord')::uuid, 'coordinador', '{}');
  if not exists (select 1 from public.profiles where id = current_setting('test.coord')::uuid
      and role = 'coordinador' and status = 'active' and cardinality(allowed_zones) > 0) then
    raise exception 'Administrator could not assign the coordinator role';
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
  if exists (select 1 from public.field_records where id = current_setting('test.capture')::uuid) then raise exception 'Suspended coordinator can see records'; end if;
  begin
    perform * from public.admin_export_field_records(array['clima']);
  exception when raise_exception then denied := true; end;
  if not denied then raise exception 'Suspended coordinator can export'; end if;
end;
$$;
rollback;
