-- The CLIENTES sheet contains directory rows without a deducible category.
-- Keep them out of the write payload instead of attempting a NULL client_type.

alter function public.commit_validated_import(jsonb)
  rename to commit_validated_import_unfiltered;

revoke all on function public.commit_validated_import_unfiltered(jsonb)
  from public, anon, authenticated;

create function public.commit_validated_import(p_payload jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.commit_validated_import_unfiltered(
    jsonb_set(
      p_payload,
      '{clientDirectory}',
      coalesce(
        (
          select jsonb_agg(item)
          from jsonb_array_elements(coalesce(p_payload->'clientDirectory', '[]'::jsonb)) item
          where item->>'clientType' in ('individual', 'company')
        ),
        '[]'::jsonb
      ),
      true
    )
  );
$$;

revoke all on function public.commit_validated_import(jsonb) from public, anon;
grant execute on function public.commit_validated_import(jsonb) to authenticated;

notify pgrst, 'reload schema';
