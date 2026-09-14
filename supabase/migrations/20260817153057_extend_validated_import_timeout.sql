-- Large validated workbooks need more than the API role's default statement limit.
-- Scope the exception to the authenticated import entry point only.

alter function public.commit_validated_import(jsonb)
  set statement_timeout = '300s';
