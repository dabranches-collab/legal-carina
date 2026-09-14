
// In-memory fixtures only, behind the existing local/test qa-demo gate.
export function createQaAllocationData(){
 const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`
 const firm=id(1),society={id:id(2),firm_id:firm,name:'LEGALTEAM',active:true,default_vat_rate:23}
 const people=['Carina','Hugo','Paula'].map((display_name,i)=>({id:id(10+i),firm_id:firm,display_name,active:true}))
 const clients=[{id:id(20),firm_id:firm,display_name:'Cliente Demonstração Alfa',client_code:'02.0001',client_type:'individual',client_referrer:'carina',active:true},{id:id(21),firm_id:firm,display_name:'Cliente Demonstração Beta',client_code:'01.0001',client_type:'company',client_referrer:null,active:true}]
 const profiles=clients.map((c,i)=>({id:id(30+i),client_id:c.id,firm_id:firm,client_code:c.client_code,client_type:c.client_type,display_name:c.display_name,active:true}))
 const work=[600,700,500,200].map((amount,i)=>({id:id(40+i),firm_id:firm,client_id:clients[i===3?1:0].id,client_profile_id:profiles[i===3?1:0].id,client_name:clients[i===3?1:0].display_name,client_code:clients[i===3?1:0].client_code,client_type:clients[i===3?1:0].client_type,billing_entity_id:society.id,billing_entity_name:society.name,professional_id:people[i%3].id,professional_name:people[i%3].display_name,work_date:`2026-09-0${Math.min(i+1,3)}`,activity_description:['Consulta e preparação de processo','Análise documental','Preparação de requerimento','Reunião de acompanhamento'][i],duration_minutes:[180,210,150,60][i],effective_amount:amount,effective_hourly_rate:200,currency:'EUR',billing_scope:'standard',is_billable:true,is_paid:i<2,is_invoiced:i<2,invoice_date:i<2?'2026-09-01':null,status:i<2?'paid':'approved',client_referrer:i===3?null:'carina',task_referrer:i===3?null:i===2?'other':'hugo',task_referrer_other:i===2?'Colaborador Sintético':null,observations:'Demonstração sintética',matter_id:null,archive_status:null,charge_type:'hourly',has_manual_override:false,source_type:'manual',validation_warnings:[]}))
 return (rpc:string|undefined,table:string,args:Record<string,unknown>,url:URL,method:string,single:boolean)=>{
  if(!rpc){let rows:Record<string,unknown>[]=table==='billing_entities'?[society]:table==='professionals'?people:table==='clients'?clients:table==='client_profiles'?profiles:table==='work_entries'?work:table==='firm_members'?[{firm_id:firm}]:[]
   for(const [key,value] of url.searchParams)if(value.startsWith('eq.')&&key in (rows[0]??{}))rows=rows.filter(row=>String(row[key])===value.slice(3))
   for(const [key,value] of url.searchParams)if(value.startsWith('in.('))rows=rows.filter(row=>value.slice(4,-1).split(',').includes(String(row[key])))
   if(method==='PATCH')for(const row of rows)Object.assign(row,args)
   return single?rows[0]??null:rows
  }
  if(rpc==='get_entity_dashboard_rolling')return {selectedId:society.id,identity:{title:society.name,subtitle:'Sociedade',code:''},options:[{id:society.id,label:society.name}],metrics:{minutes:600,total:2000,invoiced:1300,paid:1300,pending:0,averageRate:200,movements:4,clients:2,professionals:3,billingEntities:1},annual:[],monthly:[],recent:[]}
  if(rpc==='get_legalteam_allocation_work'){const eligible=work.filter(w=>args.p_start==null||(w.work_date>=String(args.p_start)&&w.work_date<=String(args.p_end))).map(w=>({...w,client_referrer:clients.find(c=>c.id===w.client_id)?.client_referrer??null}));return {items:eligible.slice(Number(args.p_offset),Number(args.p_offset)+Number(args.p_limit)),total:eligible.length}}
  if(rpc==='get_work_entry_form_options')return {societies:[society],responsibles:people,clientProfiles:profiles,processes:[]}
  if(rpc==='get_work_entry_for_edit')return work.find(w=>w.id===args.p_work_entry_id)??null
  if(rpc==='update_work_entry_with_allocation'){const row=work.find(w=>w.id===args.p_work_entry_id);if(row)Object.assign(row,args.p_values);return null}
  if(rpc==='create_work_entry_with_allocation'){if(!args.p_task_referrer||(args.p_task_referrer==='other'&&!String(args.p_task_referrer_other??'').trim()))throw new Error('Indique o angariador da tarefa.');return {workEntryId:id(90),expenses:[]}}
  if(rpc==='search_work_entries')return {items:work,total:work.length,page:1,pageSize:100,professionals:people.map(p=>({id:p.id,label:p.display_name})),billingEntities:[{id:society.id,label:society.name}]}
  if(rpc==='get_professional_landing_summaries')return people.map(p=>({id:p.id,name:p.display_name,minutes:work.filter(w=>w.professional_id===p.id).reduce((n,w)=>n+w.duration_minutes,0),total:1000,invoiced:500,clients:2,missing_society:0,missing_price:0,missingPrice:0,uninvoiced:0,unpaid:0,uncollectible:0,retainer:0}))
  if(rpc==='get_work_attention_counts')return {missing_society:0,missing_price:0,uninvoiced:0,unpaid:0,uncollectible:0,retainer:0}
  return []
 }
}
