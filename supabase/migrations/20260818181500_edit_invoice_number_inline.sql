-- Permite editar o número da factura a partir da linha do movimento.
-- Uma factura existente é actualizada; quando ainda não há factura, cria ou
-- reutiliza a factura compatível e associa-lhe o movimento.
create or replace function public.update_work_entry_invoice_number(
  p_work_entry_id uuid,
  p_invoice_number text
)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  entry public.work_entries%rowtype;
  target_invoice public.invoices%rowtype;
  clean_number text := nullif(btrim(coalesce(p_invoice_number, '')), '');
  line_amount numeric(14,2);
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into entry
  from public.work_entries
  where id = p_work_entry_id
  for update;

  if entry.id is null then raise exception 'work entry not found'; end if;
  if not private.has_scope_access(entry.firm_id, entry.billing_entity_id, entry.client_id, entry.matter_id, 'edit') then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if clean_number is null then raise exception 'invoice number is required'; end if;
  if entry.billing_entity_id is null then raise exception 'select a society before assigning an invoice number'; end if;
  if entry.invoice_date is null then raise exception 'enter the invoice date before assigning an invoice number'; end if;

  select i.* into target_invoice
  from public.invoice_lines il
  join public.invoices i on i.id = il.invoice_id and i.firm_id = il.firm_id
  where il.work_entry_id = entry.id
  order by i.invoice_date desc, i.id
  limit 1
  for update of i;

  if target_invoice.id is not null then
    update public.invoices
    set invoice_number = clean_number, updated_at = now()
    where id = target_invoice.id;
    return;
  end if;

  select * into target_invoice
  from public.invoices
  where firm_id = entry.firm_id
    and billing_entity_id = entry.billing_entity_id
    and invoice_number = clean_number
  for update;

  if target_invoice.id is not null and target_invoice.client_id <> entry.client_id then
    raise exception 'invoice number already belongs to another client';
  end if;

  line_amount := greatest(coalesce(entry.effective_amount, 0), 0);
  if target_invoice.id is null then
    insert into public.invoices(
      firm_id, billing_entity_id, client_id, invoice_number, invoice_date,
      status, subtotal, total, paid_total, currency
    ) values (
      entry.firm_id, entry.billing_entity_id, entry.client_id, clean_number, entry.invoice_date,
      case when entry.is_paid then 'paid' when entry.is_invoiced then 'issued' else 'draft' end,
      line_amount, line_amount, case when entry.is_paid then line_amount else 0 end, 'EUR'
    ) returning * into target_invoice;
  end if;

  insert into public.invoice_lines(
    firm_id, invoice_id, work_entry_id, description, quantity, unit_price, line_total
  ) values (
    entry.firm_id, target_invoice.id, entry.id, entry.activity_description, 1, line_amount, line_amount
  ) on conflict do nothing;

  update public.invoices i
  set subtotal = totals.amount,
      total = totals.amount,
      paid_total = case when entry.is_paid then totals.amount else least(i.paid_total, totals.amount) end,
      updated_at = now()
  from (
    select coalesce(sum(line_total), 0)::numeric(14,2) amount
    from public.invoice_lines
    where invoice_id = target_invoice.id
  ) totals
  where i.id = target_invoice.id;
end;
$$;

revoke all on function public.update_work_entry_invoice_number(uuid,text) from public, anon;
grant execute on function public.update_work_entry_invoice_number(uuid,text) to authenticated;
notify pgrst, 'reload schema';
