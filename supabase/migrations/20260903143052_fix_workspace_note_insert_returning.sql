-- INSERT ... RETURNING checks SELECT before the STABLE lookup can see the new row.
-- Evaluate authorship from that row; preserve existing access for owners/shares.
alter policy workspace_notes_select on public.workspace_notes
 using (created_by=(select auth.uid()) or private.can_view_workspace_note(id));
