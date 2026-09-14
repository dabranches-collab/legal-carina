alter table public.clients
  add column if not exists honorarium_language text not null default 'pt' check (honorarium_language in ('pt','en')),
  add column if not exists honorarium_delivery_method text not null default 'email' check (honorarium_delivery_method in ('email','post','hand')),
  add column if not exists honorarium_recipient_name text,
  add column if not exists default_billing_entity_id uuid references public.billing_entities(id) on delete set null;

alter table public.billing_entities
  add column if not exists bank_account_holder text,
  add column if not exists bank_name text,
  add column if not exists bank_account_number text,
  add column if not exists iban text,
  add column if not exists bic_swift text,
  add column if not exists default_vat_rate numeric(5,2) not null default 23 check (default_vat_rate between 0 and 100),
  add column if not exists default_currency text not null default 'EUR' check (default_currency ~ '^[A-Z]{3}$');

create index if not exists clients_default_billing_entity_id_idx on public.clients(default_billing_entity_id) where default_billing_entity_id is not null;
