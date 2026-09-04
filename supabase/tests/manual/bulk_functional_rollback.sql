begin;
-- Mantém as alterações em massa alinhadas com a edição individual:
-- o Operador justifica, o Administrador não, e dimensões de preço recalculam tudo.
create or replace function public.bulk_update_work_entries(
  p_work_entry_ids uuid[],p_action text,p_value jsonb,p_reason text
) returns integer
language plpgsql security definer set search_path=''
as $$
declare
  actor_id uuid:=(select auth.uid());
  entry public.work_entries%rowtype;
  affected integer:=0;
  target_id uuid;
  numeric_value numeric;
  target_date date;
  operator_requires_reason boolean;
  why text;
  pricing record;
begin
  if actor_id is null then raise exception 'authentication required' using errcode='28000'; end if;
  if coalesce(cardinality(p_work_entry_ids),0)=0 or cardinality(p_work_entry_ids)>10000 then
    raise exception 'between 1 and 10000 entries are required';
  end if;
  if p_action not in('responsible','matter','society','hourly_rate','discount','invoiced','paid','archive') then
    raise exception 'unsupported bulk action';
  end if;
  if (select count(distinct id) from public.work_entries where id=any(p_work_entry_ids))<>cardinality(p_work_entry_ids) then
    raise exception 'one or more entries do not exist';
  end if;

  for entry in select * from public.work_entries where id=any(p_work_entry_ids) order by id for update loop
    if not private.has_scope_access(entry.firm_id,entry.billing_entity_id,entry.client_id,entry.matter_id,'edit') then
      raise exception 'not authorized for all selected entries' using errcode='42501';
    end if;
    select coalesce(bool_or(role='operator'),false) into operator_requires_reason
      from public.firm_members where firm_id=entry.firm_id and user_id=actor_id and active;
    if operator_requires_reason and btrim(coalesce(p_reason,''))='' then raise exception 'reason is required'; end if;
    why:=coalesce(nullif(btrim(p_reason),''),'Alteração em massa por administrador');
    if p_action in('society','hourly_rate','discount','invoiced','paid')
      and not private.can_view_billing_financials(entry.firm_id,entry.billing_entity_id) then
      raise exception 'financial access required for all selected entries' using errcode='42501';
    end if;

    case p_action
      when 'responsible' then
        target_id:=(p_value#>>'{}')::uuid;
        perform public.update_work_entry_inline_audited(entry.id,'professional_id',target_id::text,why);
      when 'matter' then
        target_id:=nullif(p_value#>>'{}','')::uuid;
        if target_id is not null and not exists(
          select 1 from public.matters m where m.id=target_id and m.firm_id=entry.firm_id and m.client_id=entry.client_id
        ) then raise exception 'process does not belong to every selected client'; end if;
        update public.work_entries set matter_id=target_id,updated_by=actor_id where id=entry.id;
        insert into public.manual_overrides(firm_id,work_entry_id,field_name,previous_value,override_value,reason,created_by)
          values(entry.firm_id,entry.id,'bulk_matter',to_jsonb(entry.matter_id),to_jsonb(target_id),why,actor_id);
      when 'archive' then
        perform public.update_work_entry_inline_audited(entry.id,'archive_status',p_value#>>'{}',why);
      when 'society' then
        target_id:=(p_value#>>'{}')::uuid;
        if not private.can_view_billing_financials(entry.firm_id,target_id) then
          raise exception 'not authorized for target society' using errcode='42501';
        end if;
        perform public.update_work_entry_inline_audited(entry.id,'billing_entity_id',target_id::text,why);
      when 'hourly_rate' then
        numeric_value:=(p_value#>>'{}')::numeric;
        if numeric_value<0 then raise exception 'invalid hourly rate'; end if;
        perform public.update_work_entry_inline_audited(entry.id,'effective_hourly_rate',numeric_value::text,why);
      when 'discount' then
        numeric_value:=(p_value#>>'{}')::numeric;
        if numeric_value<0 then raise exception 'invalid discount'; end if;
        insert into public.manual_overrides(
          firm_id,work_entry_id,field_name,previous_value,calculated_value,override_value,reason,created_by
        ) values(
          entry.firm_id,entry.id,'effective_discount_amount',to_jsonb(entry.effective_discount_amount),
          to_jsonb(entry.calculated_discount_amount),to_jsonb(numeric_value),why,actor_id
        );
        perform set_config('app.pricing_recalculation','on',true);
        update public.work_entries set
          effective_discount_amount=numeric_value,
          effective_amount=round(greatest(0,coalesce(effective_hourly_rate,0)*duration_minutes::numeric/60-numeric_value),2),
          has_manual_override=true,calculation_version=calculation_version+1,last_calculated_at=now(),updated_by=actor_id
        where id=entry.id;
      when 'invoiced' then
        target_date:=nullif(p_value->>'date','')::date;
        if target_date is null then raise exception 'invoice date is required'; end if;
        perform public.update_work_entry_inline_audited(entry.id,'invoice_date',target_date::text,why);
      when 'paid' then
        perform public.update_work_entry_inline_audited(entry.id,'is_paid','true',why);
    end case;

    if p_action in('responsible','matter','society') then
      select * into pricing from private.calculate_work_entry(entry.id);
      perform set_config('app.pricing_recalculation','on',true);
      update public.work_entries set
        pricing_rule_id=pricing.pricing_rule_id,charge_type=pricing.charge_type,
        calculated_hourly_rate=pricing.hourly_rate,effective_hourly_rate=pricing.hourly_rate,
        pre_discount_amount=pricing.pre_discount_amount,
        calculated_discount_amount=pricing.discount_amount,effective_discount_amount=pricing.discount_amount,
        calculated_amount=pricing.proposed_amount,effective_amount=pricing.proposed_amount,
        currency=coalesce(pricing.currency,currency),calculation_version=calculation_version+1,
        last_calculated_at=now(),updated_by=actor_id
      where id=entry.id;
    end if;
    affected:=affected+1;
  end loop;
  return affected;
end;
$$;

revoke all on function public.bulk_update_work_entries(uuid[],text,jsonb,text) from public,anon;
grant execute on function public.bulk_update_work_entries(uuid[],text,jsonb,text) to authenticated;
notify pgrst,'reload schema';



insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000131','bulk-admin@example.test'),
 ('00000000-0000-0000-0000-000000000132','bulk-operator@example.test');
insert into public.law_firms(id,name) values('10000000-0000-0000-0000-000000000131','QA bulk rollback');
insert into public.firm_members(firm_id,user_id,role) values
 ('10000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000131','admin'),
 ('10000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000132','operator');
insert into public.clients(id,firm_id,client_code,client_type,display_name) values
 ('20000000-0000-0000-0000-000000000131','10000000-0000-0000-0000-000000000131','QA-BULK','company','Cliente QA bulk');
insert into public.client_profiles(id,firm_id,client_id,client_type,client_code) values
 ('25000000-0000-0000-0000-000000000131','10000000-0000-0000-0000-000000000131','20000000-0000-0000-0000-000000000131','company','QA-BULK');
insert into public.matters(id,firm_id,client_id,matter_code,title) values
 ('70000000-0000-0000-0000-000000000131','10000000-0000-0000-0000-000000000131','20000000-0000-0000-0000-000000000131','QA-MAT','Processo QA bulk');
insert into public.professionals(id,firm_id,display_name) values
 ('30000000-0000-0000-0000-000000000131','10000000-0000-0000-0000-000000000131','QA Responsável A'),
 ('30000000-0000-0000-0000-000000000132','10000000-0000-0000-0000-000000000131','QA Responsável B');
insert into public.billing_entities(id,firm_id,name,legal_name) values
 ('50000000-0000-0000-0000-000000000131','10000000-0000-0000-0000-000000000131','QA Sociedade A','QA Sociedade A'),
 ('50000000-0000-0000-0000-000000000132','10000000-0000-0000-0000-000000000131','QA Sociedade B','QA Sociedade B');
insert into public.billing_entity_financial_permissions(firm_id,user_id,billing_entity_id,can_view_financials,created_by) values
 ('10000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000132','50000000-0000-0000-0000-000000000131',true,'00000000-0000-0000-0000-000000000131'),
 ('10000000-0000-0000-0000-000000000131','00000000-0000-0000-0000-000000000132','50000000-0000-0000-0000-000000000132',true,'00000000-0000-0000-0000-000000000131');
insert into public.rate_rules(id,firm_id,name,billing_entity_id,hourly_rate,currency,valid_from,priority,charge_type) values
 ('80000000-0000-0000-0000-000000000131','10000000-0000-0000-0000-000000000131','QA regra A','50000000-0000-0000-0000-000000000131',100,'EUR','2026-01-01',1000,'hourly'),
 ('80000000-0000-0000-0000-000000000132','10000000-0000-0000-0000-000000000131','QA regra B','50000000-0000-0000-0000-000000000132',200,'EUR','2026-01-01',1000,'hourly');
insert into public.rate_rules(id,firm_id,name,professional_id,hourly_rate,currency,valid_from,priority,charge_type) values
 ('80000000-0000-0000-0000-000000000133','10000000-0000-0000-0000-000000000131','QA responsável B','30000000-0000-0000-0000-000000000132',300,'EUR','2026-01-01',2000,'hourly');
insert into public.rate_rules(id,firm_id,name,matter_id,professional_id,hourly_rate,currency,valid_from,priority,charge_type) values
 ('80000000-0000-0000-0000-000000000134','10000000-0000-0000-0000-000000000131','QA processo e responsável','70000000-0000-0000-0000-000000000131','30000000-0000-0000-0000-000000000132',400,'EUR','2026-01-01',3000,'hourly');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000131',true);
select set_config('request.jwt.claim.role','authenticated',true);
insert into public.work_entries(id,firm_id,work_date,client_id,client_profile_id,professional_id,billing_entity_id,activity_description,duration_minutes,effective_hourly_rate,effective_amount,calculated_hourly_rate,calculated_amount,charge_type,currency,status,is_billable,source_type,created_by) values
 ('40000000-0000-0000-0000-000000000131','10000000-0000-0000-0000-000000000131','2026-08-21','20000000-0000-0000-0000-000000000131','25000000-0000-0000-0000-000000000131','30000000-0000-0000-0000-000000000131',null,'tcodexadministrador QA bulk responsável',60,100,100,100,100,'hourly','EUR','draft',true,'manual','00000000-0000-0000-0000-000000000131'),
 ('40000000-0000-0000-0000-000000000132','10000000-0000-0000-0000-000000000131','2026-08-21','20000000-0000-0000-0000-000000000131','25000000-0000-0000-0000-000000000131','30000000-0000-0000-0000-000000000131','50000000-0000-0000-0000-000000000131','tcodexoperador QA bulk sociedade',60,100,100,100,100,'hourly','EUR','draft',true,'manual','00000000-0000-0000-0000-000000000132');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000131',true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
select public.bulk_update_work_entries(array['40000000-0000-0000-0000-000000000131'::uuid],'responsible',to_jsonb('30000000-0000-0000-0000-000000000132'::text),'');
select public.bulk_update_work_entries(array['40000000-0000-0000-0000-000000000131'::uuid],'matter',to_jsonb('70000000-0000-0000-0000-000000000131'::text),'');
select public.bulk_update_work_entries(array['40000000-0000-0000-0000-000000000132'::uuid],'society',to_jsonb('50000000-0000-0000-0000-000000000132'::text),'');
select public.bulk_update_work_entries(array['40000000-0000-0000-0000-000000000132'::uuid],'hourly_rate',to_jsonb(180),'');
select public.bulk_update_work_entries(array['40000000-0000-0000-0000-000000000132'::uuid],'discount',to_jsonb(30),'');
select public.bulk_update_work_entries(array['40000000-0000-0000-0000-000000000132'::uuid],'invoiced',jsonb_build_object('date','2026-08-21'),'');
select public.bulk_update_work_entries(array['40000000-0000-0000-0000-000000000132'::uuid],'paid',to_jsonb('true'::text),'');
select public.bulk_update_work_entries(array['40000000-0000-0000-0000-000000000132'::uuid],'archive',to_jsonb('dossier'::text),'');
reset role;

do $qa$
begin
 if not exists(select 1 from public.work_entries where id='40000000-0000-0000-0000-000000000131' and professional_id='30000000-0000-0000-0000-000000000132' and matter_id='70000000-0000-0000-0000-000000000131' and effective_hourly_rate=400 and effective_amount=400) then raise exception 'FAIL admin responsible and matter repricing'; end if;
 if not exists(select 1 from public.work_entries where id='40000000-0000-0000-0000-000000000132' and billing_entity_id='50000000-0000-0000-0000-000000000132' and effective_hourly_rate=180 and effective_discount_amount=30 and effective_amount=150 and is_invoiced and is_paid and status='paid' and archive_status='dossier' and invoice_date='2026-08-21') then raise exception 'FAIL admin bulk state chain'; end if;
end $qa$;
select id,professional_id,billing_entity_id,effective_hourly_rate,effective_discount_amount,effective_amount,status,is_invoiced,is_paid,archive_status,invoice_date from public.work_entries where id in('40000000-0000-0000-0000-000000000131','40000000-0000-0000-0000-000000000132') order by id;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000132',true);
set local role authenticated;
do $qa$
begin
 begin
  perform public.bulk_update_work_entries(array['40000000-0000-0000-0000-000000000132'::uuid],'society',to_jsonb('50000000-0000-0000-0000-000000000131'::text),'');
  raise exception 'FAIL operator missing reason accepted';
 exception when others then
  if sqlerrm='FAIL operator missing reason accepted' then raise; end if;
  if sqlerrm<>'reason is required' then raise exception 'FAIL wrong operator error: %',sqlerrm; end if;
 end;
 perform public.bulk_update_work_entries(array['40000000-0000-0000-0000-000000000132'::uuid],'society',to_jsonb('50000000-0000-0000-0000-000000000131'::text),'tcodexoperador QA motivo');
end $qa$;
reset role;

do $qa$
begin
 if not exists(select 1 from public.work_entries where id='40000000-0000-0000-0000-000000000132' and billing_entity_id='50000000-0000-0000-0000-000000000131' and effective_hourly_rate=100 and effective_amount=100) then raise exception 'FAIL operator society repricing'; end if;
 if (select count(*) from public.manual_overrides where work_entry_id in('40000000-0000-0000-0000-000000000131','40000000-0000-0000-0000-000000000132'))<7 then raise exception 'FAIL insufficient audit rows'; end if;
end $qa$;
select 'PASS: 12 bulk permission, recalculation, state and audit invariants' as result;

rollback;
