-- Import source inconsistencies for review without weakening manually created records.

alter table public.work_entries
  add column has_historical_state_exception boolean not null default false;

alter table public.work_entries
  drop constraint if exists work_entries_check,
  drop constraint if exists work_entries_check1;

alter table public.work_entries
  add constraint work_entries_paid_requires_invoiced_check
    check (
      not is_paid
      or is_invoiced
      or (has_historical_state_exception and source_type in ('xlsx', 'csv') and import_row_id is not null)
    ),
  add constraint work_entries_invoiced_requires_date_check
    check (
      not is_invoiced
      or invoice_date is not null
      or (has_historical_state_exception and source_type in ('xlsx', 'csv') and import_row_id is not null)
    ),
  add constraint work_entries_historical_exception_scope_check
    check (
      not has_historical_state_exception
      or (source_type in ('xlsx', 'csv') and import_row_id is not null)
    );

comment on constraint work_entries_paid_requires_invoiced_check on public.work_entries is
  'Paid normally requires invoiced; only an explicitly flagged and traceable imported row may enter the review queue with contradictory source flags.';

comment on constraint work_entries_invoiced_requires_date_check on public.work_entries is
  'Invoiced normally requires a date; only an explicitly flagged and traceable imported row may enter the review queue without one.';

comment on column public.work_entries.has_historical_state_exception is
  'True when an audited import preserves source billing flags that require human review.';
