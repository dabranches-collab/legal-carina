const demoDashboard={
 metrics:{minutes:8160,worked:24800,invoiced:21600,paid:18400,receivable:3200,uninvoicedCount:7,unpaidCount:3,uncollectibleCount:1,uncollectibleValue:250,averageRate:182,activeClients:12,missingPrice:0,missingBilling:0,overrides:0,importErrors:0},
 annual:[2024,2025,2026].map((label,index)=>({label,value:16000+index*4400,minutes:6200+index*980})),monthly:[],monthlyByYear:[],billingAnnual:[],billingMonthly:[],latestYear:2026,byClient:[],byBilling:[],byProfessional:[],byArchive:[],clientTypes:[],
}

const demoRpc:Record<string,unknown>={
 get_dashboard_overview:demoDashboard,
 search_work_entries:{items:[],total:0,page:1,pageSize:100,professionals:[],billingEntities:[]},
 get_attention_work_entries:{items:[],total:0,page:1,pageSize:100,professionals:[],billingEntities:[]},
 get_uncollectible_work_entries:{items:[],total:0,page:1,pageSize:100,professionals:[],billingEntities:[]},
 get_work_attention_counts:{missing_society:0,missing_price:0,uninvoiced:0,unpaid:0,uncollectible:0,retainer:0},
 get_work_entry_form_options:{societies:[],clientProfiles:[],responsibles:[],processes:[]},
 get_client_category_summaries:[],get_retainer_management:[],get_professional_landing_summaries:[],get_dashboard_metric_breakdowns:[],get_client_document_action_flags:[],
}

export function installQaDemoFetch(){
 const params=new URLSearchParams(window.location.search)
 if(!(import.meta.env.DEV||import.meta.env.VITE_APP_ENV==='test')||params.get('qa-demo')!=='1')return
 const nativeFetch=window.fetch.bind(window)
 window.fetch=async(input,init)=>{
  const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,window.location.href)
  if(!url.hostname.endsWith('.supabase.co')||!url.pathname.startsWith('/rest/v1/'))return nativeFetch(input,init)
  const rpc=url.pathname.match(/\/rest\/v1\/rpc\/([^/]+)/)?.[1]
  const payload=rpc?(demoRpc[rpc]??[]):[]
  return new Response(JSON.stringify(payload),{status:200,headers:{'Content-Type':'application/json','Content-Range':'0-0/0'}})
 }
}
