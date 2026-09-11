-- Preserve permissions and data; avoid repeating the full scope check for each 500-row page.
create or replace function public.get_legalteam_allocation_work(p_billing_entity_id uuid,p_start date,p_end date,p_offset integer default 0,p_limit integer default 500)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare entity public.billing_entities;result jsonb;
begin
 select * into entity from public.billing_entities where id=p_billing_entity_id;
 if auth.uid() is null or entity.id is null or not private.is_legalteam(entity.id)
   or not private.has_scope_access(entity.firm_id,entity.id,null,null,'view')
   or not private.can_view_billing_financials(entity.firm_id,entity.id) then raise exception 'Sem permissão para consultar a repartição.' using errcode='42501';end if;
 -- Both dates may be null to obtain the complete authorised period, still paginated.
 if (p_start is null)<>(p_end is null) or p_start>p_end or p_offset is null or p_offset<0 or p_limit is null or p_limit not between 1 and 5000 then raise exception 'Período ou paginação inválidos.';end if;
 with eligible as materialized (
  select w.id,w.client_id,w.work_date,c.display_name client_name,coalesce(p.display_name,'') professional_name,
   w.activity_description,w.duration_minutes,w.effective_amount,w.currency,w.billing_scope,w.is_billable,w.is_paid,w.status,
   c.client_referrer,w.task_referrer,w.task_referrer_other
  from public.work_entries w join public.clients c on c.id=w.client_id and c.firm_id=w.firm_id
  left join public.professionals p on p.id=w.professional_id and p.firm_id=w.firm_id
  where w.firm_id=entity.firm_id and w.billing_entity_id=entity.id and (p_start is null or w.work_date between p_start and p_end)
   and w.currency='EUR' and private.has_scope_access(w.firm_id,w.billing_entity_id,w.client_id,w.matter_id,'view')
 ), page as(select * from eligible order by work_date,id offset p_offset limit p_limit)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(page) order by work_date,id) from page),'[]'::jsonb),'total',(select count(*) from eligible)) into result;
 return result;
end;$$;
revoke all on function public.get_legalteam_allocation_work(uuid,date,date,integer,integer) from public,anon;
grant execute on function public.get_legalteam_allocation_work(uuid,date,date,integer,integer) to authenticated;
notify pgrst,'reload schema';
