-- Execute inside BEGIN / ROLLBACK. No real notes, users or shares are retained.
do $audit$
declare author_id uuid:=gen_random_uuid(); reader_id uuid:=gen_random_uuid(); outsider_id uuid:=gen_random_uuid(); firm uuid:=gen_random_uuid(); audit_note uuid; rows_changed integer;
begin
 insert into auth.users(id,email) select id,id::text||'@example.test' from unnest(array[author_id,reader_id,outsider_id]) id;
 insert into public.law_firms(id,name) values(firm,'Synthetic workspace note audit');
 insert into public.firm_members(firm_id,user_id,role) select firm,id,'operator' from unnest(array[author_id,reader_id,outsider_id]) id;
 perform set_config('request.jwt.claim.sub',author_id::text,true);execute 'set local role authenticated';
 insert into public.workspace_notes(firm_id,title,created_by) values(firm,'Synthetic shared note',author_id) returning id into audit_note;
 if audit_note is null then raise exception 'Insert returning failed';end if;
 insert into public.workspace_note_items(firm_id,note_id,content) values(firm,audit_note,'Synthetic checklist');
 insert into public.workspace_note_shares(firm_id,note_id,user_id,permission) values(firm,audit_note,reader_id,'view');
 perform set_config('request.jwt.claim.sub',reader_id::text,true);
 if not exists(select 1 from public.workspace_notes n where n.id=audit_note) then raise exception 'Shared reader cannot read';end if;
 update public.workspace_notes n set title='Denied edit' where n.id=audit_note;
 get diagnostics rows_changed=row_count;if rows_changed<>0 then raise exception 'Reader edited note';end if;
 perform set_config('request.jwt.claim.sub',outsider_id::text,true);
 if exists(select 1 from public.workspace_notes n where n.id=audit_note) then raise exception 'Unshared user can read';end if;
 perform set_config('request.jwt.claim.sub',author_id::text,true);
 update public.workspace_note_shares s set permission='edit' where s.note_id=audit_note and s.user_id=reader_id;
 perform set_config('request.jwt.claim.sub',reader_id::text,true);
 update public.workspace_notes n set title='Shared editor correction' where n.id=audit_note;
 get diagnostics rows_changed=row_count;if rows_changed<>1 then raise exception 'Shared editor cannot edit';end if;
 begin
  insert into public.workspace_note_shares(firm_id,note_id,user_id,permission) values(firm,audit_note,outsider_id,'edit');
  raise exception 'Shared editor changed permissions';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.workspace_notes(firm_id,title,created_by) values(firm,'Spoofed author',author_id);
  raise exception 'Author spoofing accepted';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
end;$audit$;
select 'PASS: operator creates and shares; reader and editor scopes, private notes and author identity preserved' as result;
