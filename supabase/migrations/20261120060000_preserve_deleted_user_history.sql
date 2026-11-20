alter table public.profiles add column auth_user_id uuid;
update public.profiles set auth_user_id = id;

alter table public.profiles
  drop constraint profiles_id_fkey,
  add constraint profiles_auth_user_id_fkey foreign key (auth_user_id) references auth.users(id) on delete set null,
  add constraint profiles_auth_identity_check check (auth_user_id is null or auth_user_id = id),
  add constraint profiles_deleted_status_check check (auth_user_id is not null or status = 'suspended');

create function public.maintain_profile_auth_identity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.auth_user_id := new.id;
  elsif old.auth_user_id is not null and new.auth_user_id is null then
    new.status := 'suspended';
    new.allowed_zones := '{}';
  end if;
  return new;
end;
$$;

create trigger maintain_profile_auth_identity
before insert or update of auth_user_id on public.profiles
for each row execute function public.maintain_profile_auth_identity();

alter table public.lot_weekly_visit_programs
  drop constraint lot_weekly_visit_programs_created_by_fkey,
  add constraint lot_weekly_visit_programs_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null;

create function public.protect_last_admin_on_auth_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  lock table public.profiles in share row exclusive mode;
  if exists (select 1 from public.profiles where id = old.id and role = 'admin' and status = 'active')
    and (select count(*) from public.profiles where role = 'admin' and status = 'active') <= 1 then
    raise exception 'No se puede eliminar al último administrador activo';
  end if;
  return old;
end;
$$;

create trigger protect_last_admin_on_auth_delete
before delete on auth.users
for each row execute function public.protect_last_admin_on_auth_delete();
