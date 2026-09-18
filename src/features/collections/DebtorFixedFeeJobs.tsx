import { useEffect,useState } from 'react'
import { supabase } from '../../lib/supabase'
import { openClientRecord } from '../master-data/openClientRecord'

type Job={id:string;title:string;agreed_amount:number;invoice_date:string|null;created_at:string;is_invoiced:boolean}
const money=new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'})
export function DebtorFixedFeeJobs({clientId,status}:{clientId:string;status:'invoiced'|'pending'}){
 const [jobs,setJobs]=useState<Job[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 useEffect(()=>{if(!supabase)return;let active=true;setLoading(true);void supabase.from('fixed_fee_jobs').select('id,title,agreed_amount,invoice_date,created_at,is_invoiced').eq('client_id',clientId).eq('is_invoiced',status==='invoiced').eq('is_paid',false).neq('status','cancelled').order('created_at',{ascending:true}).then(result=>{if(!active)return;setLoading(false);if(result.error)setError(result.error.message);else setJobs((result.data??[]) as Job[])});return()=>{active=false}},[clientId,status])
 return <div className="space-y-3"><p className="text-sm text-text-secondary">O valor é cobrado uma vez por trabalho. As tarefas associadas mostram a repartição analítica das horas na ficha.</p>{loading&&<p role="status">A carregar trabalhos…</p>}{error&&<p role="alert" className="text-danger">{error}</p>}{jobs.map(job=><article key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div><h4 className="font-semibold">{job.title}</h4><p className="text-xs text-text-secondary">{job.is_invoiced?`Facturado em ${job.invoice_date??'—'}`:'Por facturar'} · criado em {job.created_at.slice(0,10)}</p></div><strong className="financial-value">{money.format(job.agreed_amount)}</strong><button type="button" className="control min-h-10 px-3 text-sm" onClick={()=>openClientRecord(clientId,'fixedFees')}>Abrir e editar trabalho</button></article>)}{!loading&&!error&&!jobs.length&&<p className="text-sm text-text-secondary">Não há trabalhos nesta situação.</p>}</div>
}
