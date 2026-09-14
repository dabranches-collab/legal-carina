-- Optional client preference copied by the creation form into a new work entry.
-- No backfill or repricing: existing entries retain their agreed amounts.
alter table public.clients
  add column default_hourly_rate numeric(12,2)
  constraint clients_default_hourly_rate_check
  check (default_hourly_rate is null or
    (default_hourly_rate >= 0 and default_hourly_rate < 10000000000));

comment on column public.clients.default_hourly_rate is
  'Optional hourly rate in EUR prefilled for new standard work entries; editable per entry. Existing entries are unchanged.';
