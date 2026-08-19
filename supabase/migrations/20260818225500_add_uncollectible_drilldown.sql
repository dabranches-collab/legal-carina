drop function if exists public.get_uncollectible_work_entries();
create or replace function public.get_uncollectible_work_entries(p_search text default null,p_year integer default null,p_professional_id uuid default null,p_billing_entity_id uuid default null,p_archive text default null,p_missing_price boolean default false,p_client_type text default null,p_client_id uuid default null,p_missing_society boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' set statement_timeout='30s' as $$
declare payload jsonb; filtered jsonb;
begin
 payload:=public.search_work_entries(1,10000,p_search,p_year,p_professional_id,p_billing_entity_id,null,null,p_archive,false,p_missing_price,p_client_type,p_client_id,p_missing_society,'work_date','desc');
 select coalesce(jsonb_agg(item),'[]'::jsonb) into filtered
 from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb))item
 where item->>'status' in('uncollectible_uninvoiced','uncollectible_invoiced');
 return jsonb_build_object('items',filtered,'total',jsonb_array_length(filtered),'page',1,'pageSize',10000,
  'professionals',coalesce(payload->'professionals','[]'::jsonb),'billingEntities',coalesce(payload->'billingEntities','[]'::jsonb));
end;$$;
revoke all on function public.get_uncollectible_work_entries(text,integer,uuid,uuid,text,boolean,text,uuid,boolean) from public,anon;
grant execute on function public.get_uncollectible_work_entries(text,integer,uuid,uuid,text,boolean,text,uuid,boolean) to authenticated;
notify pgrst,'reload schema';
