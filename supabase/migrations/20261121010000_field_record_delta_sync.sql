-- The transaction ID is stored on the row being changed, so sync adds no
-- cross-record locks. A snapshot identifies transactions still in progress.
alter table public.field_records add column sync_xid bigint not null default pg_catalog.txid_current();
alter table public.profiles add column sync_xid bigint not null default pg_catalog.txid_current();

create function public.stamp_record_sync_xid()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.sync_xid := pg_catalog.txid_current();
  return new;
end;
$$;
revoke all on function public.stamp_record_sync_xid() from public, anon, authenticated;

create trigger stamp_record_sync_xid
before insert or update on public.field_records
for each row execute function public.stamp_record_sync_xid();

create trigger stamp_profile_sync_xid
before insert or update on public.profiles
for each row execute function public.stamp_record_sync_xid();

create table public.field_record_sync_epoch (
  singleton boolean primary key default true check (singleton),
  epoch uuid not null default gen_random_uuid()
);
insert into public.field_record_sync_epoch default values;
alter table public.field_record_sync_epoch enable row level security;
revoke all on public.field_record_sync_epoch from public, anon, authenticated;
grant select on public.field_record_sync_epoch to authenticated;
create policy "Authenticated users read sync epoch"
on public.field_record_sync_epoch for select to authenticated using (true);

create function public.get_field_record_sync(p_after text default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  current_epoch text;
  current_snapshot pg_catalog.txid_snapshot := pg_catalog.txid_current_snapshot();
  previous_snapshot pg_catalog.txid_snapshot;
  full_sync boolean := p_after is null;
  result jsonb;
begin
  select epoch::text into strict current_epoch from public.field_record_sync_epoch;
  if p_after is not null then
    if p_after !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\|[0-9]+:[0-9]+:[0-9,]*$' then
      raise exception 'Cursor de sincronización no válido';
    end if;
    if split_part(p_after, '|', 1) <> current_epoch then
      full_sync := true;
    else
      previous_snapshot := split_part(p_after, '|', 2)::pg_catalog.txid_snapshot;
      if pg_catalog.txid_snapshot_xmax(previous_snapshot) > pg_catalog.txid_snapshot_xmax(current_snapshot) then
        full_sync := true;
      end if;
    end if;
  end if;

  with visible as materialized (
    select r.id, r.owner_id, r.tipo, r.created_at, r.schema_version, r.datos,
      r.review_status, r.reviewed_by, r.reviewed_at, r.review_note,
      jsonb_build_object('username', p.username, 'display_name', p.display_name) as profiles,
      r.sync_xid as record_xid, p.sync_xid as profile_xid
    from public.field_records r
    left join public.profiles p on p.id = r.owner_id
  )
  select jsonb_build_object(
    'cursor', current_epoch || '|' || current_snapshot::text,
    'full', full_sync,
    'ids', coalesce(jsonb_agg(id order by id), '[]'::jsonb),
    'records', coalesce(jsonb_agg(to_jsonb(visible) - 'record_xid' - 'profile_xid' order by id)
      filter (where full_sync
        or not pg_catalog.txid_visible_in_snapshot(record_xid, previous_snapshot)
        or (profile_xid is not null and not pg_catalog.txid_visible_in_snapshot(profile_xid, previous_snapshot))),
      '[]'::jsonb)
  ) into result from visible;
  return result;
end;
$$;
revoke all on function public.get_field_record_sync(text) from public, anon;
grant execute on function public.get_field_record_sync(text) to authenticated;
