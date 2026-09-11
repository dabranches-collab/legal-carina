alter table public.clients
  drop constraint if exists clients_default_billing_entity_id_fkey,
  add constraint clients_default_billing_entity_firm_fk
    foreign key (firm_id,default_billing_entity_id)
    references public.billing_entities(firm_id,id)
    on delete set null;
