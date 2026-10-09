-- PROPOSTA DE LEITURA. Não é uma migration e não foi aplicada a serviços reais.
-- SECURITY INVOKER: respeita RLS das relações e os controlos das RPC originais.
-- Não altera linhas financeiras, cálculo de montantes, tokens ou permissões existentes.

create or replace function public.get_workflow_client_ids(
 p_scope_billing_entity_id uuid default null,
 p_scope_professional_id uuid default null,
 p_scope_client_type text default null
) returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(c.id order by c.id),'[]'::jsonb)
 from public.clients c
 where (p_scope_client_type is null
  or (p_scope_client_type in ('individual','company') and (
    exists(select 1 from public.client_profiles cp where cp.client_id=c.id and cp.active and cp.client_type=p_scope_client_type)
    or (not exists(select 1 from public.client_profiles cp where cp.client_id=c.id and cp.active) and (c.client_type=p_scope_client_type or c.client_type='mixed'))))
  or (p_scope_client_type='mixed' and (
    (exists(select 1 from public.client_profiles cp where cp.client_id=c.id and cp.active and cp.client_type='individual')
     and exists(select 1 from public.client_profiles cp where cp.client_id=c.id and cp.active and cp.client_type='company'))
    or (not exists(select 1 from public.client_profiles cp where cp.client_id=c.id and cp.active) and c.client_type='mixed'))))
 and (p_scope_professional_id is null or exists(
   select 1 from public.work_entries w where w.client_id=c.id and w.professional_id=p_scope_professional_id and w.status<>'cancelled'))
 and (p_scope_billing_entity_id is null or c.primary_billing_entity_id=p_scope_billing_entity_id
  or exists(select 1 from public.work_entries w where w.client_id=c.id and w.billing_entity_id=p_scope_billing_entity_id and w.status<>'cancelled')
  or exists(select 1 from public.client_retainers r where r.client_id=c.id and r.billing_entity_id=p_scope_billing_entity_id and r.active)
  or exists(select 1 from public.client_credit_accounts a where a.client_id=c.id and a.billing_entity_id=p_scope_billing_entity_id));
$$;

create or replace function public.get_workflow_client_credit_accounts(
 p_scope_billing_entity_id uuid default null,
 p_scope_professional_id uuid default null,
 p_scope_client_type text default null
) returns jsonb language sql stable security invoker set search_path='' as $$
 with clients as materialized (select public.get_workflow_client_ids(p_scope_billing_entity_id,p_scope_professional_id,p_scope_client_type) ids)
 select coalesce(jsonb_agg(a order by a->>'client_name',a->>'society_name',a->>'currency'),'[]'::jsonb)
 from jsonb_array_elements(public.get_client_credit_accounts()) a, clients
 where clients.ids ? (a->>'client_id')
 and (p_scope_billing_entity_id is null or a->>'billing_entity_id'=p_scope_billing_entity_id::text);
$$;

create or replace function public.get_workflow_retainer_management(
 p_scope_billing_entity_id uuid default null,
 p_scope_professional_id uuid default null,
 p_scope_client_type text default null
) returns jsonb language sql stable security invoker set search_path='' as $$
 with clients as materialized (select public.get_workflow_client_ids(p_scope_billing_entity_id,p_scope_professional_id,p_scope_client_type) ids)
 select coalesce(jsonb_agg(to_jsonb(r) order by r.client_name),'[]'::jsonb)
 from public.get_retainer_management() r, clients where clients.ids ? r.client_id::text;
$$;

create or replace function public.get_workflow_payment_queue(
 p_scope_billing_entity_id uuid default null,
 p_scope_professional_id uuid default null,
 p_scope_client_type text default null
) returns jsonb language sql stable security invoker set search_path='' as $$
 with clients as materialized (select public.get_workflow_client_ids(p_scope_billing_entity_id,p_scope_professional_id,p_scope_client_type) ids),
 items as materialized (select i,ordinal from jsonb_array_elements(public.get_payment_queue()) with ordinality as q(i,ordinal)),
 metadata as (
  select i,ordinal,
   case when i->>'category' in ('unbilled','work') then (select w.billing_entity_id from public.work_entries w where w.id=(i->>'id')::uuid)
    when i->>'category'='retainer' then (select r.billing_entity_id from public.retainer_charges r where r.id=(i->>'id')::uuid)
    when i->>'category'='note' then coalesce(
     (select v.billing_entity_id from public.honorarium_document_versions v where v.document_id=(i->>'id')::uuid order by v.revision desc limit 1),
     (select a.billing_entity_id from public.provision_honorarium_notes n join public.client_credit_accounts a on a.id=n.account_id where n.id=(i->>'id')::uuid
      and not exists(select 1 from public.honorarium_document_versions v where v.document_id=n.id or v.credit_note_id=n.id))) end billing_id
  from items
 )
 select coalesce(jsonb_agg(i order by ordinal),'[]'::jsonb)
 from metadata,clients where clients.ids ? (i->>'client_id')
 and (p_scope_billing_entity_id is null or billing_id=p_scope_billing_entity_id)
 and (i->>'category' not in ('unbilled','work') or exists(
  select 1 from public.work_entries w where w.id=(i->>'id')::uuid
   and (p_scope_professional_id is null or w.professional_id=p_scope_professional_id)
   and (p_scope_client_type is null or p_scope_client_type='mixed' or exists(
     select 1 from public.client_profiles cp where cp.id=w.client_profile_id and cp.active and cp.client_type=p_scope_client_type))));
$$;

-- Proposta de acesso às novas RPC; RLS e grants existentes permanecem intactos.
revoke all on function public.get_workflow_client_ids(uuid,uuid,text),public.get_workflow_client_credit_accounts(uuid,uuid,text),public.get_workflow_retainer_management(uuid,uuid,text),public.get_workflow_payment_queue(uuid,uuid,text) from public,anon;
grant execute on function public.get_workflow_client_ids(uuid,uuid,text),public.get_workflow_client_credit_accounts(uuid,uuid,text),public.get_workflow_retainer_management(uuid,uuid,text),public.get_workflow_payment_queue(uuid,uuid,text) to authenticated;


notify pgrst,'reload schema';
