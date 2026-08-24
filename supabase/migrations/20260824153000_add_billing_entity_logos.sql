alter table public.billing_entities
  add column if not exists logo_path text;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('billing-entity-logos','billing-entity-logos',false,2097152,array['image/png'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists billing_entity_logos_select on storage.objects;
create policy billing_entity_logos_select on storage.objects for select to authenticated using (
  bucket_id='billing-entity-logos' and exists (
    select 1 from public.billing_entities b
    where b.firm_id=private.storage_path_uuid(name,1) and b.id=private.storage_path_uuid(name,2)
      and (private.has_firm_role(b.firm_id,array['owner','admin','operator']) or private.has_scope_access(b.firm_id,b.id,null,null,'view'))
  )
);
drop policy if exists billing_entity_logos_insert on storage.objects;
create policy billing_entity_logos_insert on storage.objects for insert to authenticated with check (
  bucket_id='billing-entity-logos' and exists (
    select 1 from public.billing_entities b
    where b.firm_id=private.storage_path_uuid(name,1) and b.id=private.storage_path_uuid(name,2)
      and (private.has_firm_role(b.firm_id,array['owner','admin','operator']) or private.has_scope_access(b.firm_id,b.id,null,null,'edit'))
  )
);
drop policy if exists billing_entity_logos_update on storage.objects;
create policy billing_entity_logos_update on storage.objects for update to authenticated using (bucket_id='billing-entity-logos') with check (
  bucket_id='billing-entity-logos' and exists (
    select 1 from public.billing_entities b
    where b.firm_id=private.storage_path_uuid(name,1) and b.id=private.storage_path_uuid(name,2)
      and (private.has_firm_role(b.firm_id,array['owner','admin','operator']) or private.has_scope_access(b.firm_id,b.id,null,null,'edit'))
  )
);
drop policy if exists billing_entity_logos_delete on storage.objects;
create policy billing_entity_logos_delete on storage.objects for delete to authenticated using (
  bucket_id='billing-entity-logos' and exists (
    select 1 from public.billing_entities b
    where b.firm_id=private.storage_path_uuid(name,1) and b.id=private.storage_path_uuid(name,2)
      and (private.has_firm_role(b.firm_id,array['owner','admin','operator']) or private.has_scope_access(b.firm_id,b.id,null,null,'edit'))
  )
);

comment on column public.billing_entities.logo_path is 'Caminho privado do logótipo PNG recortado usado nos documentos emitidos pela Sociedade.';
