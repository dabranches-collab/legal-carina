-- Manual overrides are immutable evidence. They can only be created by the
-- controlled pricing RPC, which validates scope, financial visibility and a
-- mandatory reason.
drop policy if exists manual_overrides_insert_privileged on public.manual_overrides;
drop policy if exists manual_overrides_update_privileged on public.manual_overrides;
revoke insert,update,delete,truncate on public.manual_overrides
  from authenticated,anon;

