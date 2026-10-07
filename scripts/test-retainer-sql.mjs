import fs from 'node:fs'
import assert from 'node:assert/strict'
import {PGlite} from '@electric-sql/pglite'
const db=new PGlite(),sql=s=>db.exec(s)
const row=async id=>(await db.query('select * from work_entries where id=$1',[id])).rows[0]
const firm='00000000-0000-4000-8000-000000000001',client='00000000-0000-4000-8000-000000000002',society='00000000-0000-4000-8000-000000000003',terms='00000000-0000-4000-8000-000000000004'
await sql(`create schema private;create role anon;create role authenticated;
create table client_retainers(id uuid primary key,firm_id uuid,client_id uuid,billing_entity_id uuid,active boolean default true,monthly_amount numeric default 0,currency text default 'EUR',starts_on date,ends_on date,included_hours numeric,hours_interval_months int default 12);
create table work_entries(id uuid primary key default gen_random_uuid(),firm_id uuid,client_id uuid,billing_entity_id uuid,work_date date,created_at timestamptz default now(),duration_minutes int,status text default 'draft',billing_scope text default 'retainer',is_invoiced boolean default false,is_paid boolean default false,is_billable boolean default false,charge_type text,effective_amount numeric,effective_hourly_rate numeric,calculated_hourly_rate numeric,specific_hourly_rate numeric,imported_hourly_rate numeric,pricing_rule_id uuid,calculated_amount numeric,pre_discount_amount numeric,imported_amount numeric,manual_amount numeric,effective_discount_amount numeric,calculated_discount_amount numeric,discount_percentage numeric,discount_reason text,currency text default 'EUR',has_manual_override boolean default false,last_calculated_at timestamptz,invoice_date date,has_historical_state_exception boolean default false);
create function private.current_payment_notes()returns setof jsonb language sql stable as $$select '{}'::jsonb where false$$;
create function get_client_retainer_summary(uuid)returns jsonb language sql stable as $$select jsonb_build_object('minutes',sum(duration_minutes))from work_entries where client_id=$1 and billing_scope='retainer'$$;
create function get_retainer_management()returns jsonb language sql stable as $$select jsonb_agg(to_jsonb(w))from work_entries w where w.billing_scope='retainer'$$;
`)
await sql(fs.readFileSync(new URL('../supabase/migrations/20261007163200_add_retainer_extra_hours.sql',import.meta.url),'utf8'))
// Existing enforcement trigger is included to catch ordering/normalisation errors.
await sql('create trigger zz_enforce_work_entry_billing_scope before insert or update on work_entries for each row execute function private.enforce_work_entry_billing_scope();')
await sql(`insert into client_retainers(id,firm_id,client_id,billing_entity_id,starts_on,included_hours,hours_interval_months,billing_mode,excess_hourly_rate)values('${terms}','${firm}','${client}','${society}','2026-01-01',32,12,'retainer_plus_hours',150)`)
let checks=0
const check=async(label,fn)=>{await fn();checks++;console.log('PASS '+label)}
await check('actual legacy guard matches SQL NULL with a JSON null override',async()=>{
 await sql('create table manual_overrides(work_entry_id uuid,field_name text,override_value jsonb,reverted_at timestamptz,created_at timestamptz default transaction_timestamp());');
 const source=fs.readFileSync(new URL('../supabase/migrations/20261007163156_simplify_work_entry_corrections.sql',import.meta.url),'utf8');
 await sql(source.match(/CREATE OR REPLACE FUNCTION private\.has_current_override[\s\S]*?\$function\$;/)[0]);
 await sql(`begin;insert into manual_overrides(work_entry_id,field_name,override_value)values('${terms}','effective_amount','null'::jsonb);`);
 assert.equal((await db.query(`select private.has_current_override('${terms}','effective_amount',null) matches`)).rows[0].matches,true);
 await sql('rollback');
})
const work=async(date,minutes)=>(await db.query(`insert into work_entries(firm_id,client_id,billing_entity_id,work_date,duration_minutes)values($1,$2,$3,$4,$5)returning id`,[firm,client,society,date,minutes])).rows[0].id
const first=await work('2026-01-02',1905),second=await work('2026-10-07',60)
await check('actual SQL: annual boundary bills only 45 minutes',async()=>{const r=await row(second);assert.equal(Number(r.retainer_covered_minutes),15);assert.equal(Number(r.retainer_excess_minutes),45);assert.equal(Number(r.effective_amount),112.5);assert.equal(r.duration_minutes,60);assert.equal(r.billing_scope,'standard')})
await check('actual SQL: correction redistributes unbilled annual consumption',async()=>{await db.query('update work_entries set duration_minutes=1875 where id=$1',[first]);assert.equal(Number((await row(second)).effective_amount),37.5)})
await check('actual SQL: renewal resets quota',async()=>{const next=await work('2027-01-02',60);assert.equal((await row(next)).effective_amount,null)})
await check('actual SQL: cancellation releases included hours',async()=>{await db.query("update work_entries set status='cancelled' where id=$1",[first]);assert.equal((await row(first)).status,'cancelled');assert.equal((await row(second)).effective_amount,null)})
await check('actual SQL: consumption cannot be edited directly',async()=>{await assert.rejects(db.query('update work_entries set retainer_excess_minutes=999 where id=$1',[second]),/calculado automaticamente/)})
await check('actual SQL: invalid mode lacks required quota or hourly rate',async()=>{await assert.rejects(sql(`update client_retainers set excess_hourly_rate=null where id='${terms}'`),/retainer_extra_hours_terms/)})
await check('actual SQL: simple retainer clears unbilled extra charges',async()=>{await sql(`update client_retainers set billing_mode='retainer' where id='${terms}'`);assert.equal((await row(second)).retainer_id,null);assert.equal((await row(second)).effective_amount,null)})
await check('actual SQL: private functions have no authenticated execution',async()=>{await assert.rejects(sql(`set role authenticated;select private.reprice_retainer_work('${terms}');`),/permission denied/);await sql('reset role')})
console.log(checks+' retainer SQL checks passed. Minimal synthetic schema; full Auth/RLS and concurrency separately tested in PostgreSQL.')
await db.close()
