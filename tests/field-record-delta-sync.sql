-- Run against a migrated database; all fixtures are rolled back.
begin;
do $$
declare
  first_user uuid := gen_random_uuid();
  second_user uuid := gen_random_uuid();
  first_record uuid := gen_random_uuid();
  second_record uuid := gen_random_uuid();
  user_id uuid;
  username text;
begin
  foreach user_id in array array[first_user, second_user] loop
    username := 'test_' || substr(replace(user_id::text, '-', ''), 1, 20);
    insert into auth.users(id, email, raw_user_meta_data, raw_app_meta_data)
    values (user_id, username || '@example.invalid',
      jsonb_build_object('username', username, 'display_name', 'Test'), '{}'::jsonb);
  end loop;
  update public.profiles set role = 'aereo', status = 'active' where id in (first_user, second_user);
  insert into public.field_records(id, owner_id, tipo, schema_version, datos)
  values (first_record, first_user, 'clima', 1, '{"valor":1}'),
    (second_record, second_user, 'clima', 1, '{"valor":2}');
  perform set_config('test.delta_user', first_user::text, true);
  perform set_config('test.delta_own', first_record::text, true);
  perform set_config('test.delta_other', second_record::text, true);
end;
$$;
set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('test.delta_user'), true);
do $$
declare result jsonb;
begin
  result := public.get_field_record_sync(null);
  if jsonb_array_length(result -> 'ids') <> 1
    or result -> 'ids' ->> 0 <> current_setting('test.delta_own')
    or jsonb_array_length(result -> 'records') <> 1 then
    raise exception 'Initial synchronization leaked or omitted records';
  end if;
  -- Model the fixture transaction as still active in a prior snapshot.
  perform set_config('test.delta_cursor',
    split_part(result ->> 'cursor', '|', 1) || '|' ||
    txid_current()::text || ':' || (txid_current() + 1)::text || ':' || txid_current()::text, true);
  result := public.get_field_record_sync(current_setting('test.delta_cursor'));
  -- The fixture transaction is still in progress, so its rows are safely
  -- retransmitted until it commits. Cross-transaction behavior is tested separately.
  if jsonb_array_length(result -> 'records') <> 1
    or result -> 'records' -> 0 ->> 'id' <> current_setting('test.delta_own') then
    raise exception 'Uncommitted fixture records were missed or another account leaked';
  end if;
end;
$$;
reset role;
update public.field_records set datos = '{"valor":3}'
where id in (current_setting('test.delta_own')::uuid, current_setting('test.delta_other')::uuid);
set local role authenticated;
do $$
declare result jsonb;
begin
  result := public.get_field_record_sync(current_setting('test.delta_cursor'));
  if jsonb_array_length(result -> 'ids') <> 1
    or jsonb_array_length(result -> 'records') <> 1
    or result -> 'records' -> 0 ->> 'id' <> current_setting('test.delta_own')
    or result -> 'records' -> 0 -> 'datos' ->> 'valor' <> '3' then
    raise exception 'Incremental synchronization leaked or missed a change';
  end if;
  perform set_config('test.delta_cursor', result ->> 'cursor', true);
end;
$$;
reset role;
delete from public.field_records where id = current_setting('test.delta_own')::uuid;
set local role authenticated;
do $$
declare result jsonb;
begin
  result := public.get_field_record_sync(current_setting('test.delta_cursor'));
  if jsonb_array_length(result -> 'ids') <> 0 or jsonb_array_length(result -> 'records') <> 0 then
    raise exception 'Deletion was not represented safely';
  end if;
end;
$$;
rollback;
