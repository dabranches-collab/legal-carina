import { useCallback,useEffect,useState } from 'react'
import { LoginActivityTable } from './AdminTables'
import { supabase } from '../../lib/supabase'

type LoginGroup={userId:string;username:string;displayName:string;firstAt:string;lastAt:string;count:number;events:string[]}

export function AccessLogsPage(){
 const [rows,setRows]=useState<LoginGroup[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
 const load=useCallback(async()=>{
  setLoading(true);setError('')
  if(!supabase){setError('Ligação ao Supabase indisponível.');setLoading(false);return}
  const membership=await supabase.from('firm_members').select('firm_id,role').eq('active',true).in('role',['owner']).limit(1).maybeSingle()
  if(membership.error||!membership.data){setError('Apenas o proprietário pode consultar o histórico de acessos.');setLoading(false);return}
  const result=await supabase.functions.invoke('admin-users',{body:{action:'list_login_activity',firmId:membership.data.firm_id}})
  if(result.error||result.data?.error)setError(result.data?.error??result.error?.message??'Não foi possível carregar o histórico de acessos.')
  else setRows(result.data?.groups??[])
  setLoading(false)
 },[])
 useEffect(()=>{void load()},[load])
 return <section className="card p-4" aria-labelledby="login-log-title"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 id="login-log-title" className="font-semibold">Registos de acesso</h2><p className="mt-1 text-sm text-text-secondary">Área exclusiva do proprietário. Entradas consecutivas do mesmo utilizador aparecem agrupadas.</p></div><button type="button" onClick={()=>void load()} className="control min-h-10 px-4 font-semibold">Actualizar</button></div>{error?<p role="alert" className="text-sm text-danger">{error}</p>:loading?<p role="status" className="text-sm text-text-secondary">A carregar acessos…</p>:<LoginActivityTable rows={rows}/>}</section>
}
