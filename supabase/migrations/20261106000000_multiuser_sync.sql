create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  username text not null unique check (username ~ '^[a-z0-9._-]{3,32}$'),
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  role text not null default 'pending' check (role in ('pending', 'aereo', 'terrestre', 'supervisor', 'admin')),
  status text not null default 'pending' check (status in ('pending', 'active', 'suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.field_records (
  id uuid primary key,
  owner_id uuid not null references public.profiles (id),
  tipo text not null check (length(trim(tipo)) between 1 and 80),
  schema_version integer not null check (schema_version > 0),
  datos jsonb not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  review_note text check (review_note is null or length(review_note) <= 2000),
  created_at timestamptz not null default now(),
  constraint field_records_review_fields_check check (
    (review_status = 'pending' and reviewed_by is null and reviewed_at is null)
    or (review_status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null)
  )
);

create index if not exists field_records_owner_created_idx
  on public.field_records (owner_id, created_at desc);
create index if not exists field_records_review_created_idx
  on public.field_records (review_status, created_at desc);

create or replace function public.create_profile_for_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
  requested_name text := trim(coalesce(new.raw_user_meta_data ->> 'display_name', ''));
begin
  if requested_username !~ '^[a-z0-9._-]{3,32}$' then
    raise exception 'A valid username is required';
  end if;
  if length(requested_name) not between 1 and 120 then
    raise exception 'A valid display name is required';
  end if;

  insert into public.profiles (id, email, username, display_name)
  values (new.id, lower(new.email), requested_username, requested_name);
  return new;
end;
$$;

drop trigger if exists create_profile_after_auth_signup on auth.users;
create trigger create_profile_after_auth_signup
  after insert on auth.users
  for each row execute function public.create_profile_for_new_auth_user();

create or replace function public.current_profile_is_active()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'active'
  );
$$;

create or replace function public.current_user_can_capture_type(p_tipo text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and (
        role = 'admin'
        or (role = 'aereo' and p_tipo in ('clima', 'epp', 'vuelos'))
        or (role = 'terrestre' and p_tipo in ('variacion_aguilon', 'calibracion_aguilon', 'calibraciones_pcpm'))
        or (role = 'supervisor' and p_tipo in ('malezas', 'calidad'))
      )
  );
$$;

create or replace function public.current_user_can_review()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and status = 'active'
      and role in ('admin', 'supervisor')
  );
$$;

alter table public.profiles enable row level security;
alter table public.field_records enable row level security;

drop policy if exists "Users read their own profile and reviewers read all profiles" on public.profiles;
create policy "Users read their own profile and reviewers read all profiles"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.current_user_can_review())
  );

drop policy if exists "Users read own records and reviewers read all records" on public.field_records;
create policy "Users read own records and reviewers read all records"
  on public.field_records for select to authenticated
  using (
    (
      owner_id = (select auth.uid())
      and (select public.current_profile_is_active())
    )
    or (select public.current_user_can_review())
  );

drop policy if exists "Active users insert their own pending records" on public.field_records;
create policy "Active users insert their own pending records"
  on public.field_records for insert to authenticated
  with check (
    owner_id = (select auth.uid())
    and review_status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and (select public.current_user_can_capture_type(tipo))
  );

create or replace function public.set_member_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  caller_status text;
  active_admin_count integer;
begin
  select role, status into caller_role, caller_status
  from public.profiles where id = (select auth.uid());
  if caller_role is distinct from 'admin' or caller_status is distinct from 'active' then
    raise exception 'Only an active administrator can change member roles';
  end if;
  if p_role not in ('pending', 'aereo', 'terrestre', 'supervisor', 'admin') then
    raise exception 'Invalid member role';
  end if;

  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'An administrator cannot remove their own administrator role';
  end if;
  if p_role <> 'admin' then
    select count(*) into active_admin_count
    from public.profiles where role = 'admin' and status = 'active';
    if active_admin_count <= 1 and exists (
      select 1 from public.profiles where id = p_user_id and role = 'admin' and status = 'active'
    ) then
      raise exception 'At least one active administrator must remain';
    end if;
  end if;

  update public.profiles
  set role = p_role,
      status = case when p_role = 'pending' then 'pending' else 'active' end
  where id = p_user_id;
  if not found then
    raise exception 'Member not found';
  end if;
end;
$$;

create or replace function public.review_field_record(p_record_id uuid, p_decision text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  caller_status text;
begin
  select role, status into caller_role, caller_status
  from public.profiles where id = (select auth.uid());
  if caller_status is distinct from 'active' or caller_role not in ('admin', 'supervisor') then
    raise exception 'Only an active supervisor or administrator can review records';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid review decision';
  end if;
  if p_note is not null and length(p_note) > 2000 then
    raise exception 'Review note is too long';
  end if;

  update public.field_records
  set review_status = p_decision,
      reviewed_by = (select auth.uid()),
      reviewed_at = now(),
      review_note = nullif(trim(p_note), '')
  where id = p_record_id
    and review_status = 'pending'
    and owner_id <> (select auth.uid());
  if not found then
    raise exception 'Record not found, already reviewed, or owned by the reviewer';
  end if;
end;
$$;

revoke all on function public.create_profile_for_new_auth_user() from public, anon, authenticated;
revoke all on function public.current_profile_is_active() from public, anon;
revoke all on function public.current_user_can_capture_type(text) from public, anon;
revoke all on function public.current_user_can_review() from public, anon;
revoke all on function public.set_member_role(uuid, text) from public, anon;
revoke all on function public.review_field_record(uuid, text, text) from public, anon;
revoke all on table public.profiles, public.field_records from public, anon, authenticated;
grant execute on function public.current_profile_is_active() to authenticated;
grant execute on function public.current_user_can_capture_type(text) to authenticated;
grant execute on function public.current_user_can_review() to authenticated;
grant execute on function public.set_member_role(uuid, text) to authenticated;
grant execute on function public.review_field_record(uuid, text, text) to authenticated;

grant select on public.profiles to authenticated;
grant select on public.field_records to authenticated;
grant insert (id, owner_id, tipo, schema_version, datos) on public.field_records to authenticated;
