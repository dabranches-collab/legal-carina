import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import {
  StandardDataTable,
  type TableColumn,
} from "../../components/table/StandardDataTable";
import { supabase } from "../../lib/supabase";
import { CreateWorkEntryModal } from "./CreateWorkEntryModal";
import { EditWorkEntryModal } from "./EditWorkEntryModal";

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
];

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
    [professional, setProfessional] = useState(""),
    [billing, setBilling] = useState(""),
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
      const metadata = await supabase.rpc("search_work_entries", {
        p_page: 1,
        p_page_size: 100,
        ...searchArgs,
      });
      if (!active) return;
      if (metadata.error)
        setError(
          metadata.error.message ?? "Não foi possível carregar os movimentos.",
        );
      else {
        const next = metadata.data as SearchMeta;
        setMeta(next);
        setRows(next.items ?? []);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [searchArgs, refreshToken]);
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
      `Tipo de cliente: ${clientType === "company" ? "Empresa" : "Particular"}`,
  ].filter(Boolean) as string[];
  const loadExportRows = useCallback(async () => {
    if (!supabase) throw new Error("Ligação ao Supabase indisponível.");
    const result = await supabase.rpc("export_visible_work_entries", {
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
    });
    if (result.error)
      throw new Error(
        result.error.message ?? "Não foi possível exportar os movimentos.",
      );
    return (Array.isArray(result.data) ? result.data : []) as Entry[];
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
      render: (row) =>
        new Date(`${row.work_date}T00:00:00`).toLocaleDateString("pt-PT"),
    },
    {
      id: "client",
      label: "Cliente",
      sticky: true,
      value: (row) => row.client_name,
    },
    { id: "code", label: "Código", value: (row) => row.client_code },
    {
      id: "matter",
      label: "Processo",
      value: (row) =>
        [row.matter_code, row.matter_title].filter(Boolean).join(" · "),
    },
    {
      id: "activity",
      label: "Actividade",
      value: (row) => row.activity_description,
    },
    {
      id: "responsible",
      label: "Responsável",
      value: (row) => row.professional_name,
    },
    {
      id: "duration",
      label: "Duração (min)",
      kind: "number",
      align: "right",
      value: (row) => row.duration_minutes,
    },
    {
      id: "rate",
      label: "Valor/hora (EUR)",
      kind: "money",
      align: "right",
      value: (row) => row.effective_hourly_rate,
      render: (row) => (
        <span className="financial-value">
          {row.effective_hourly_rate == null
            ? "Sem acesso ou sem preço"
            : money.format(row.effective_hourly_rate)}
        </span>
      ),
    },
    {
      id: "amount",
      label: "Valor (EUR)",
      kind: "money",
      align: "right",
      value: (row) => row.effective_amount,
      render: (row) => (
        <span className="financial-value">
          {row.effective_amount == null
            ? "Sem acesso"
            : money.format(row.effective_amount)}
        </span>
      ),
    },
    {
      id: "society",
      label: "Sociedade",
      value: (row) => row.billing_entity_name,
    },
    {
      id: "invoiced",
      label: "Facturado",
      kind: "boolean",
      value: (row) => row.is_invoiced,
      render: (row) => (row.is_invoiced ? "Sim" : "Não"),
    },
    {
      id: "invoiceNumber",
      label: "N.º factura",
      value: (row) => row.invoice_number,
    },
    {
      id: "invoiceDate",
      label: "Data factura",
      kind: "date",
      value: (row) => row.invoice_date,
      render: (row) =>
        row.invoice_date
          ? new Date(`${row.invoice_date}T00:00:00`).toLocaleDateString("pt-PT")
          : "—",
    },
    {
      id: "paid",
      label: "Pago",
      kind: "boolean",
      value: (row) => row.is_paid,
      render: (row) => (row.is_paid ? "Sim" : "Não"),
    },
    { id: "archive", label: "Arquivo", value: (row) => row.archive_status },
    { id: "notes", label: "Observações", value: (row) => row.observations },
    { id: "origin", label: "Origem", value: (row) => row.source_type },
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
      {!loading && meta.total > rows.length && (
        <p
          role="alert"
          className="rounded-lg bg-warning-soft p-3 text-sm text-warning"
        >
          A vista apresenta os primeiros {number.format(rows.length)} de{" "}
          {number.format(meta.total)} movimentos. Restrinja os filtros antes de
          exportar.
        </p>
      )}
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
