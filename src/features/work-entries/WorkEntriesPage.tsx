import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import {
  StandardDataTable,
  type TableColumn,
} from "../../components/table/StandardDataTable";
import { supabase } from "../../lib/supabase";
import { withTransientRetry } from "../../lib/transientRetry";
import { readIdBatches } from "../../lib/readBatches";
import { CreateWorkEntryModal } from "./CreateWorkEntryModal";
import { EditWorkEntryModal } from "./EditWorkEntryModal";

type Entry = {
  id: string;
  work_date: string;
  created_at?: string;
  client_name: string;
  client_code: string;
  matter_code: string | null;
  matter_title: string | null;
  activity_description: string;
  professional_name: string;
  duration_minutes: number;
  effective_hourly_rate: number | null;
  effective_amount: number | null;
  billing_entity_name: string | null;
  status: string;
  is_invoiced: boolean;
  invoice_number: string | null;
  invoice_date: string | null;
  is_paid: boolean;
  archive_status: string | null;
  observations: string | null;
  source_type: string;
  has_manual_override: boolean;
  has_historical_state_exception: boolean;
  validation_warnings: string[];
  expense_amount?: number;
  expense_count?: number;
  expense_notes?: string[];
  expense_details?: string[];
  billing_scope?: 'standard'|'retainer';
};
const attentionCountsCache=new Map<string,Record<string,number>>();
const attentionCacheStorageKey='carina-work-attention-counts';
type Option = { id: string; label: string };
type SearchMeta = {
  pageSize?: number;
  items: Entry[];
  total: number;
  professionals: Option[];
  billingEntities: Option[];
};
type SearchArgs = Record<string, string | number | boolean | null>;
const workUniverseCache = new Map<string, { rows: Entry[]; expiresAt: number }>();
const workUniverseRequests = new Map<string, Promise<Entry[]>>();
let backgroundPrefetch: Promise<Entry[]> | null = null;
let cacheGeneration=0;
let cacheUser:string|null=null;
const cacheAuthSubscription=supabase?.auth.onAuthStateChange((_event,session)=>{
  const next=session?.user.id??null;
  if(next!==cacheUser){cacheUser=next;invalidateWorkUniverse();attentionCountsCache.clear();try{sessionStorage.removeItem(attentionCacheStorageKey)}catch{/* Sem armazenamento. */}}
});
if(import.meta.hot)import.meta.hot.dispose(()=>cacheAuthSubscription?.data.subscription.unsubscribe());

async function searchMixedClientEntries(searchArgs: SearchArgs): Promise<SearchMeta> {
  if (!supabase) throw new Error("Ligação ao Supabase indisponível.");
  const db = supabase;
  const profiles = await db
    .from("client_profiles")
    .select("client_id,client_type")
    .eq("active", true);
  if (profiles.error) throw profiles.error;
  const types = new Map<string, Set<string>>();
  for (const profile of profiles.data ?? []) {
    const current = types.get(profile.client_id) ?? new Set<string>();
    current.add(profile.client_type);
    types.set(profile.client_id, current);
  }
  const clientIds = [...types.entries()]
    .filter(([, values]) => values.size > 1)
    .map(([id]) => id);
  const responses: SearchMeta[] = [];
  for (let start = 0; start < clientIds.length; start += 6) {
    const batch = await Promise.all(
      clientIds.slice(start, start + 6).map(async (clientId) => {
        const response = await db.rpc("search_work_entries", {
          ...searchArgs,
          p_page: 1,
          p_page_size: 10000,
          p_client_type: null,
          p_client_id: clientId,
        });
        if (response.error) throw response.error;
        return response.data as SearchMeta;
      }),
    );
    responses.push(...batch);
  }
  const items = responses
    .flatMap((response) => response.items ?? [])
    .sort(
      (left, right) =>
        right.work_date.localeCompare(left.work_date) ||
        (right.created_at ?? "").localeCompare(left.created_at ?? "") ||
        left.id.localeCompare(right.id),
    );
  return {
    items,
    total: items.length,
    professionals: responses[0]?.professionals ?? [],
    billingEntities: responses[0]?.billingEntities ?? [],
  };
}
async function loadWorkUniverse(searchArgs: SearchArgs, onProgress?: (loaded:number,total:number)=>void) {
  if (!supabase) throw new Error("Ligação ao Supabase indisponível.");
  const generation=cacheGeneration;
  const cacheKey=JSON.stringify(searchArgs),cached=workUniverseCache.get(cacheKey);
  if(cached&&cached.expiresAt>Date.now()){onProgress?.(cached.rows.length,cached.rows.length);return cached.rows;}
  if(searchArgs.p_client_type==="mixed"){
    const items=(await searchMixedClientEntries(searchArgs)).items;
    if(generation===cacheGeneration)workUniverseCache.set(cacheKey,{rows:items,expiresAt:Date.now()+120_000});onProgress?.(items.length,items.length);return items;
  }
  const requestedPageSize=10000;
  const first=await withTransientRetry(()=>supabase!.rpc("search_work_entries",{...searchArgs,p_page:1,p_page_size:requestedPageSize}));
  if(first.error)throw new Error(first.error.message??"Não foi possível carregar os movimentos.");
  const firstPage=first.data as SearchMeta,total=firstPage.total??0,pageSize=Math.max(1,firstPage.pageSize??requestedPageSize),pages=Math.ceil(total/pageSize),items=[...(firstPage.items??[])];
  onProgress?.(items.length,total);
  for(let start=2;start<=pages;start+=3){
    const batch=await Promise.all(Array.from({length:Math.min(3,pages-start+1)},(_,index)=>withTransientRetry(()=>supabase!.rpc("search_work_entries",{...searchArgs,p_page:start+index,p_page_size:requestedPageSize}))));
    const failure=batch.find(response=>response.error)?.error;if(failure)throw new Error(failure.message);
    items.push(...batch.flatMap(response=>((response.data as SearchMeta).items??[])));onProgress?.(items.length,total);
  }
  if(items.length!==total)throw new Error(`Foram recebidos ${items.length} de ${total} movimentos. Tente novamente.`);
  if(generation===cacheGeneration)workUniverseCache.set(cacheKey,{rows:items,expiresAt:Date.now()+120_000});return items;
}
function fetchWorkUniverse(searchArgs: SearchArgs, onProgress?: (loaded:number,total:number)=>void) {
  const cacheKey=JSON.stringify(searchArgs),cached=workUniverseCache.get(cacheKey);
  if(cached&&cached.expiresAt>Date.now()){onProgress?.(cached.rows.length,cached.rows.length);return Promise.resolve(cached.rows)}
  const active=workUniverseRequests.get(cacheKey);
  if(active)return active.then(rows=>{onProgress?.(rows.length,rows.length);return rows});
  const request=loadWorkUniverse(searchArgs,onProgress).finally(()=>{if(workUniverseRequests.get(cacheKey)===request)workUniverseRequests.delete(cacheKey)});
  workUniverseRequests.set(cacheKey,request);
  return request;
}
const baseUniverseArgs:SearchArgs={p_search:null,p_year:null,p_professional_id:null,p_billing_entity_id:null,p_invoiced:null,p_paid:null,p_archive:null,p_review_only:false,p_missing_price:false,p_client_type:null,p_client_id:null,p_missing_society:false,p_sort:"work_date",p_direction:"desc"};
// eslint-disable-next-line react/only-export-components -- arranque antecipado partilha deliberadamente a cache deste módulo
export function prefetchWorkEntries(){
  backgroundPrefetch??=fetchWorkUniverse(baseUniverseArgs).finally(()=>{backgroundPrefetch=null});
  return backgroundPrefetch;
}
function invalidateWorkUniverse(){cacheGeneration++;workUniverseCache.clear();workUniverseRequests.clear();backgroundPrefetch=null}
async function hydrateExpenseSummaries(entries:Entry[]){
  if(!supabase||!entries.length)return entries;
  const db=supabase;
  const scopeRows=await readIdBatches(entries.filter(row=>!row.billing_scope).map(row=>row.id),(ids,from,to)=>db.from('work_entries').select('id,billing_scope').in('id',ids).order('id').range(from,to));
  const scopes=new Map(scopeRows.map(item=>[item.id,(item.billing_scope??'standard') as 'standard'|'retainer']));
  const summaries=new Map<string,{amount:number;count:number;notes:string[];details:string[]}>();
  const expenses=await readIdBatches(entries.map(row=>row.id),(ids,from,to)=>db.from('work_entry_expenses').select('work_entry_id,amount,observations').in('work_entry_id',ids).eq('status','active').order('id').range(from,to));
  for(const item of expenses){const current=summaries.get(item.work_entry_id)??{amount:0,count:0,notes:[],details:[]},amount=Number(item.amount)||0;current.amount+=amount;current.count++;if(item.observations)current.notes.push(item.observations);current.details.push(money.format(amount)+' — '+(item.observations||'Sem observação'));summaries.set(item.work_entry_id,current)}
  return entries.map(row=>{const summary=summaries.get(row.id),billing_scope=row.billing_scope??scopes.get(row.id)??'standard';return summary?{...row,billing_scope,expense_amount:summary.amount,expense_count:summary.count,expense_notes:summary.notes,expense_details:summary.details}:{...row,billing_scope,expense_amount:0,expense_count:0,expense_notes:[],expense_details:[]}})
}
const money = new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
  }),
  number = new Intl.NumberFormat("pt-PT");
const archives = [
  ["gaveta", "Gaveta"],
  ["dossier", "Dossier"],
  ["findos", "Findos"],
  ["digital", "Digital"],
  ["other", "Outro"],
] as const;

export function WorkEntriesPage({canDelete=true,requiresReason=false,embeddedQuery,onEntrySaved}:{canDelete?:boolean;requiresReason?:boolean;embeddedQuery?:string;onEntrySaved?:()=>void}={}) {
  const initialParams = new URLSearchParams(embeddedQuery??window.location.search);
  const [uncollectibleOnly,setUncollectibleOnly]=useState(()=>initialParams.get("collectionState")==="uncollectible");
  const [rows, setRows] = useState<Entry[]>([]),
    [meta, setMeta] = useState<SearchMeta>({
      items: [],
      total: 0,
      professionals: [],
      billingEntities: [],
    }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [search, setSearch] = useState(""),
    [query, setQuery] = useState(""),
    [year, setYear] = useState(""),
    [professional, setProfessional] = useState(() => initialParams.get("professionalId") ?? ""),
    [billing, setBilling] = useState(() => initialParams.get("billingEntityId") ?? ""),
    [invoiced, setInvoiced] = useState(
      () => initialParams.get("invoiced") ?? "",
    ),
    [paid, setPaid] = useState(() => initialParams.get("paid") ?? ""),
    [archive, setArchive] = useState(""),
    [reviewIssue, setReviewIssue] = useState(() =>
      initialParams.get("collectionState") === "unpaid"
        ? "unpaid"
        : initialParams.get("collectionState") === "uninvoiced"
          ? "uninvoiced"
      : initialParams.get("missingSociety") === "true"
        ? "missing_society"
        : initialParams.get("missingPrice") === "true"
          ? "missing_price"
          : "",
    );
  const missingPrice = reviewIssue === "missing_price",
    missingSociety = reviewIssue === "missing_society",
    review = reviewIssue === "historical",
    clientType = initialParams.get("clientType"),
    clientId = initialParams.get("clientId");
  const [refreshToken, setRefreshToken] = useState(0),
    [notice, setNotice] = useState("");
  const [reviewCounts,setReviewCounts]=useState<Record<string,number|null>>({});
  const silentRefreshRef=useRef(false);
  const filtersBarRef=useRef<HTMLDivElement>(null);
  const [tableStickyOffset,setTableStickyOffset]=useState(112);
  useEffect(()=>{
    const bar=filtersBarRef.current;
    const update=()=>{
      const appHeader=document.querySelector<HTMLElement>('.app-shell-header');
      const headerHeight=Math.ceil(appHeader?.getBoundingClientRect().height??64);
      const keepFiltersSticky = !!bar && window.innerWidth >= 1024 && window.innerHeight > 760;
      setTableStickyOffset(headerHeight+(keepFiltersSticky?Math.ceil(bar!.getBoundingClientRect().height):0));
    };
    update();
    const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);
    if(bar)observer?.observe(bar);const header=document.querySelector('.app-shell-header');if(header)observer?.observe(header);window.addEventListener('resize',update);
    return()=>{observer?.disconnect();window.removeEventListener('resize',update)};
  },[]);
  const [creating, setCreating] = useState(false),
    [editingId, setEditingId] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const searchArgs = useMemo(
    () => ({
      p_search: query || null,
      p_year: year ? Number(year) : null,
      p_professional_id: professional || null,
      p_billing_entity_id: billing || null,
      p_invoiced:
        reviewIssue === "uninvoiced"
          ? false
          : reviewIssue === "unpaid"
            ? true
            : invoiced === ""
              ? null
              : invoiced === "true",
      p_paid:
        reviewIssue === "unpaid"
          ? false
          : paid === ""
            ? null
            : paid === "true",
      p_archive: archive || null,
      p_review_only: review,
      p_missing_price: missingPrice,
      p_client_type: clientType || null,
      p_client_id: clientId || null,
      p_missing_society: missingSociety,
      p_sort: "work_date",
      p_direction: "desc",
    }),
    [
      query,
      year,
      professional,
      billing,
      invoiced,
      paid,
      archive,
      reviewIssue,
      review,
      missingPrice,
      missingSociety,
      clientType,
      clientId,
    ],
  );
  useEffect(() => {
    let active = true;
    const silent=silentRefreshRef.current;
    silentRefreshRef.current=false;
    if(!silent)setLoading(true);
    setError("");
    void (async () => {
      if (!supabase) {
        setError("Ligação ao Supabase indisponível.");
        setLoading(false);
        return;
      }
      const client = supabase;
      let metadata;
      try {
        metadata = await withTransientRetry(async () =>
          clientType === "mixed"
            ? { data: await searchMixedClientEntries(searchArgs), error: null }
            : uncollectibleOnly
              ? await client.rpc("get_uncollectible_work_entries",{p_search:searchArgs.p_search,p_year:searchArgs.p_year,p_professional_id:searchArgs.p_professional_id,p_billing_entity_id:searchArgs.p_billing_entity_id,p_archive:searchArgs.p_archive,p_missing_price:searchArgs.p_missing_price,p_client_type:searchArgs.p_client_type,p_client_id:searchArgs.p_client_id,p_missing_society:searchArgs.p_missing_society})
              : reviewIssue==="uninvoiced"||reviewIssue==="unpaid"||reviewIssue==="historical"||reviewIssue==="retainer"||reviewIssue==="missing_price"
                ? await client.rpc("get_attention_work_entries",{p_kind:reviewIssue,p_search:searchArgs.p_search,p_year:searchArgs.p_year,p_professional_id:searchArgs.p_professional_id,p_billing_entity_id:searchArgs.p_billing_entity_id,p_archive:searchArgs.p_archive,p_missing_price:searchArgs.p_missing_price,p_client_type:searchArgs.p_client_type,p_client_id:searchArgs.p_client_id,p_missing_society:searchArgs.p_missing_society})
                : await client.rpc("search_work_entries", {
                  p_page: 1,
                  p_page_size: 100,
                  ...searchArgs,
                }),
        );
      } catch (cause) {
        if (active) {
          setError(cause instanceof Error ? cause.message : "Não foi possível carregar os movimentos.");
          setLoading(false);
        }
        return;
      }
      if (!active) return;
      if (metadata.error)
        setError(
          metadata.error.message ?? "Não foi possível carregar os movimentos.",
        );
      else {
        const next = metadata.data as SearchMeta;
        setMeta(next);
        const visible=(next.items ?? []).slice(0,100);
        try{const hydrated=await hydrateExpenseSummaries(visible);if(active)setRows(hydrated)}catch{if(active)setRows(visible)}
      }
      if(!silent)setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [searchArgs, refreshToken, clientType, reviewIssue, uncollectibleOnly]);
  useEffect(()=>{
    if(embeddedQuery!==undefined)return;
    let active=true;
    void(async()=>{
      if(!supabase)return;
      const common={p_search:query||null,p_year:year?Number(year):null,p_professional_id:professional||null,p_billing_entity_id:billing||null,p_archive:archive||null,p_client_type:clientType||null,p_client_id:clientId||null};
      const cacheKey=JSON.stringify(common),cached=attentionCountsCache.get(cacheKey);
      if(cached)setReviewCounts(cached);
      const result=await supabase.rpc("get_work_attention_counts",common);
      if(!active)return;
      if(result.error)return;
      const counts=result.data as Record<string,number>;
      const normalized=Object.fromEntries(Object.entries(counts).map(([key,value])=>[key,Number(value)]));
      attentionCountsCache.set(cacheKey,normalized);setReviewCounts(normalized);
    })();
    return()=>{active=false};
  },[query,year,professional,billing,archive,clientType,clientId,refreshToken,embeddedQuery]);
  const clear = () => {
    setSearch("");
    setQuery("");
    setYear("");
    setProfessional("");
    setBilling("");
    setInvoiced("");
    setPaid("");
    setArchive("");
    setReviewIssue("");
    setUncollectibleOnly(false);
  };
  const selectReviewIssue = (value: string) => {
    setUncollectibleOnly(false);
    if (reviewIssue === value) {
      setReviewIssue("");
      return;
    }
    setReviewIssue(value);
  };
  const reviewLabels: Record<string, string> = {
    missing_society: "Sem sociedade",
    missing_price: "Sem preço",
    uninvoiced: "Por facturar",
    unpaid: "Facturados não pagos",
    historical: "Facturados sem data / estados históricos",
    retainer: "Cobertos por avença",
  };
  const activeFilters = [
    year && `Ano: ${year}`,
    professional &&
      `Responsável: ${meta.professionals.find((o) => o.id === professional)?.label}`,
    billing &&
      `Sociedade: ${meta.billingEntities.find((o) => o.id === billing)?.label}`,
    invoiced && `Facturado: ${invoiced === "true" ? "Sim" : "Não"}`,
    paid && `Pago: ${paid === "true" ? "Sim" : "Não"}`,
    archive && `Arquivo: ${archive}`,
    reviewIssue && `A corrigir: ${reviewLabels[reviewIssue]}`,
    clientType &&
      `Tipo de cliente: ${clientType === "company" ? "Empresa" : clientType === "mixed" ? "Mistos" : "Particular"}`,
  ].filter(Boolean) as string[];
  const loadExportRows = useCallback(async (onProgress?: (loaded:number,total:number)=>void) => {
    if (!supabase) throw new Error("Ligação ao Supabase indisponível.");
    const exportArgs = {
      p_search: query || null,
      p_year: year ? Number(year) : null,
      p_professional_id: professional || null,
      p_billing_entity_id: billing || null,
      p_invoiced:
        reviewIssue === "uninvoiced"
          ? false
          : reviewIssue === "unpaid"
            ? true
            : invoiced === ""
              ? null
              : invoiced === "true",
      p_paid:
        reviewIssue === "unpaid"
          ? false
          : paid === ""
            ? null
            : paid === "true",
      p_archive: archive || null,
      p_review_only: review,
      p_missing_price: missingPrice,
      p_client_type: clientType || null,
      p_client_id: clientId || null,
      p_missing_society: missingSociety,
      p_sort: "work_date",
      p_direction: "desc",
    };
    let entries: Entry[];
    if (clientType === "mixed") {
      entries = (await searchMixedClientEntries(exportArgs)).items;
    } else if (uncollectibleOnly) {
      const response = await supabase.rpc("get_uncollectible_work_entries", {
        p_search: exportArgs.p_search,
        p_year: exportArgs.p_year,
        p_professional_id: exportArgs.p_professional_id,
        p_billing_entity_id: exportArgs.p_billing_entity_id,
        p_archive: exportArgs.p_archive,
        p_missing_price: exportArgs.p_missing_price,
        p_client_type: exportArgs.p_client_type,
        p_client_id: exportArgs.p_client_id,
        p_missing_society: exportArgs.p_missing_society,
      });
      if (response.error) throw new Error(response.error.message);
      entries = ((response.data as SearchMeta).items ?? []);
    } else if (["uninvoiced", "unpaid", "historical", "retainer", "missing_price"].includes(reviewIssue)) {
      const response = await supabase.rpc("get_attention_work_entries", {
        p_kind: reviewIssue,
        p_search: exportArgs.p_search,
        p_year: exportArgs.p_year,
        p_professional_id: exportArgs.p_professional_id,
        p_billing_entity_id: exportArgs.p_billing_entity_id,
        p_archive: exportArgs.p_archive,
        p_missing_price: exportArgs.p_missing_price,
        p_client_type: exportArgs.p_client_type,
        p_client_id: exportArgs.p_client_id,
        p_missing_society: exportArgs.p_missing_society,
      });
      if (response.error) throw new Error(response.error.message);
      entries = ((response.data as SearchMeta).items ?? []);
    } else {
      entries = await fetchWorkUniverse(exportArgs,onProgress);
    }
    onProgress?.(entries.length,entries.length);
    return hydrateExpenseSummaries(entries);
  }, [
    query,
    year,
    professional,
    billing,
    invoiced,
    paid,
    archive,
    reviewIssue,
    uncollectibleOnly,
    review,
    missingPrice,
    clientType,
      clientId,
    missingSociety,
  ]);
  const loadAllTableRows = loadExportRows;
  const columns: TableColumn<Entry>[] = [
    {
      id: "date",
      label: "Data",
      kind: "date",
      essential: true,
      value: (row) => row.work_date,
    },
    {
      id: "client",
      label: "Cliente",
      sticky: true,
      suggestOptions: true,
      value: (row) => row.client_name,

    },
    { id: "code", label: "Código (automático)", suggestOptions:true, value: (row) => row.client_code },
    {
      id: "activity",
      label: "Actividade",
      align: "left",
      suggestOptions: false,
      value: (row) => row.activity_description,
    },
    {
      id: "responsible",
      label: "Responsável",
      filterOptions: meta.professionals.map(option=>({value:option.label,label:option.label})),
      value: (row) => row.professional_name,
    },
    {
      id: "duration",
      label: "Duração (min)",
      kind: "number",
      align: "right",
      value: (row) => row.duration_minutes,
    },
    {id:'billingScope',label:'Tratamento',filterOptions:[{value:'standard',label:'Fora da avença'},{value:'retainer',label:'Coberto por avença'}],value:row=>row.billing_scope??'standard',render:row=><span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${row.billing_scope==='retainer'?'bg-secondary-soft text-secondary':'bg-surface-subtle text-text-secondary'}`}>{row.billing_scope==='retainer'?'Avença':'Fora da avença'}</span>},
    {
      id: "rate",
      label: "Valor/hora (EUR)",
      kind: "money",
      align: "right",
      value: (row) => row.effective_hourly_rate,
    },
    {
      id: "amount",
      label: "Valor (EUR)",
      kind: "money",
      align: "right",
      value: (row) => row.effective_amount,
    },
    {id:'expenses',label:'Despesas',kind:'money',align:'right',suggestOptions:false,value:row=>row.expense_amount??0,render:row=>{if(!row.expense_count)return <span>—</span>;const first=row.expense_notes?.[0]||'Sem observação',more=row.expense_count-1,details=row.expense_details??[];return <span title={details.join('\n')} aria-label={`${row.expense_count} ${row.expense_count===1?'despesa':'despesas'}: ${details.join('; ')}`} className="block max-w-52 cursor-help text-right"><span className="block tabular-nums font-semibold">{money.format(row.expense_amount??0)} · {row.expense_count}</span><span className="block truncate text-xs text-text-secondary">{first}{more>0?` · +${more}`:''}</span></span>}},
    {
      id: "society",
      label: "Sociedade",
      filterOptions: [{value:"",label:"Sem sociedade"},...meta.billingEntities.map(option=>({value:option.label,label:option.label}))],
      value: (row) => row.billing_entity_name,
    },
    {
      id: "invoiced",
      label: "Facturado",
      filterOptions: [{value:"Sim",label:"Sim"},{value:"Não",label:"Não"},{value:"Incobrável",label:"Incobrável"}],
      value: (row) => row.status === "uncollectible_uninvoiced" ? "Incobrável" : row.is_invoiced ? "Sim" : "Não",
    },
    {
      id: "invoiceNumber",
      label: "N.º factura",
      suggestOptions: true,
      value: (row) => row.invoice_number,
    },
    {
      id: "invoiceDate",
      label: "Data factura",
      kind: "date",
      value: (row) => row.invoice_date,
    },
    {
      id: "paid",
      label: "Pago",
      filterOptions: [{value:"Sim",label:"Sim"},{value:"Não",label:"Não"},{value:"Incobrável",label:"Incobrável"}],
      value: (row) => row.status === "uncollectible_invoiced" ? "Incobrável" : row.is_paid ? "Sim" : "Não",
    },
    { id: "archive", label: "Arquivo", filterOptions:[{value:"",label:"Sem arquivo"},...archives.map(([value,label])=>({value,label}))], value: (row) => row.archive_status },
    { id: "notes", label: "Observações", suggestOptions:false, value: (row) => row.observations },
  ];
  return (
    <div className="space-y-4">
      {notice && (
        <p
          role="status"
          className="rounded-lg bg-success-soft p-3 text-sm text-success"
        >
          {notice}
        </p>
      )}
      {embeddedQuery===undefined&&<div ref={filtersBarRef} className="work-filters-bar grid gap-2 bg-background pb-2 lg:sticky lg:top-[var(--app-header-height,9.75rem)] lg:z-50 lg:grid-cols-[minmax(0,1fr)_7.5rem]">
      <section aria-label="Filtros dos registos" className="card p-2 shadow-sm">
      <div
        aria-labelledby="review-issues-title"
        className="mb-2 rounded-xl border border-danger/40 bg-danger-soft p-3"
      >
        <div className="flex items-end justify-between gap-3">
          <h2 id="review-issues-title" className="text-sm font-semibold leading-tight text-danger">
            Pendências a corrigir
          </h2>
          <p className="text-[11px] leading-tight text-text-primary">Seleccione para filtrar o universo completo.</p>
        </div>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {Object.entries(reviewLabels).map(([value, label]) => {
            const active = reviewIssue === value;
            return (
              <button
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={active}
                onClick={() => selectReviewIssue(value)}
                className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-xs font-semibold leading-tight transition ${active ? "border-danger bg-danger text-surface shadow-sm" : "border-danger/35 bg-surface text-text-primary hover:border-danger hover:bg-danger-soft"}`}
              >
                <span>{label}</span>
                <span className={`inline-flex min-w-10 shrink-0 justify-center rounded-md px-2 py-1 text-sm font-bold tabular-nums ${active?'bg-surface text-danger':'bg-danger text-surface'}`} aria-label={`${reviewCounts[value]??'a calcular'} registos`}>
                  {reviewCounts[value]??"—"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
        <div className="grid gap-2 lg:grid-cols-[minmax(15rem,2fr)_repeat(3,minmax(9rem,1fr))]">
          <div className="relative">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Pesquisar registos"
              className="control min-h-9 w-full py-1.5 pl-10 pr-3 text-sm"
              placeholder="Cliente, código, actividade ou observação…"
            />
          </div>
          <select
            aria-label="Ano"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="control min-h-9 px-3 text-sm"
          >
            <option value="">Todos os anos</option>
            {Array.from({ length: 9 }, (_, i) => 2026 - i).map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <select
            aria-label="Responsável"
            value={professional}
            onChange={(e) => setProfessional(e.target.value)}
            className="control min-h-9 px-3 text-sm"
          >
            <option value="">Todos os responsáveis</option>
            {meta.professionals.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Sociedade"
            value={billing}
            onChange={(e) => setBilling(e.target.value)}
            className="control min-h-9 px-3 text-sm"
          >
            <option value="">Todas as sociedades</option>
            {meta.billingEntities.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            aria-label="Estado de facturação"
            value={invoiced}
            onChange={(e) => setInvoiced(e.target.value)}
            className="control min-h-9 px-3 text-sm"
          >
            <option value="">Facturados e não facturados</option>
            <option value="true">Facturados</option>
            <option value="false">Não facturados</option>
          </select>
          <select
            aria-label="Pagamento"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            className="control min-h-9 px-3 text-sm"
          >
            <option value="">Pagos e pendentes</option>
            <option value="true">Pagos</option>
            <option value="false">Pendentes</option>
          </select>
          <select
            aria-label="Arquivo"
            value={archive}
            onChange={(e) => setArchive(e.target.value)}
            className="control min-h-9 px-3 text-sm"
          >
            <option value="">Todos os arquivos</option>
            {archives.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={clear}
            className="control min-h-9 px-3 text-sm font-semibold"
          >
            Limpar filtros
          </button>
        </div>
        {activeFilters.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
            {activeFilters.map((filter) => (
              <span
                key={filter}
                className="rounded-full bg-secondary-soft px-2.5 py-1 text-xs font-medium text-secondary"
              >
                {filter}
              </span>
            ))}
          </div>
        )}
        <p className="mt-1.5 text-[11px] leading-tight text-text-secondary">
          {loading
            ? "A recolher os registos…"
            : `${number.format(meta.total)} movimentos acessíveis`}
        </p>
      </section>
        <button
          type="button"
          aria-label="Criar movimento"
          onClick={() => setCreating(true)}
          className="flex min-h-20 items-center justify-center rounded-xl border border-secondary bg-secondary px-3 py-3 text-center text-sm font-semibold leading-tight text-white shadow-sm transition hover:brightness-110 lg:h-full lg:min-h-0"
        >
          <span><span className="mb-1 block text-xl leading-none" aria-hidden="true">＋</span>Criar<br />movimento</span>
        </button>
      </div>}
      <StandardDataTable
        id={embeddedQuery===undefined?"work-entries":"accompaniment-work-entries"}
        label="Registos de trabalho"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
        updating={loading && rows.length > 0}
        error={error || undefined}
        onRetry={() => setRefreshToken((value) => value + 1)}
        defaultPageSize={100}
        emptyMessage="Ainda não existem movimentos acessíveis."
        loadExportRows={loadExportRows}
        loadAllRows={loadAllTableRows}
        totalRows={meta.total}
        universeKey={JSON.stringify(searchArgs)}
        stickyHeaderOffset={tableStickyOffset}
        showSearch={embeddedQuery!==undefined}
        resultNoun="registos"
        onRowDoubleClick={(row) => setEditingId(row.id)}
      />
      {creating && (
        <CreateWorkEntryModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            invalidateWorkUniverse();
            setCreating(false);
            setNotice("Movimento criado e registado na auditoria.");
            setRefreshToken((value) => value + 1);
          }}
        />
      )}
      {editingId && (
        <EditWorkEntryModal
          entryId={editingId}
          canDelete={canDelete}
          requiresReason={requiresReason}
          onClose={() => setEditingId(null)}
          onSaved={(action) => {
            invalidateWorkUniverse();
            setEditingId(null);
            setNotice(action === "deleted"
              ? "Movimento apagado e preservado no histórico de auditoria."
              : "Movimento actualizado e registado na auditoria.");
            setRefreshToken((value) => value + 1);
            onEntrySaved?.();
          }}
        />
      )}
    </div>
  );
}
