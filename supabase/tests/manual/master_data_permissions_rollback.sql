begin;

drop policy if exists billing_entities_select_scoped on public.billing_entities;
create policy billing_entities_select_scoped on public.billing_entities for select to authenticated
using ((select private.has_firm_role(firm_id,array['owner','admin','operator'])) or (select private.has_scope_access(firm_id,id,null,null,'view')));
drop policy if exists billing_entities_insert_admin on public.billing_entities;
create policy billing_entities_insert_admin on public.billing_entities for insert to authenticated with check ((select private.has_firm_role(firm_id,array['owner','admin','operator'])));
drop policy if exists billing_entities_update_admin on public.billing_entities;
create policy billing_entities_update_admin on public.billing_entities for update to authenticated using ((select private.has_firm_role(firm_id,array['owner','admin','operator']))) with check ((select private.has_firm_role(firm_id,array['owner','admin','operator'])));
drop policy if exists professionals_insert_admin on public.professionals;
create policy professionals_insert_admin on public.professionals for insert to authenticated with check ((select private.has_firm_role(firm_id,array['owner','admin','operator'])));
drop policy if exists professionals_update_admin on public.professionals;
create policy professionals_update_admin on public.professionals for update to authenticated using ((select private.has_firm_role(firm_id,array['owner','admin','operator']))) with check ((select private.has_firm_role(firm_id,array['owner','admin','operator'])));

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000141','tcodexadministrador-master@example.test'),
 ('00000000-0000-0000-0000-000000000142','tcodexoperador-master@example.test');
insert into public.law_firms(id,name) values
 ('10000000-0000-0000-0000-000000000141','QA master data rollback');
insert into public.firm_members(firm_id,user_id,role) values
 ('10000000-0000-0000-0000-000000000141','00000000-0000-0000-0000-000000000141','admin'),
 ('10000000-0000-0000-0000-000000000141','00000000-0000-0000-0000-000000000142','operator');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000141',true);
select set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
insert into public.clients(id,firm_id,client_code,client_type,display_name) values
 ('20000000-0000-0000-0000-000000000141','10000000-0000-0000-0000-000000000141','01.99141','company','tcodexadministrador cliente');
insert into public.client_profiles(id,firm_id,client_id,client_type,client_code) values
 ('25000000-0000-0000-0000-000000000141','10000000-0000-0000-0000-000000000141','20000000-0000-0000-0000-000000000141','company','01.99141');
insert into public.billing_entities(id,firm_id,name,legal_name) values
 ('50000000-0000-0000-0000-000000000141','10000000-0000-0000-0000-000000000141','tcodexadministrador sociedade','tcodexadministrador sociedade');
insert into public.professionals(id,firm_id,display_name) values
 ('30000000-0000-0000-0000-000000000141','10000000-0000-0000-0000-000000000141','tcodexadministrador responsável');
update public.clients set display_name='tcodexadministrador cliente alterado' where id='20000000-0000-0000-0000-000000000141';
update public.billing_entities set legal_name='tcodexadministrador sociedade alterada' where id='50000000-0000-0000-0000-000000000141';
update public.professionals set display_name='tcodexadministrador responsável alterado' where id='30000000-0000-0000-0000-000000000141';
reset role;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000142',true);
set local role authenticated;
insert into public.clients(id,firm_id,client_code,client_type,display_name) values
 ('20000000-0000-0000-0000-000000000142','10000000-0000-0000-0000-000000000141','02.99142','individual','tcodexoperador cliente');
insert into public.client_profiles(id,firm_id,client_id,client_type,client_code) values
 ('25000000-0000-0000-0000-000000000142','10000000-0000-0000-0000-000000000141','20000000-0000-0000-0000-000000000142','individual','02.99142');
update public.clients set display_name='tcodexoperador cliente alterado' where id='20000000-0000-0000-0000-000000000142';
update public.client_profiles set client_code='02.99143' where id='25000000-0000-0000-0000-000000000142';

insert into public.billing_entities(id,firm_id,name) values
 ('50000000-0000-0000-0000-000000000142','10000000-0000-0000-0000-000000000141','tcodexoperador sociedade criada');
insert into public.professionals(id,firm_id,display_name) values
 ('30000000-0000-0000-0000-000000000142','10000000-0000-0000-0000-000000000141','tcodexoperador responsável criado');
update public.billing_entities set name='tcodexoperador sociedade alterada' where id='50000000-0000-0000-0000-000000000141';
update public.professionals set display_name='tcodexoperador responsável alterado' where id='30000000-0000-0000-0000-000000000141';
reset role;

do $qa$
begin
 if not exists(select 1 from public.clients where id='20000000-0000-0000-0000-000000000141' and display_name='tcodexadministrador cliente alterado') then raise exception 'FAIL admin client write'; end if;
 if not exists(select 1 from public.billing_entities where id='50000000-0000-0000-0000-000000000141' and legal_name='tcodexadministrador sociedade alterada' and name='tcodexoperador sociedade alterada') then raise exception 'FAIL operator society update'; end if;
 if not exists(select 1 from public.professionals where id='30000000-0000-0000-0000-000000000141' and display_name='tcodexoperador responsável alterado') then raise exception 'FAIL operator professional update'; end if;
 if not exists(select 1 from public.billing_entities where id='50000000-0000-0000-0000-000000000142') then raise exception 'FAIL operator society create'; end if;
 if not exists(select 1 from public.professionals where id='30000000-0000-0000-0000-000000000142') then raise exception 'FAIL operator professional create'; end if;
 if not exists(select 1 from public.clients where id='20000000-0000-0000-0000-000000000142' and display_name='tcodexoperador cliente alterado') then raise exception 'FAIL operator client write'; end if;
 if not exists(select 1 from public.client_profiles where id='25000000-0000-0000-0000-000000000142' and client_code='02.99143') then raise exception 'FAIL operator client profile write'; end if;
 raise notice 'PASS: 11 master-data admin/operator permission invariants';
end $qa$;

rollback;
