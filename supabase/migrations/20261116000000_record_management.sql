create or replace function public.update_field_record(
  p_record_id uuid,
  p_schema_version integer,
  p_datos jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  caller_status text;
  record_owner uuid;
  previous_data jsonb;
begin
  select role, status into caller_role, caller_status
  from public.profiles
  where id = (select auth.uid());
  if caller_status is distinct from 'active' then
    raise exception 'Only an active user can edit records';
  end if;
  if p_schema_version is null or p_schema_version < 1 then
    raise exception 'Invalid record schema version';
  end if;
  if p_datos is null or jsonb_typeof(p_datos) is distinct from 'object' then
    raise exception 'Record data must be a JSON object';
  end if;

  select owner_id, datos into record_owner, previous_data
  from public.field_records
  where id = p_record_id
  for update;
  if not found then
    raise exception 'Record not found';
  end if;
  if caller_role is distinct from 'admin' and record_owner is distinct from (select auth.uid()) then
    raise exception 'Users can only edit their own records';
  end if;
  if public.current_user_can_access_record_scope(previous_data) is not true
    or public.current_user_can_access_record_scope(p_datos) is not true then
    raise exception 'Record is outside the user assigned zones';
  end if;

  update public.field_records
  set schema_version = p_schema_version,
      datos = p_datos,
      review_status = 'pending',
      reviewed_by = null,
      reviewed_at = null,
      review_note = null
  where id = p_record_id;
end;
$$;

create or replace function public.delete_field_record(p_record_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  caller_status text;
  record_owner uuid;
  record_data jsonb;
begin
  select role, status into caller_role, caller_status
  from public.profiles
  where id = (select auth.uid());
  if caller_status is distinct from 'active' then
    raise exception 'Only an active user can delete records';
  end if;

  select owner_id, datos into record_owner, record_data
  from public.field_records
  where id = p_record_id
  for update;
  if not found then
    return;
  end if;
  if caller_role is distinct from 'admin' and record_owner is distinct from (select auth.uid()) then
    raise exception 'Users can only delete their own records';
  end if;
  if public.current_user_can_access_record_scope(record_data) is not true then
    raise exception 'Record is outside the user assigned zones';
  end if;

  delete from public.field_records where id = p_record_id;
end;
$$;

revoke all on function public.update_field_record(uuid, integer, jsonb) from public, anon, authenticated;
revoke all on function public.delete_field_record(uuid) from public, anon, authenticated;
grant execute on function public.update_field_record(uuid, integer, jsonb) to authenticated;
grant execute on function public.delete_field_record(uuid) to authenticated;
