begin;
select plan(13);

select has_table('public','client_documents','client_documents metadata table exists');
select row_security_active('public','client_documents','RLS is active for client documents');
select has_column('public','client_documents','client_id','documents belong to a client');
select has_column('public','client_documents','storage_path','storage path is versioned as metadata');
select has_column('public','client_documents','sha256','content hash can be preserved');
select policies_are('public','client_documents',array['client_documents_select_scoped'],'browser metadata writes are blocked');
select ok((select not public from storage.buckets where id='client-documents'),'client-documents bucket is private');
select ok((select file_size_limit=20971520 from storage.buckets where id='client-documents'),'bucket enforces the 20 MB limit');
select has_policy('storage','objects','client_documents_storage_select','authorised reads use an explicit Storage policy');
select has_function('public','can_manage_client_document',array['uuid','uuid'],'authorisation probe exists');
select function_privs_are('public','can_manage_client_document',array['uuid','uuid'],'authenticated',array['EXECUTE'],'only authenticated users can invoke the authorisation probe');
select has_function('public','can_manage_client_document_record',array['uuid'],'record authorisation probe exists');
select function_privs_are('public','can_manage_client_document_record',array['uuid'],'authenticated',array['EXECUTE'],'only authenticated users can invoke the record authorisation probe');

select * from finish();
rollback;
