import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../components/ui/Icon";
import {
  StandardDataTable,
  type TableColumn,
} from "../../components/table/StandardDataTable";
import { supabase } from "../../lib/supabase";
import { CreateWorkEntryModal } from "./CreateWorkEntryModal";
import { EditWorkEntryModal } from "./EditWorkEntryModal";
import { DurationSelect } from "./DurationSelect";

type Entry = {
  id: string;
  work_date: string;
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
};
type Option = { id: string; label: string };
type SearchMeta = {
  items: Entry[];
  total: number;
  professionals: Option[];
  billingEntities: Option[];
};
type SearchArgs = Record<string, string | number | boolean | null>;

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
        left.id.localeCompare(right.id),
    );
  return {
    items,
    total: items.length,
    professionals: responses[0]?.professionals ?? [],
    billingEntities: responses[0]?.billingEntities ?? [],
  };
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

export function WorkEntriesPage() {
  const initialParams = new URLSearchParams(window.location.search);
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
      initialParams.get("missingSociety") === "true"
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
  const [creating, setCreating] = useState(false),
    [editingId, setEditingId] = useState<string | null>(null);
  const saveInline = useCallback(async (row: Entry, field: string, value: string) => {
    if (!supabase) return;
    setError("");
    const result = await supabase.rpc("update_work_entry_inline", {
      p_work_entry_id: row.id,
      p_field: field,
      p_value: value,
    });
    if (result.error) {
      setError(result.error.message ?? "Não foi possível guardar a alteração.");
      return;
    }
    setNotice("Alteração guardada e registada na auditoria.");
    setRefreshToken((current) => current + 1);
  }, []);
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
    setLoading(true);
    setError("");
    void (async () => {
      if (!supabase) {
        setError("Ligação ao Supabase indisponível.");
        setLoading(false);
        return;
      }
      let metadata;
      try {
        metadata = clientType === "mixed"
          ? { data: await searchMixedClientEntries(searchArgs), error: null }
          : await supabase.rpc("search_work_entries", {
              p_page: 1,
              p_page_size: 100,
              ...searchArgs,
            });
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
        setRows((next.items ?? []).slice(0, 100));
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [searchArgs, refreshToken, clientType]);
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
  };
  const selectReviewIssue = (value: string) => {
    if (reviewIssue === value) {
      setReviewIssue("");
      return;
    }
    setSearch("");
    setQuery("");
    setYear("");
    setProfessional("");
    setBilling("");
    setInvoiced("");
    setPaid("");
    setArchive("");
    setReviewIssue(value);
  };
  const reviewLabels: Record<string, string> = {
    missing_society: "Sem sociedade",
    missing_price: "Sem preço",
    uninvoiced: "Por facturar",
    unpaid: "Facturados não pagos",
    historical: "Facturados sem data / estados históricos",
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
    if (clientType === "mixed") {const items=(await searchMixedClientEntries(exportArgs)).items;onProgress?.(items.length,items.length);return items;}
    const pageSize=100;
    const first = await supabase.rpc("search_work_entries", {...exportArgs,p_page:1,p_page_size:pageSize});
    if(first.error)throw new Error(first.error.message??"Não foi possível carregar os movimentos.");
    const firstPage=first.data as SearchMeta,total=firstPage.total??0,pages=Math.ceil(total/pageSize),items=[...(firstPage.items??[])];
    onProgress?.(items.length,total);
    for(let start=2;start<=pages;start+=6){
      const batch=await Promise.all(Array.from({length:Math.min(6,pages-start+1)},(_,index)=>supabase!.rpc("search_work_entries",{...exportArgs,p_page:start+index,p_page_size:pageSize})));
      const failure=batch.find(response=>response.error)?.error;if(failure)throw new Error(failure.message);
      items.push(...batch.flatMap(response=>((response.data as SearchMeta).items??[])));
      onProgress?.(items.length,total);
    }
    if(items.length!==total)throw new Error(`Foram recebidos ${items.length} de ${total} movimentos. Tente novamente.`);
    return items;
  }, [
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
      render: (row) => <InlineInput type="date" value={row.work_date} onCommit={(value)=>saveInline(row,"work_date",value)}/> ,
    },
    {
      id: "client",
      label: "Cliente",
      sticky: true,
      suggestOptions: true,
      value: (row) => row.client_name,
    },
    { id: "code", label: "Código", suggestOptions:true, value: (row) => row.client_code },
    {
      id: "activity",
      label: "Actividade",
      suggestOptions: false,
      value: (row) => row.activity_description,
      render: (row) => <InlineInput value={row.activity_description} onCommit={(value)=>saveInline(row,"activity_description",value)}/>,
    },
    {
      id: "responsible",
      label: "Responsável",
      filterOptions: meta.professionals.map(option=>({value:option.label,label:option.label})),
      value: (row) => row.professional_name,
      render: (row) => <InlineSelect value={meta.professionals.find(option=>option.label===row.professional_name)?.id??""} options={meta.professionals.map(option=>[option.id,option.label])} placeholder="—" onCommit={(value)=>value&&saveInline(row,"professional_id",value)}/>,
    },
    {
      id: "duration",
      label: "Duração (min)",
      kind: "number",
      align: "right",
      value: (row) => row.duration_minutes,
      render: (row) => <InlineDuration value={row.duration_minutes} onCommit={(value)=>saveInline(row,"duration_minutes",String(value))}/>,
    },
    {
      id: "rate",
      label: "Valor/hora (EUR)",
      kind: "money",
      align: "right",
      value: (row) => row.effective_hourly_rate,
      render: (row) => <InlineMoney value={row.effective_hourly_rate} onCommit={(value)=>saveInline(row,"effective_hourly_rate",value)}/>,
    },
    {
      id: "amount",
      label: "Valor (EUR)",
      kind: "money",
      align: "right",
      value: (row) => row.effective_amount,
      render: (row) => <InlineMoney value={row.effective_amount} onCommit={(value)=>saveInline(row,"effective_amount",value)}/>,
    },
    {
      id: "society",
      label: "Sociedade",
      filterOptions: [{value:"",label:"Sem sociedade"},...meta.billingEntities.map(option=>({value:option.label,label:option.label}))],
      value: (row) => row.billing_entity_name,
      render: (row) => <InlineSelect value={meta.billingEntities.find(option=>option.label===row.billing_entity_name)?.id??""} options={meta.billingEntities.map(option=>[option.id,option.label])} placeholder="Sem sociedade" onCommit={(value)=>saveInline(row,"billing_entity_id",value)}/>,
    },
    {
      id: "invoiced",
      label: "Facturado",
      kind: "boolean",
      value: (row) => row.is_invoiced,
      render: (row) => <InlineSelect value={String(row.is_invoiced)} options={[["true","Sim"],["false","Não"]]} placeholder="—" onCommit={(value)=>value&&saveInline(row,"is_invoiced",value)}/>,
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
      render: (row) => <InlineInput type="date" value={row.invoice_date??""} onCommit={(value)=>saveInline(row,"invoice_date",value)}/>,
    },
    {
      id: "paid",
      label: "Pago",
      kind: "boolean",
      value: (row) => row.is_paid,
      render: (row) => <InlineSelect value={String(row.is_paid)} options={[["true","Sim"],["false","Não"]]} placeholder="—" onCommit={(value)=>value&&saveInline(row,"is_paid",value)}/>,
    },
    { id: "archive", label: "Arquivo", filterOptions:[{value:"",label:"Sem arquivo"},...archives.map(([value,label])=>({value,label}))], value: (row) => row.archive_status, render:(row)=><InlineSelect value={row.archive_status??""} options={archives} placeholder="Sem arquivo" onCommit={(value)=>saveInline(row,"archive_status",value)}/> },
    { id: "notes", label: "Observações", suggestOptions:false, value: (row) => row.observations, render:(row)=><InlineInput value={row.observations??""} onCommit={(value)=>saveInline(row,"observations",value)}/> },
    {
      id: "override",
      label: "Override",
      kind: "boolean",
      value: (row) => row.has_manual_override,
      render: (row) =>
        row.has_manual_override ? "Alterado manualmente" : "Não",
    },
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
      <section
        aria-labelledby="review-issues-title"
        className="card card-danger p-4"
      >
        <div>
          <h2 id="review-issues-title" className="font-semibold text-danger">
            Pendências a corrigir
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Pré-filtros aplicados ao universo completo dos movimentos.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {Object.entries(reviewLabels).map(([value, label]) => {
            const active = reviewIssue === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={active}
                onClick={() => selectReviewIssue(value)}
                className={`min-h-10 rounded-lg border border-danger px-3 text-sm font-semibold transition ${active ? "bg-danger text-surface shadow-sm" : "bg-surface text-danger hover:bg-danger-soft"}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>
      <section aria-label="Filtros dos registos" className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(15rem,2fr)_repeat(3,minmax(9rem,1fr))]">
          <div className="relative">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-secondary"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Pesquisar registos"
              className="control w-full py-2 pl-10 pr-3 text-sm"
              placeholder="Cliente, código, actividade ou observação…"
            />
          </div>
          <select
            aria-label="Ano"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="control px-3 text-sm"
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
            className="control px-3 text-sm"
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
            className="control px-3 text-sm"
          >
            <option value="">Todas as sociedades</option>
            {meta.billingEntities.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            aria-label="Estado de facturação"
            value={invoiced}
            onChange={(e) => setInvoiced(e.target.value)}
            className="control px-3 text-sm"
          >
            <option value="">Facturados e não facturados</option>
            <option value="true">Facturados</option>
            <option value="false">Não facturados</option>
          </select>
          <select
            aria-label="Pagamento"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
            className="control px-3 text-sm"
          >
            <option value="">Pagos e pendentes</option>
            <option value="true">Pagos</option>
            <option value="false">Pendentes</option>
          </select>
          <select
            aria-label="Arquivo"
            value={archive}
            onChange={(e) => setArchive(e.target.value)}
            className="control px-3 text-sm"
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
            className="control px-3 text-sm font-semibold"
          >
            Limpar filtros
          </button>
        </div>
        {activeFilters.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
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
      </section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">
          {loading
            ? "A actualizar…"
            : `${number.format(meta.total)} movimentos acessíveis`}
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-surface"
        >
          Criar movimento
        </button>
      </div>
      <StandardDataTable
        id="work-entries"
        label="Registos de trabalho"
        rows={rows}
        columns={columns}
        rowKey={(row) => row.id}
        loading={loading}
        updating={loading && rows.length > 0}
        error={error || undefined}
        onRetry={() => setRefreshToken((value) => value + 1)}
        defaultPageSize={50}
        emptyMessage="Ainda não existem movimentos acessíveis."
        loadExportRows={loadExportRows}
        loadAllRows={loadAllTableRows}
        totalRows={meta.total}
        universeKey={JSON.stringify(searchArgs)}
        onRowDoubleClick={(row) => setEditingId(row.id)}
      />
      {creating && (
        <CreateWorkEntryModal
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setNotice("Movimento criado e registado na auditoria.");
            setRefreshToken((value) => value + 1);
          }}
        />
      )}
      {editingId && (
        <EditWorkEntryModal
          entryId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={() => {
            setEditingId(null);
            setNotice("Movimento actualizado e registado na auditoria.");
            setRefreshToken((value) => value + 1);
          }}
        />
      )}
    </div>
  );
}

function InlineInput({value,onCommit,type="text"}:{value:string;onCommit:(value:string)=>void;type?:"text"|"date"}){
 const [draft,setDraft]=useState(value)
 const [editing,setEditing]=useState(false)
 useEffect(()=>setDraft(value),[value])
 if(!editing)return <button type="button" onClick={event=>{event.stopPropagation();setEditing(true)}} className="min-h-7 max-w-44 truncate px-1 text-xs hover:rounded hover:bg-secondary-soft">{type==='date'&&value?new Date(`${value}T00:00:00`).toLocaleDateString('pt-PT'):value||'—'}</button>
 return <input autoFocus type={type} value={draft} onClick={event=>event.stopPropagation()} onChange={event=>setDraft(event.target.value)} onBlur={()=>{setEditing(false);if(draft!==value)onCommit(draft)}} className="control h-7 min-w-20 px-1.5 text-center text-xs"/>
}
function InlineMoney({value,onCommit}:{value:number|null;onCommit:(value:string)=>void}){
 const [draft,setDraft]=useState(value==null?'':String(value))
 const [editing,setEditing]=useState(false)
 useEffect(()=>setDraft(value==null?'':String(value)),[value])
 if(!editing)return <button type="button" onClick={event=>{event.stopPropagation();setEditing(true)}} className="financial-value min-h-7 whitespace-nowrap px-1 text-xs hover:rounded hover:bg-secondary-soft">{value==null?'—':money.format(value)}</button>
 return <span className="inline-flex items-center gap-1"><input autoFocus type="number" min="0" step="0.01" inputMode="decimal" value={draft} onClick={event=>event.stopPropagation()} onChange={event=>setDraft(event.target.value)} onBlur={()=>{setEditing(false);if(draft!==(value==null?'':String(value)))onCommit(draft)}} className="control financial-value h-7 w-20 px-1.5 text-right text-xs"/><span className="financial-value text-[0.65rem]">EUR</span></span>
}
function InlineSelect({value,options,placeholder,onCommit}:{value:string;options:readonly (readonly [string,string])[];placeholder:string;onCommit:(value:string)=>void}){
 const [editing,setEditing]=useState(false)
 const label=options.find(([optionValue])=>optionValue===value)?.[1]??placeholder
 if(!editing)return <button type="button" onClick={event=>{event.stopPropagation();setEditing(true)}} className="min-h-7 max-w-36 truncate px-1 text-xs hover:rounded hover:bg-secondary-soft">{label}</button>
 return <select autoFocus value={value} onClick={event=>event.stopPropagation()} onBlur={()=>setEditing(false)} onChange={event=>{setEditing(false);onCommit(event.target.value)}} className="control h-7 min-w-20 max-w-36 px-1 text-center text-xs"><option value="">{placeholder}</option>{options.map(([optionValue,optionLabel])=><option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select>
}
function InlineDuration({value,onCommit}:{value:number;onCommit:(value:number)=>void}){
 const [draft,setDraft]=useState(value)
 const [open,setOpen]=useState(false)
 useEffect(()=>setDraft(value),[value])
 const days=Math.floor(draft/1440),hours=Math.floor((draft%1440)/60),minutes=draft%60
 const close=(save:boolean)=>{setOpen(false);if(save&&draft!==value)onCommit(draft)}
 return <><button type="button" onClick={event=>{event.stopPropagation();setOpen(true)}} className="min-h-7 whitespace-nowrap px-1 text-xs hover:rounded hover:bg-secondary-soft">{days?`${days} d `:''}{hours?`${hours} h `:''}{minutes} min</button>{open&&createPortal(<div className="fixed inset-0 z-[95] grid place-items-center bg-navigation/15 p-4" onMouseDown={()=>close(true)}><div className="w-full max-w-xs rounded-xl border border-border bg-surface p-4 shadow-2xl" onMouseDown={event=>event.stopPropagation()}><p className="mb-3 text-sm font-semibold">Duração</p><DurationSelect value={draft} onChange={setDraft}/><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={()=>close(false)} className="control min-h-9 px-3 text-xs">Cancelar</button><button type="button" onClick={()=>close(true)} className="min-h-9 rounded-lg bg-secondary px-3 text-xs font-semibold text-surface">Aplicar</button></div></div></div>,document.body)}</>
}
