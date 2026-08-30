import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "../../lib/supabase";

type Retainer = {
  id: string;
  firm_id: string;
  client_id: string;
  billing_entity_id: string;
  active: boolean;
  monthly_amount: number;
  currency: string;
  starts_on: string;
  ends_on: string | null;
  reference_hourly_rate: number | null;
  included_hours: number | null;
  billing_interval_months: number;
  notes: string | null;
};
type Charge = {
  id: string;
  period_start: string;
  amount: number;
  currency: string;
  status: "pending" | "invoiced" | "paid" | "uncollectible";
  invoice_reference: string | null;
  invoice_date: string | null;
  paid_on: string | null;
  notes: string | null;
};
type Society = { id: string; name: string };
type Summary = {
  minutes: number;
  movements: number;
  chargesTotal: number;
  invoiced: number;
  paid: number;
  periods: number;
  pendingPeriods: number;
  unpaidPeriods: number;
  effectiveHourlyRate: number | null;
};
const empty = () => ({
  billing_entity_id: "",
  active: true,
  monthly_amount: "",
  currency: "EUR",
  starts_on: new Date().toISOString().slice(0, 7) + "-01",
  ends_on: "",
  reference_hourly_rate: "",
  included_hours: "",
  billing_interval_months: "1",
  notes: "",
});
const monthLabel = (value: string) =>
  new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric" }).format(
    new Date(`${value.slice(0, 7)}-01T12:00:00`),
  );
const money = (value: number, currency = "EUR") =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value);
const hours = (minutes: number) =>
  `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")} min`;

export function ClientRetainerPanel({
  firmId,
  clientId,
  readOnly,
}: {
  firmId: string;
  clientId: string;
  readOnly: boolean;
}) {
  const [retainers, setRetainers] = useState<Retainer[]>([]),
    [retainer, setRetainer] = useState<Retainer | null>(null),
    [form, setForm] = useState(empty),
    [societies, setSocieties] = useState<Society[]>([]),
    [charges, setCharges] = useState<Charge[]>([]),
    [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const [retainerResult, societyResult, chargeResult, summaryResult] =
      await Promise.all([
        supabase
          .from("client_retainers")
          .select("*")
          .eq("client_id", clientId)
          .order("starts_on", { ascending: false }),
        supabase
          .from("billing_entities")
          .select("id,name")
          .eq("active", true)
          .order("name"),
        supabase
          .from("retainer_charges")
          .select(
            "id,period_start,amount,currency,status,invoice_reference,invoice_date,paid_on,notes",
          )
          .eq("client_id", clientId)
          .order("period_start", { ascending: false }),
        supabase.rpc("get_client_retainer_summary", { p_client_id: clientId }),
      ]);
    const failure =
      retainerResult.error ?? societyResult.error ?? chargeResult.error;
    if (failure) {
      if (failure.code !== "42P01" && failure.code !== "PGRST205")
        setError(failure.message);
      setLoading(false);
      return;
    }
    const allRetainers = (retainerResult.data ?? []) as Retainer[];
    const found = allRetainers[0] ?? null;
    setRetainers(allRetainers);
    setRetainer(found);
    setForm(
      found
        ? {
            billing_entity_id: found.billing_entity_id,
            active: found.active,
            monthly_amount: String(found.monthly_amount),
            currency: found.currency,
            starts_on: found.starts_on,
            ends_on: found.ends_on ?? "",
            reference_hourly_rate:
              found.reference_hourly_rate == null
                ? ""
                : String(found.reference_hourly_rate),
            included_hours:
              found.included_hours == null ? "" : String(found.included_hours),
            billing_interval_months: String(found.billing_interval_months ?? 1),
            notes: found.notes ?? "",
          }
        : empty(),
    );
    setSocieties((societyResult.data ?? []) as Society[]);
    setCharges((chargeResult.data ?? []) as Charge[]);
    if (!summaryResult.error && summaryResult.data)
      setSummary(summaryResult.data as unknown as Summary);
    setLoading(false);
  }, [clientId]);
  useEffect(() => {
    void load();
  }, [load]);
  function editTerms(item: Retainer | null) {
    setRetainer(item);
    setForm(item ? {
      billing_entity_id:item.billing_entity_id,
      active:item.active,
      monthly_amount:String(item.monthly_amount),
      currency:item.currency,
      starts_on:item.starts_on,
      ends_on:item.ends_on??"",
      reference_hourly_rate:item.reference_hourly_rate==null?"":String(item.reference_hourly_rate),
      included_hours:item.included_hours==null?"":String(item.included_hours),
      billing_interval_months:String(item.billing_interval_months??1),
      notes:item.notes??"",
    } : empty());
    setError("");
    setNotice("");
  }
  async function save() {
    if (!supabase) return;
    setSaving(true);
    setError("");
    setNotice("");
    const amount = Number(form.monthly_amount.replace(",", ".")),
      reference = form.reference_hourly_rate
        ? Number(form.reference_hourly_rate.replace(",", "."))
        : null,
      includedHours = form.included_hours
        ? Number(form.included_hours.replace(",", "."))
        : null;
    if (!form.billing_entity_id || !form.starts_on || !/^[A-Za-z]{3}$/.test(form.currency) || !Number.isFinite(amount) || amount < 0 || (reference!==null&&(!Number.isFinite(reference)||reference<0)) || (includedHours!==null&&(!Number.isFinite(includedHours)||includedHours<0))) {
      setError("Indique a Sociedade emissora, o início, a moeda e valores válidos.");
      setSaving(false);
      return;
    }
    const payload = {
      firm_id: firmId,
      client_id: clientId,
      billing_entity_id: form.billing_entity_id,
      active: form.active,
      monthly_amount: amount,
      currency: form.currency.toUpperCase(),
      starts_on: form.starts_on,
      ends_on: form.ends_on || null,
      reference_hourly_rate: reference,
      included_hours: includedHours,
      billing_interval_months: Number(form.billing_interval_months),
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const result = retainer
      ? await supabase
          .from("client_retainers")
          .update(payload)
          .eq("id", retainer.id)
      : await supabase.from("client_retainers").insert(payload);
    if (result.error) setError(result.error.message);
    else {
      setNotice("Condições da avença guardadas sem apagar o histórico.");
      await load();
    }
    setSaving(false);
  }
  async function createPeriods() {
    if (!supabase || !retainers.length) return;
    setSaving(true);
    setError("");
    const chronological = [...retainers].sort((a,b)=>a.starts_on.localeCompare(b.starts_on));
    const first = new Date(`${chronological[0].starts_on.slice(0, 7)}-01T12:00:00`),
      lastTerms = chronological[chronological.length-1],
      last = lastTerms.ends_on
        ? new Date(`${lastTerms.ends_on.slice(0, 7)}-01T12:00:00`)
        : new Date(),
      existing = new Set(charges.map((item) => item.period_start.slice(0, 7))),
      rows = [];
    for (
      const date = new Date(first);
      date <= last;
      date.setMonth(date.getMonth() + (termsForStep?.billing_interval_months??1))
    ) {
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const periodStart=`${period}-01`;
      const terms=chronological.find(item=>item.starts_on<=periodStart&&(!item.ends_on||item.ends_on>=periodStart));
      if (!existing.has(period)&&terms)
        rows.push({
          firm_id: firmId,
          retainer_id: terms.id,
          client_id: clientId,
          billing_entity_id: terms.billing_entity_id,
          period_start: periodStart,
          amount: terms.monthly_amount,
          currency: terms.currency,
        });
      var termsForStep=terms;
    }
    if (!rows.length) {
      setNotice("Não existem mensalidades em falta.");
      setSaving(false);
      return;
    }
    const result = await supabase.from("retainer_charges").insert(rows);
    if (result.error) setError(result.error.message);
    else {
      setNotice(
        `${rows.length} mensalidade${rows.length === 1 ? " criada" : "s criadas"}.`,
      );
      await load();
    }
    setSaving(false);
  }
  async function updateCharge(id: string, change: Partial<Charge>) {
    if (!supabase) return;
    setError("");
    const current = charges.find((item) => item.id === id);
    if (!current) return;
    const next = { ...current, ...change };
    if (change.status === "invoiced" && !next.invoice_date)
      next.invoice_date = new Date().toISOString().slice(0, 10);
    if (change.status === "paid") {
      next.invoice_date =
        next.invoice_date || new Date().toISOString().slice(0, 10);
      next.paid_on = next.paid_on || new Date().toISOString().slice(0, 10);
    }
    if (change.status === "pending") {
      next.invoice_date = null;
      next.paid_on = null;
      next.invoice_reference = null;
    }
    if (change.status === "uncollectible") {
      next.invoice_date =
        next.invoice_date || new Date().toISOString().slice(0, 10);
      next.paid_on = null;
    }
    const result = await supabase
      .from("retainer_charges")
      .update({
        status: next.status,
        invoice_reference: next.invoice_reference || null,
        invoice_date: next.invoice_date || null,
        paid_on: next.paid_on || null,
        notes: next.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (result.error) setError(result.error.message);
    else await load();
  }
  const pending = useMemo(
      () =>
        charges
          .filter((item) => item.status === "pending")
          .reduce((sum, item) => sum + item.amount, 0),
      [charges],
    ),
    unpaid = useMemo(
      () =>
        charges
          .filter((item) => item.status === "invoiced")
          .reduce((sum, item) => sum + item.amount, 0),
      [charges],
    );
  if (loading)
    return (
      <section className="mt-6 rounded-xl border border-border p-4">
        <p role="status">A carregar avença…</p>
      </section>
    );
  return (
    <section
      className="mt-6 rounded-xl border border-border p-4"
      aria-labelledby="retainer-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3
            id="retainer-title"
            className="font-display text-lg font-semibold"
          >
            Avença
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            As horas cobertas ficam separadas das mensalidades e não recebem
            valor individual.
          </p>
        </div>
        {retainers.length > 0 && !readOnly && (
          <button
            type="button"
            disabled={saving}
            onClick={() => void createPeriods()}
            className="min-h-10 rounded-lg border border-primary/40 px-3 font-semibold text-primary"
          >
            Criar mensalidades em falta
          </button>
        )}
      </div>
      {notice && (
        <p
          role="status"
          className="mt-3 rounded-lg bg-success-soft p-3 text-sm text-success"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-3 rounded-lg bg-danger-soft p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      {retainers.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="bg-surface-subtle"><tr><th className="p-2 text-left">Vigência</th><th className="p-2 text-right">Valor mensal</th><th className="p-2 text-right">Horas incluídas</th><th className="p-2 text-left">Sociedade</th><th className="p-2 text-center">Estado</th><th className="p-2"></th></tr></thead>
            <tbody>{retainers.map(item=><tr key={item.id} className={retainer?.id===item.id?'bg-secondary-soft':''}>
              <td className="border-t border-border p-2">{item.starts_on} — {item.ends_on??'sem fim'}</td>
              <td className="border-t border-border p-2 text-right">{money(item.monthly_amount,item.currency)}</td>
              <td className="border-t border-border p-2 text-right">{item.included_hours==null?'—':`${item.included_hours} h / ${item.billing_interval_months===1?'mês':`${item.billing_interval_months} meses`}`}</td>
              <td className="border-t border-border p-2">{societies.find(s=>s.id===item.billing_entity_id)?.name??'—'}</td>
              <td className="border-t border-border p-2 text-center">{item.active?'Activa':'Inactiva'}</td>
              <td className="border-t border-border p-2 text-right"><button type="button" onClick={()=>editTerms(item)} className="rounded-lg border border-border px-3 py-2 font-semibold">Editar</button></td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
      {!readOnly && retainers.length > 0 && (
        <button type="button" onClick={()=>editTerms(null)} className="mt-3 min-h-10 rounded-lg border border-primary/40 px-3 font-semibold text-primary">+ Nova condição temporal</button>
      )}
      <div>
        <fieldset
          disabled={readOnly || saving}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <label className="text-sm font-semibold">
            Sociedade emissora
            <select
              value={form.billing_entity_id}
              onChange={(event) =>
                setForm({ ...form, billing_entity_id: event.target.value })
              }
              className="control mt-1 w-full px-3"
            >
              <option value="">Seleccionar…</option>
              {societies.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Valor por período de facturação
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.monthly_amount}
              onChange={(event) =>
                setForm({ ...form, monthly_amount: event.target.value })
              }
              className="control mt-1 w-full px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Periodicidade da facturação
            <select value={form.billing_interval_months} onChange={event=>setForm({...form,billing_interval_months:event.target.value})} className="control mt-1 w-full px-3">
              <option value="1">Mensal</option><option value="2">Bimestral</option><option value="3">Trimestral</option><option value="6">Semestral</option><option value="12">Anual</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            Início
            <input
              type="date"
              value={form.starts_on}
              onChange={(event) =>
                setForm({ ...form, starts_on: event.target.value })
              }
              className="control mt-1 w-full px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Fim (opcional)
            <input
              type="date"
              value={form.ends_on}
              onChange={(event) =>
                setForm({ ...form, ends_on: event.target.value })
              }
              className="control mt-1 w-full px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Valor/hora de referência (opcional)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.reference_hourly_rate}
              onChange={(event) =>
                setForm({ ...form, reference_hourly_rate: event.target.value })
              }
              className="control mt-1 w-full px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            Horas incluídas por período (opcional)
            <input
              type="number"
              min="0"
              step="0.25"
              value={form.included_hours}
              onChange={(event) => setForm({ ...form, included_hours: event.target.value })}
              className="control mt-1 w-full px-3"
            />
            <span className="mt-1 block text-xs font-normal text-text-secondary">Permite comparar as horas realizadas com o limite acordado nesse período.</span>
          </label>
          <label className="text-sm font-semibold">
            Moeda
            <input
              maxLength={3}
              value={form.currency}
              onChange={(event) =>
                setForm({ ...form, currency: event.target.value })
              }
              className="control mt-1 w-full px-3 uppercase"
            />
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 text-sm font-semibold sm:col-span-2">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                setForm({ ...form, active: event.target.checked })
              }
            />
            Avença activa
          </label>
          <label className="text-sm font-semibold sm:col-span-2">
            Notas
            <textarea
              maxLength={2000}
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
              className="control mt-1 min-h-20 w-full p-3"
            />
          </label>
          {!readOnly && (
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving}
              className="min-h-10 rounded-lg bg-primary px-4 font-semibold text-surface sm:col-span-2 sm:justify-self-end"
            >
              {saving ? "A guardar…" : retainer ? "Guardar esta condição" : "Adicionar condição"}
            </button>
          )}
        </fieldset>
      </div>
      {retainers.length > 0 && (
        <>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-surface-subtle p-3">
              <dt className="text-xs text-text-secondary">Horas cobertas</dt>
              <dd className="mt-1 font-semibold">
                {hours(summary?.minutes ?? 0)}
              </dd>
            </div>
            <div className="rounded-lg bg-surface-subtle p-3">
              <dt className="text-xs text-text-secondary">
                Valor/hora efectivo
              </dt>
              <dd className="mt-1 font-semibold">
                {summary?.effectiveHourlyRate == null
                  ? "Sem horas facturadas"
                  : money(summary.effectiveHourlyRate, retainers[0].currency)}
              </dd>
            </div>
            <div className="rounded-lg bg-warning-soft p-3">
              <dt className="text-xs text-text-secondary">
                Avenças por facturar
              </dt>
              <dd className="mt-1 font-semibold">
                {money(pending, retainers[0].currency)}
              </dd>
            </div>
            <div className="rounded-lg bg-danger-soft p-3">
              <dt className="text-xs text-text-secondary">
                Facturado por liquidar
              </dt>
              <dd className="mt-1 font-semibold">
                {money(unpaid, retainers[0].currency)}
              </dd>
            </div>
          </dl>
          <div className="mt-5 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[58rem] text-sm">
              <thead className="bg-surface-subtle">
                <tr>
                  <th className="p-2 text-left">Período</th>
                  <th className="p-2 text-right">Valor</th>
                  <th className="p-2 text-center">Estado</th>
                  <th className="p-2 text-left">N.º factura</th>
                  <th className="p-2 text-center">Data factura</th>
                  <th className="p-2 text-center">Liquidação</th>
                </tr>
              </thead>
              <tbody>
                {charges.map((charge) => (
                  <tr key={charge.id}>
                    <td className="border-t border-border p-2 capitalize">
                      {monthLabel(charge.period_start)}
                    </td>
                    <td className="border-t border-border p-2 text-right">
                      {money(charge.amount, charge.currency)}
                    </td>
                    <td className="border-t border-border p-2">
                      <select
                        disabled={readOnly}
                        aria-label={`Estado de ${monthLabel(charge.period_start)}`}
                        value={charge.status}
                        onChange={(event) =>
                          void updateCharge(charge.id, {
                            status: event.target.value as Charge["status"],
                          })
                        }
                        className="control w-full px-2"
                      >
                        <option value="pending">Por facturar</option>
                        <option value="invoiced">Facturada</option>
                        <option value="paid">Liquidada</option>
                        <option value="uncollectible">Incobrável</option>
                      </select>
                    </td>
                    <td className="border-t border-border p-2">
                      <input
                        disabled={readOnly || charge.status === "pending"}
                        aria-label={`N.º factura de ${monthLabel(charge.period_start)}`}
                        value={charge.invoice_reference ?? ""}
                        onBlur={(event) =>
                          void updateCharge(charge.id, {
                            invoice_reference: event.target.value,
                          })
                        }
                        onChange={(event) =>
                          setCharges((current) =>
                            current.map((item) =>
                              item.id === charge.id
                                ? {
                                    ...item,
                                    invoice_reference: event.target.value,
                                  }
                                : item,
                            ),
                          )
                        }
                        className="control w-full px-2"
                      />
                    </td>
                    <td className="border-t border-border p-2">
                      <input
                        disabled={readOnly || charge.status === "pending"}
                        aria-label={`Data da factura de ${monthLabel(charge.period_start)}`}
                        type="date"
                        value={charge.invoice_date ?? ""}
                        onChange={(event) =>
                          void updateCharge(charge.id, {
                            invoice_date: event.target.value || null,
                          })
                        }
                        className="control w-full px-2"
                      />
                    </td>
                    <td className="border-t border-border p-2">
                      <input
                        disabled={readOnly || charge.status !== "paid"}
                        aria-label={`Data de liquidação de ${monthLabel(charge.period_start)}`}
                        type="date"
                        value={charge.paid_on ?? ""}
                        onChange={(event) =>
                          void updateCharge(charge.id, {
                            paid_on: event.target.value || null,
                          })
                        }
                        className="control w-full px-2"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!charges.length && (
              <p className="p-5 text-center text-text-secondary">
                Guarde a avença e crie as mensalidades para iniciar o controlo
                financeiro.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
