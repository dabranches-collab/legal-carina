create or replace function public.list_visible_invoices()
returns table(id uuid,invoice_number text,invoice_date date,status text,total numeric,paid_total numeric,client_name text,billing_entity_name text)
language sql stable security definer set search_path=''
as $$ select i.id,i.invoice_number,i.invoice_date,i.status,
 private.visible_financial_value(i.firm_id,i.billing_entity_id,i.total),
 private.visible_financial_value(i.firm_id,i.billing_entity_id,i.paid_total),c.display_name,b.name
 from public.invoices i join public.clients c on c.id=i.client_id join public.billing_entities b on b.id=i.billing_entity_id
 where private.has_scope_access(i.firm_id,i.billing_entity_id,i.client_id,null,'view') order by i.invoice_date desc;$$;

create or replace function public.list_visible_payments()
returns table(id uuid,payment_date date,amount numeric,payment_method text,reference text,notes text,invoice_number text,billing_entity_name text)
language sql stable security definer set search_path=''
as $$ select p.id,p.payment_date,private.visible_financial_value(i.firm_id,i.billing_entity_id,p.amount),p.payment_method,p.reference,p.notes,i.invoice_number,b.name
 from public.payments p join public.invoices i on i.id=p.invoice_id join public.billing_entities b on b.id=i.billing_entity_id
 where private.has_scope_access(i.firm_id,i.billing_entity_id,i.client_id,null,'view') order by p.payment_date desc;$$;

create or replace function public.list_visible_rate_rules()
returns table(id uuid,name text,charge_type text,hourly_rate numeric,fixed_amount numeric,valid_from date,valid_until date,priority integer,active boolean,billing_entity_name text)
language sql stable security definer set search_path=''
as $$ select r.id,r.name,r.charge_type,
 private.visible_financial_value(r.firm_id,r.billing_entity_id,r.hourly_rate),
 private.visible_financial_value(r.firm_id,r.billing_entity_id,r.fixed_amount),r.valid_from,r.valid_until,r.priority,r.active,b.name
 from public.rate_rules r left join public.billing_entities b on b.id=r.billing_entity_id
 where private.has_scope_access(r.firm_id,r.billing_entity_id,r.client_id,r.matter_id,'view') order by r.valid_from desc;$$;

revoke select on public.invoices,public.payments,public.invoice_lines,public.rate_rules from authenticated;
revoke all on function public.list_visible_invoices() from public,anon;
revoke all on function public.list_visible_payments() from public,anon;
revoke all on function public.list_visible_rate_rules() from public,anon;
grant execute on function public.list_visible_invoices() to authenticated;
grant execute on function public.list_visible_payments() to authenticated;
grant execute on function public.list_visible_rate_rules() to authenticated;
