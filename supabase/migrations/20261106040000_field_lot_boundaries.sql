create table if not exists public.field_lot_boundaries (
  lot_code text primary key check (lot_code ~ '^[0-9]{7}$'),
  zone text not null check (length(trim(zone)) between 1 and 32),
  finca text not null check (length(trim(finca)) between 1 and 120),
  geometry jsonb not null check (
    jsonb_typeof(geometry) = 'object'
    and geometry ->> 'crs' = 'EPSG:32615'
    and (jsonb_typeof(geometry -> 'rings') = 'array') is true
  )
);

alter table public.field_lot_boundaries enable row level security;

drop policy if exists "Users read lot boundaries in assigned zones" on public.field_lot_boundaries;
create policy "Users read lot boundaries in assigned zones"
  on public.field_lot_boundaries for select to authenticated
  using ((select public.current_user_can_access_zone(zone)));

revoke all on table public.field_lot_boundaries from public, anon, authenticated;
grant select on table public.field_lot_boundaries to authenticated;
grant select, insert, update on table public.field_lot_boundaries to service_role;
