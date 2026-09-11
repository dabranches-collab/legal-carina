alter table public.retainer_charges
  add column if not exists due_on date;

notify pgrst,'reload schema';
