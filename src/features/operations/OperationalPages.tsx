import { useCallback, useEffect, useMemo, useState } from 'react'
import { StandardDataTable, type TableColumn } from '../../components/table/StandardDataTable'
import { supabase } from '../../lib/supabase'

type DataRow=Record<string,unknown>&{id:string}
const money=new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'})
const date=(value:unknown)=>value?new Date(`${String(value).slice(0,10)}T00:00:00`).toLocaleDateString('pt-PT'):'—'
const text=(value:unknown)=>String(value??'—')
const relation=(value:unknown,key:string)=>value&&typeof value==='object'?text((value as Record<string,unknown>)[key]):'—'

function Financial({value}:{value:unknown}){return <span className="financial-value font-semibold tabular-nums">{value==null?'Sem acesso':money.format(Number(value))}</span>}

function useRows(table:string,select:string,order:string,rpc?:string){
 const [rows,setRows]=useState<DataRow[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=useCallback(async()=>{if(!supabase)return;setLoading(true);setError('');const result=rpc?await supabase.rpc(rpc):await supabase.from(table).select(select).order(order,{ascending:false}).limit(1000);if(result.error)setError(result.error.message);else setRows((result.data??[]) as unknown as DataRow[]);setLoading(false)},[table,select,order,rpc])
 useEffect(()=>{void load()},[load]);return {rows,loading,error,load}
}

function Page({title,description,table,select,order,columns,rpc}:{title:string;description:string;table:string;select:string;order:string;columns:TableColumn<DataRow>[];rpc?:string}){
 const {rows,loading,error,load}=useRows(table,select,order,rpc)
 return <div className="space-y-4"><section className="card p-5"><h2 className="font-display text-2xl font-semibold">{title}</h2><p className="mt-1 text-sm text-text-secondary">{description}</p></section><StandardDataTable id={table} label={title} rows={rows} columns={columns} rowKey={row=>row.id} loading={loading} error={error} onRetry={()=>void load()} emptyMessage={`Ainda não existem registos em ${title.toLocaleLowerCase('pt-PT')}.`}/></div>
}

export function MattersPage(){const columns=useMemo<TableColumn<DataRow>[]>(()=>[
 {id:'code',label:'Código',value:r=>text(r.matter_code),essential:true,sticky:true},{id:'title',label:'Processo',value:r=>text(r.title),essential:true},{id:'client',label:'Cliente',value:r=>relation(r.clients,'display_name')},{id:'responsible',label:'Responsável',value:r=>relation(r.professionals,'display_name')},{id:'society',label:'Sociedade',value:r=>relation(r.billing_entities,'name')},{id:'status',label:'Estado',filterOptions:['open','on_hold','closed','archived'].map(value=>({value,label:value})),value:r=>text(r.status)},{id:'opened',label:'Abertura',value:r=>text(r.opened_at),kind:'date',render:r=>date(r.opened_at)},{id:'updated',label:'Actualizado',value:r=>text(r.updated_at),kind:'date',render:r=>new Date(text(r.updated_at)).toLocaleString('pt-PT')},
],[]);return <Page title="Processos" description="Processos reais, cliente, Responsável pela facturação, Sociedade e estado." table="matters" select="id,matter_code,title,status,opened_at,updated_at,clients(display_name),professionals(display_name),billing_entities(name)" order="updated_at" columns={columns}/>}

export function InvoicesPage(){const columns=useMemo<TableColumn<DataRow>[]>(()=>[
 {id:'number',label:'Factura',value:r=>text(r.invoice_number),essential:true,sticky:true},{id:'date',label:'Data',value:r=>text(r.invoice_date),kind:'date',render:r=>date(r.invoice_date)},{id:'client',label:'Cliente',value:r=>text(r.client_name)},{id:'society',label:'Sociedade',value:r=>text(r.billing_entity_name)},{id:'status',label:'Estado',filterOptions:['draft','issued','partially_paid','paid','overdue','cancelled'].map(value=>({value,label:value})),value:r=>text(r.status)},{id:'total',label:'Total',value:r=>r.total==null?null:Number(r.total),kind:'money',align:'right',render:r=><Financial value={r.total}/>},{id:'paid',label:'Recebido',value:r=>r.paid_total==null?null:Number(r.paid_total),kind:'money',align:'right',render:r=><Financial value={r.paid_total}/>},
],[]);return <Page title="Facturação" description="Facturas internas e respectivos estados; não corresponde a facturação certificada." table="invoices" rpc="list_visible_invoices" select="" order="invoice_date" columns={columns}/>}

export function PaymentsPage(){const columns=useMemo<TableColumn<DataRow>[]>(()=>[
 {id:'date',label:'Data',value:r=>text(r.payment_date),essential:true,sticky:true,kind:'date',render:r=>date(r.payment_date)},{id:'invoice',label:'Factura',value:r=>text(r.invoice_number)},{id:'society',label:'Sociedade',value:r=>text(r.billing_entity_name)},{id:'amount',label:'Valor recebido',value:r=>r.amount==null?null:Number(r.amount),kind:'money',align:'right',render:r=><Financial value={r.amount}/>},{id:'method',label:'Meio',value:r=>text(r.payment_method)},{id:'reference',label:'Referência',value:r=>text(r.reference)},{id:'notes',label:'Observações',value:r=>text(r.notes)},
],[]);return <Page title="Recebimentos" description="Pagamentos registados e ligação à facturação interna." table="payments" rpc="list_visible_payments" select="" order="payment_date" columns={columns}/>}

export function PricingPage(){const columns=useMemo<TableColumn<DataRow>[]>(()=>[
 {id:'name',label:'Regra',value:r=>text(r.name),essential:true,sticky:true},{id:'type',label:'Cobrança',filterOptions:['hourly','fixed','retainer','hour_package','per_act','free','non_billable','manual_negotiated'].map(value=>({value,label:value})),value:r=>text(r.charge_type)},{id:'society',label:'Sociedade',value:r=>text(r.billing_entity_name)},{id:'rate',label:'Preço/hora',value:r=>r.hourly_rate==null?null:Number(r.hourly_rate),kind:'money',align:'right',render:r=><Financial value={r.hourly_rate}/>},{id:'fixed',label:'Valor fixo',value:r=>r.fixed_amount==null?null:Number(r.fixed_amount),kind:'money',align:'right',render:r=><Financial value={r.fixed_amount}/>},{id:'from',label:'Início',value:r=>text(r.valid_from),kind:'date',render:r=>date(r.valid_from)},{id:'until',label:'Fim',value:r=>text(r.valid_until),kind:'date',render:r=>date(r.valid_until)},{id:'priority',label:'Prioridade',value:r=>Number(r.priority??0),kind:'number',align:'right'},{id:'active',label:'Activa',value:r=>Boolean(r.active),kind:'boolean',render:r=>r.active?'Sim':'Não'},
],[]);return <Page title="Regras de preços" description="Hierarquia, vigências e valores das regras comerciais existentes." table="rate_rules" rpc="list_visible_rate_rules" select="" order="valid_from" columns={columns}/>}

export function AuditPage(){const columns=useMemo<TableColumn<DataRow>[]>(()=>[
 {id:'date',label:'Data e hora',value:r=>text(r.created_at),essential:true,sticky:true,kind:'date',render:r=>new Date(text(r.created_at)).toLocaleString('pt-PT')},{id:'action',label:'Acção',value:r=>text(r.action)},{id:'entity',label:'Entidade',value:r=>text(r.entity_type)},{id:'entityId',label:'Identificador',value:r=>text(r.entity_id)},{id:'actor',label:'Utilizador',value:r=>text(r.actor_user_id)},{id:'before',label:'Antes',value:r=>JSON.stringify(r.previous_data??''),render:r=><code className="block max-w-72 truncate text-xs">{JSON.stringify(r.previous_data??'—')}</code>},{id:'after',label:'Depois',value:r=>JSON.stringify(r.new_data??''),render:r=><code className="block max-w-72 truncate text-xs">{JSON.stringify(r.new_data??'—')}</code>},
],[]);return <Page title="Auditoria" description="Registo imutável de criações e alterações com utilizador, data e hora." table="audit_log" select="id,created_at,action,entity_type,entity_id,actor_user_id,previous_data,new_data" order="created_at" columns={columns}/>}

export function ReportsPage(){return <div className="space-y-4"><section className="card p-5"><h2 className="font-display text-2xl font-semibold">Relatórios</h2><p className="mt-1 text-sm text-text-secondary">Os dashboards e tabelas permitem pesquisa, filtragem, impressão/PDF e exportação XLSX dos dados autorizados.</p></section><div className="grid gap-4 sm:grid-cols-2"><article className="card p-5"><h3 className="font-semibold">Relatório operacional</h3><p className="mt-2 text-sm text-text-secondary">Utilize Registos de trabalho para filtrar e exportar movimentos.</p></article><article className="card p-5"><h3 className="font-semibold">Relatório financeiro</h3><p className="mt-2 text-sm text-text-secondary">Utilize Facturação e Recebimentos; os valores respeitam as permissões por Sociedade.</p></article></div></div>}
