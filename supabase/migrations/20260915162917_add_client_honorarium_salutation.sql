alter table public.clients
  add column if not exists honorarium_salutation text;

alter table public.clients
  drop constraint if exists clients_honorarium_salutation_check;

alter table public.clients
  add constraint clients_honorarium_salutation_check
  check (
    honorarium_salutation is null
    or honorarium_salutation in (
      'exmo_senhor',
      'exma_senhora',
      'exmos_senhores',
      'exmas_senhoras'
    )
  );

comment on column public.clients.honorarium_salutation is
  'Forma de tratamento formal usada nas Notas de Honorários, cobranças e restantes documentos do cliente.';
