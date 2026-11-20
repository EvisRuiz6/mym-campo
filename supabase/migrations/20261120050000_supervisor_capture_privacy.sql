drop policy if exists "Captures are private to owner and admins" on public.field_records;
create policy "Captures are private to owner and admins"
  on public.field_records as restrictive for select to authenticated
  using (
    owner_id = (select auth.uid())
    or exists (
      select 1 from public.profiles
      where id = (select auth.uid()) and role = 'admin' and status = 'active'
    )
  );

drop policy if exists "Only admins insert lot visit plans" on public.lot_visit_plans;
create policy "Only admins insert lot visit plans"
  on public.lot_visit_plans as restrictive for insert to authenticated
  with check (exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'active'
  ));
drop policy if exists "Only admins update lot visit plans" on public.lot_visit_plans;
create policy "Only admins update lot visit plans"
  on public.lot_visit_plans as restrictive for update to authenticated
  using (exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'active'
  ))
  with check (exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'active'
  ));
drop policy if exists "Only admins delete lot visit plans" on public.lot_visit_plans;
create policy "Only admins delete lot visit plans"
  on public.lot_visit_plans as restrictive for delete to authenticated
  using (exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'active'
  ));

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
  if caller_status is distinct from 'active' or caller_role is distinct from 'admin' then
    raise exception 'Only an active administrator can review records';
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
    and owner_id <> (select auth.uid())
    and public.current_user_can_access_record_scope(datos);
  if not found then
    raise exception 'Record not found, already reviewed, outside your assigned zones, or owned by the reviewer';
  end if;
end;
$$;
