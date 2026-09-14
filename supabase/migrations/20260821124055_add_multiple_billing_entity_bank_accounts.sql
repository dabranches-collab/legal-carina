alter table public.billing_entities
  add column if not exists bank_accounts jsonb not null default '[]'::jsonb;

alter table public.billing_entities
  drop constraint if exists billing_entities_bank_accounts_array;

alter table public.billing_entities
  add constraint billing_entities_bank_accounts_array
  check (jsonb_typeof(bank_accounts) = 'array');

update public.billing_entities
set bank_accounts = jsonb_build_array(jsonb_build_object(
  'account_holder', coalesce(bank_account_holder, ''),
  'bank_name', coalesce(bank_name, ''),
  'account_number', coalesce(bank_account_number, ''),
  'iban', coalesce(iban, ''),
  'bic_swift', coalesce(bic_swift, ''),
  'currency', coalesce(default_currency, 'EUR')
))
where bank_accounts = '[]'::jsonb
  and nullif(btrim(coalesce(iban, '')), '') is not null;

comment on column public.billing_entities.bank_accounts is
  'Lista ordenada de contas bancárias. A primeira é a principal e mantém-se espelhada nas colunas bancárias legadas para compatibilidade documental.';
