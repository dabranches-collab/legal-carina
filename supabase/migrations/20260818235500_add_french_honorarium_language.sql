alter table public.clients
  drop constraint if exists clients_honorarium_language_check;

alter table public.clients
  add constraint clients_honorarium_language_check
  check (honorarium_language in ('pt','en','fr'));
