create or replace function public.export_without_attachment_data(p_value jsonb)
returns jsonb
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  result jsonb;
begin
  if jsonb_typeof(p_value) = 'array' then
    select coalesce(jsonb_agg(public.export_without_attachment_data(item) order by position), '[]'::jsonb)
    into result from jsonb_array_elements(p_value) with ordinality as entries(item, position);
    return result;
  end if;
  if jsonb_typeof(p_value) = 'object' then
    select coalesce(jsonb_object_agg(key, public.export_without_attachment_data(value)), '{}'::jsonb)
    into result from jsonb_each(p_value)
    where not (key = 'dataUrl' and p_value ? 'name' and p_value ? 'mimeType');
    return result;
  end if;
  return p_value;
end;
$$;

create or replace function public.admin_export_field_records(
  p_modules text[],
  p_after_created timestamptz default null,
  p_after_id uuid default null,
  p_limit integer default 250
)
returns table (
  id uuid, owner_id uuid, tipo text, created_at timestamptz, schema_version integer,
  datos jsonb, review_status text, reviewed_by uuid, reviewed_at timestamptz,
  review_note text, owner_username text, owner_name text
)
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid()) and profiles.role = 'admin' and profiles.status = 'active'
  ) then
    raise exception 'Solo una cuenta administradora activa puede exportar las capturas';
  end if;
  if p_modules is null or cardinality(p_modules) = 0 or array_position(p_modules, null) is not null
    or not (p_modules <@ array['clima', 'malezas', 'epp', 'vuelos', 'calidad',
      'variacion_aguilon', 'calibracion_aguilon', 'calibraciones_pcpm']::text[]) then
    raise exception 'Selecciona módulos válidos para exportar';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 250 or
    ((p_after_created is null) <> (p_after_id is null)) then
    raise exception 'Paginación de exportación no válida';
  end if;
  return query
  select record.id, record.owner_id, record.tipo, record.created_at, record.schema_version,
    public.export_without_attachment_data(record.datos), record.review_status, record.reviewed_by,
    record.reviewed_at, record.review_note, profile.username, profile.display_name
  from public.field_records as record
  left join public.profiles as profile on profile.id = record.owner_id
  where record.tipo = any(p_modules)
    and (p_after_created is null or (record.created_at, record.id) > (p_after_created, p_after_id))
  order by record.created_at, record.id
  limit p_limit;
end;
$$;

revoke all on function public.export_without_attachment_data(jsonb) from public, anon;
revoke all on function public.admin_export_field_records(text[], timestamptz, uuid, integer) from public, anon;
grant execute on function public.export_without_attachment_data(jsonb) to authenticated;
grant execute on function public.admin_export_field_records(text[], timestamptz, uuid, integer) to authenticated;
