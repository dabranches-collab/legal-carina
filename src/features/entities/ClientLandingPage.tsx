import { useEffect, useState } from 'react'
import { Icon, type IconName } from '../../components/ui/Icon'
import { supabase } from '../../lib/supabase'

type Category='individual'|'company'|'mixed'
type Summary={category:Category;clients:number;movements:number;minutes:number;total:number|null;invoiced:number|null}
const labels:Record<Category,{title:string;description:string;icon:IconName}>={
  individual:{title:'Particulares',description:'Clientes particulares e respectivos movimentos',icon:'clients'},
  company:{title:'Empresas',description:'Clientes empresariais e respectivos movimentos',icon:'building'},
  mixed:{title:'Mistos',description:'Clientes com vertente particular e empresarial',icon:'people'},
}
const money=new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}),number=new Intl.NumberFormat('pt-PT')

export function ClientLandingPage({onSelect}:{onSelect:(category:Category)=>void}){
  const [data,setData]=useState<Summary[]|null>(null),[error,setError]=useState('')
  useEffect(()=>{let active=true;void(async()=>{if(!supabase){setError('Ligação ao Supabase indisponível.');return}const response=await supabase.rpc('get_client_category_summaries');if(!active)return;if(response.error)setError(response.error.message);else setData(Array.isArray(response.data)?response.data as Summary[]:[])})();return()=>{active=false}},[])
  if(error)return <div role="alert" className="card border-danger/30 bg-danger-soft p-6 text-danger">Não foi possível carregar o resumo dos clientes: {error}</div>
  if(!data)return <div role="status" className="grid gap-4 lg:grid-cols-3">{[1,2,3].map(item=><div key={item} className="card h-64 animate-pulse bg-surface-subtle"/>)}</div>
  return <div className="space-y-5"><header><h2 className="font-display text-2xl font-semibold">Clientes</h2><p className="mt-1 text-sm text-text-secondary">Escolha uma área para consultar o dashboard e os movimentos correspondentes.</p></header><div className="grid gap-4 lg:grid-cols-3">{data.map(item=>{const meta=labels[item.category];return <article key={item.category} className="card flex min-h-72 flex-col overflow-hidden"><div className="h-1 bg-gradient-to-r from-secondary via-accent to-secondary"/><div className="flex flex-1 flex-col p-6"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary-soft text-secondary"><Icon name={meta.icon} className="size-6"/></span><div><h3 className="font-display text-xl font-semibold">{meta.title}</h3><p className="mt-1 text-xs text-text-secondary">{meta.description}</p></div></div><dl className="mt-6 grid grid-cols-2 gap-3"><div className="rounded-lg bg-surface-subtle p-3"><dt className="text-xs text-text-secondary">Clientes</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{number.format(item.clients)}</dd></div><div className="rounded-lg bg-surface-subtle p-3"><dt className="text-xs text-text-secondary">Movimentos</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{number.format(item.movements)}</dd></div><div className="rounded-lg bg-surface-subtle p-3"><dt className="text-xs text-text-secondary">Horas</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{number.format(Math.round(item.minutes/60))} h</dd></div><div className="rounded-lg bg-surface-subtle p-3"><dt className="text-xs text-text-secondary">Facturação</dt><dd className="financial-value mt-1 text-lg font-semibold tabular-nums">{item.invoiced==null?'Sem acesso':money.format(item.invoiced)}</dd></div></dl><button type="button" onClick={()=>onSelect(item.category)} className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-surface hover:brightness-110">Entrar em {meta.title}<Icon name="chevron" className="size-4"/></button></div></article>})}</div></div>
}
