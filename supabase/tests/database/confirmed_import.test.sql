begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

select has_function('public','analyze_import_candidates',array['jsonb'],'server import preflight exists');
select has_function('public','commit_validated_import',array['jsonb'],'transactional import endpoint exists');
select ok(has_function_privilege('authenticated','public.analyze_import_candidates(jsonb)','EXECUTE'),'authenticated can run controlled preflight');
select ok(not has_function_privilege('anon','public.analyze_import_candidates(jsonb)','EXECUTE'),'anonymous users cannot run preflight');
select ok(not exists(select 1 from information_schema.routine_privileges where routine_schema='public' and routine_name='analyze_import_candidates' and grantee='PUBLIC' and privilege_type='EXECUTE'),'PUBLIC cannot run preflight');
select ok(has_function_privilege('authenticated','public.commit_validated_import(jsonb)','EXECUTE'),'authenticated can call the role-protected commit endpoint');
select ok(not has_function_privilege('anon','public.commit_validated_import(jsonb)','EXECUTE'),'anonymous users cannot commit imports');
select ok(not exists(select 1 from information_schema.routine_privileges where routine_schema='public' and routine_name='commit_validated_import' and grantee='PUBLIC' and privilege_type='EXECUTE'),'PUBLIC cannot commit imports');
select has_column('public','imports','file_hash','batch preserves original file hash');
select has_column('public','import_rows','raw_data','row preserves original cell values');
select has_column('public','import_rows','normalized_data','row preserves normalized values separately');
select has_column('public','import_rows','row_hash','row has a duplicate-detection hash');
select has_column('public','work_entries','imported_amount','movement preserves imported amount');
select has_column('public','work_entries','calculated_amount','movement preserves calculated amount separately');
select policies_are('public','imports',array['imports_select_admin'],'import batches expose only the administrative read policy');
select policies_are('public','import_rows',array['import_rows_select_admin'],'raw import rows expose only the administrative read policy');
select ok(not has_table_privilege('authenticated','public.imports','INSERT'),'frontend cannot insert import batches directly');
select ok(not has_table_privilege('authenticated','public.imports','UPDATE'),'frontend cannot update import batches directly');
select ok(not has_table_privilege('authenticated','public.import_rows','INSERT'),'frontend cannot insert raw import rows directly');
select ok(not has_table_privilege('authenticated','public.import_rows','UPDATE'),'frontend cannot update raw import rows directly');

select * from finish();
rollback;
