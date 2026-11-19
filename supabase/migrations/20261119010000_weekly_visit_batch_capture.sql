create function public.save_lot_visit_captures(p_captures jsonb)
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  capture jsonb;
  saved_ids uuid[] := array[]::uuid[];
  capture_count integer;
begin
  if jsonb_typeof(p_captures) is distinct from 'array' then
    raise exception 'Las visitas deben enviarse como una lista';
  end if;
  capture_count := jsonb_array_length(p_captures);
  if capture_count < 1 or capture_count > 500 then
    raise exception 'El grupo debe incluir entre 1 y 500 visitas';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_captures) as entries(value)
    group by entries.value ->> 'lot_code',
      entries.value ->> 'cycle_date',
      entries.value ->> 'visit_number'
    having count(*) > 1
  ) then
    raise exception 'El grupo contiene visitas repetidas';
  end if;

  -- Acquire every plan lock in a stable order before inserting any capture.
  perform plan.lot_code
  from public.lot_visit_plans plan
  join (
    select distinct entries.value ->> 'lot_code' as lot_code
    from jsonb_array_elements(p_captures) as entries(value)
  ) requested on requested.lot_code = plan.lot_code
  order by plan.lot_code
  for update of plan;

  if (
    select count(distinct entries.value ->> 'lot_code')
    from jsonb_array_elements(p_captures) as entries(value)
  ) <> (
    select count(distinct plan.lot_code)
    from public.lot_visit_plans plan
    join (
      select distinct entries.value ->> 'lot_code' as lot_code
      from jsonb_array_elements(p_captures) as entries(value)
    ) requested on requested.lot_code = plan.lot_code
  ) then
    raise exception 'Uno o más lotes ya no tienen un plan vigente';
  end if;

  for capture in
    select entries.value
    from jsonb_array_elements(p_captures) with ordinality as entries(value, ordinal)
    order by entries.ordinal
  loop
    saved_ids := array_append(saved_ids, public.save_lot_visit_capture(
      (capture ->> 'record_id')::uuid,
      capture ->> 'lot_code',
      (capture ->> 'cycle_date')::date,
      (capture ->> 'visit_number')::integer,
      (capture ->> 'scheduled_date')::date,
      capture -> 'datos'
    ));
  end loop;
  return saved_ids;
end;
$$;

revoke all on function public.save_lot_visit_captures(jsonb) from public, anon;
grant execute on function public.save_lot_visit_captures(jsonb) to authenticated;
