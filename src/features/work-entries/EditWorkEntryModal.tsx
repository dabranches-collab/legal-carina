import { createPortal } from 'react-dom';
import { TaskReferrerFields } from './TaskReferrerFields'
import { isLegalteam, professionalName } from '../../lib/professionalNames'
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { useModalLifecycle } from "../../hooks/useModalLifecycle";
import { DurationSelect } from "./DurationSelect";
import { CalendarDateInput } from "../../components/CalendarDateInput";
import { WorkEntryExpensesEditor } from "./WorkEntryExpensesEditor";
import type { ExpenseDraft } from "./workEntryExpenses";
import {
  deleteWorkEntry,
  getWorkEntryForEdit,
  getWorkEntryOptions,
  updateWorkEntry,
  type EditableWorkEntry,
  type WorkEntryOptions,
} from "./workEntryCompatibility";

type OptionData = WorkEntryOptions;
type Editable = EditableWorkEntry;
const statuses = [
  ["draft", "Rascunho"],
  ["pending_review", "Em revisão"],
  ["approved", "Aprovado"],
  ["invoiced", "Facturado"],
  ["paid", "Pago"],
  ["uncollectible_uninvoiced", "Incobrável — não facturado"],
  ["uncollectible_invoiced", "Incobrável — facturado e não pago"],
  ["non_billable", "Não facturável"],
  ["cancelled", "Cancelado"],
];
const archives = [
  ["", "Sem arquivo"],
  ["none", "Nenhum"],
  ["gaveta", "Gaveta"],
  ["dossier", "Dossier"],
  ["findos", "Findos"],
  ["digital", "Digital"],
  ["other", "Outro"],
];
const charges = [
  ["", "Não definido"],
  ["hourly", "À hora"],
  ["fixed", "Valor fixo"],
  ["retainer", "Avença"],
  ["hour_package", "Pacote de horas"],
  ["per_act", "Por acto"],
  ["free", "Gratuito"],
  ["non_billable", "Não facturável"],
  ["manual_negotiated", "Negociado manualmente"],
];
const numeric = (value: string) => (value === "" ? null : Number(value));

const recalculateAmount = (
  durationMinutes: number,
  hourlyRate: number | null,
  discountAmount: number | null,
) => hourlyRate === null
  ? null
  : Math.max(0, Math.round((hourlyRate * durationMinutes / 60 - (discountAmount ?? 0)) * 100) / 100);

function withStatus(entry: Editable, status: string): Editable {
  if (status === "paid") return { ...entry, status, is_invoiced: true, is_paid: true };
  if (status === "invoiced" || status === "uncollectible_invoiced") {
    return { ...entry, status, is_invoiced: true, is_paid: false };
  }
  if (status === "uncollectible_uninvoiced") {
    return { ...entry, status, is_invoiced: false, is_paid: false, invoice_date: null };
  }
  return { ...entry, status, is_invoiced: false, is_paid: false, invoice_date: null };
}

export function EditWorkEntryModal({
  entryId,
  onClose,
  onSaved,
  canDelete=true,
  requiresReason,
}: {
  entryId: string;
  onClose: () => void;
  onSaved: (action?: "updated" | "deleted") => void;
  canDelete?: boolean;
  requiresReason?: boolean;
}) {
  const [options, setOptions] = useState<OptionData | null>(null),
    [entry, setEntry] = useState<Editable | null>(null),
    [originalEntry,setOriginalEntry]=useState(''),
    [originalBillingScope,setOriginalBillingScope]=useState<'standard'|'retainer'>('standard'),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false);
  const [reason, setReason] = useState(""),
    [deleteMode, setDeleteMode] = useState(false);
  const [expenseDrafts,setExpenseDrafts]=useState<ExpenseDraft[]>([]);
  useModalLifecycle(onClose, saving);
  useEffect(() => {
    let active = true;
    void (async () => {
      if (!supabase) {
        setError("Ligação ao Supabase indisponível.");
        return;
      }
      const [form, item] = await Promise.all([
        getWorkEntryOptions(),
        getWorkEntryForEdit(entryId),
      ]);
      if (!active) return;
      if (form.error || item.error) {
        setError(
          form.error?.message ??
            item.error?.message ??
            "Não foi possível carregar o movimento.",
        );
        return;
      }
      if (!item.data) {
        setError("Movimento inexistente ou sem autorização de edição.");
        return;
      }
      setOptions(form.data);
      const loaded={...item.data,billing_scope:item.data.billing_scope??'standard'} as Editable;
      setEntry(loaded);setOriginalEntry(JSON.stringify(loaded));
      setOriginalBillingScope(item.data.billing_scope??'standard');
    })();
    return () => {
      active = false;
    };
  }, [entryId]);
  const dirty=Boolean(entry&&(JSON.stringify(entry)!==originalEntry||expenseDrafts.length));
  async function submit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!supabase || !entry) return;
    if(isLegalteam(options?.societies.find(item=>item.id===entry.billing_entity_id)?.name??'')&&(!entry.task_referrer||(entry.task_referrer==='other'&&!entry.task_referrer_other?.trim()))){setError('Indique o angariador da tarefa.');return}
    if (entry.is_paid && !entry.is_invoiced) {
      setError("Um movimento pago tem de estar facturado.");
      return;
    }
    if (entry.is_invoiced && !entry.invoice_date) {
      setError("Indique a data da factura.");
      return;
    }
    if (requiresReason === true && !reason.trim()) {
      setError("Indique o motivo da alteração para o registo de auditoria.");
      return;
    }
    setSaving(true);
    setError("");
    if(entry.billing_scope!==originalBillingScope&&entry.billing_scope==='standard'){const scope=await supabase.rpc('set_work_entry_billing_scope',{p_work_entry_id:entry.id,p_billing_scope:'standard',p_reason:reason||null});if(scope.error){setError(scope.error.message);setSaving(false);return}}
    const result = await updateWorkEntry(entry, reason);
    if (result.error) {
      const messages:Record<string,string>={
        "is_invoiced requires a matching manual override":"Não foi possível registar a facturação na auditoria. Tente novamente.",
        "is_paid requires a matching manual override":"Não foi possível registar o pagamento na auditoria. Tente novamente.",
        "override reason required":"Indique o motivo da alteração manual dos valores financeiros.",
        "not authorized":"Não tem autorização para editar este movimento.",
      };
      setError(messages[result.error.message]??result.error.message);
      setSaving(false);
      return;
    }
    if(entry.billing_scope!==originalBillingScope&&entry.billing_scope==='retainer'){const scope=await supabase.rpc('set_work_entry_billing_scope',{p_work_entry_id:entry.id,p_billing_scope:'retainer',p_reason:reason||null});if(scope.error){setError(scope.error.message);setSaving(false);return}}
    onSaved("updated");
  }
  async function remove() {
    if (!entry) return;
    if (requiresReason !== false && !reason.trim()) {
      setError("Indique o motivo da eliminação para o registo de auditoria.");
      return;
    }
    setSaving(true);
    setError("");
    const result = await deleteWorkEntry(entry.id, reason.trim());
    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }
    onSaved("deleted");
  }
  return createPortal(
    <div
      className="app-safe-fixed fixed z-[85] grid place-items-center overflow-y-auto bg-navigation/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-work-title"
    >
      <form
        onSubmit={submit}
        className="card my-auto max-h-[calc(100dvh-2rem)] w-full max-w-4xl overflow-y-auto p-6 pb-0"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="edit-work-title"
              className="font-display text-2xl font-semibold"
            >
              Editar movimento
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Ficha completa. Os campos técnicos de auditoria permanecem
              protegidos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="min-h-11 min-w-11 text-xl"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>
        {error && !deleteMode && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-danger-soft p-3 text-sm text-danger"
          >
            {error}
          </p>
        )}
        {!entry || !options ? (
          <p className="mt-5 text-sm text-text-secondary">A carregar…</p>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">
              Data
              <CalendarDateInput required value={entry.work_date} onChange={(value)=>setEntry({...entry,work_date:value})} className="mt-1 w-full px-3"/>
            </label>
            <label className="text-sm">
              Responsável
              <select
                required
                value={entry.professional_id}
                onChange={(e) =>
                  setEntry({ ...entry, professional_id: e.target.value })
                }
                className="control mt-1 w-full px-3"
              >
                {options.responsibles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {professionalName(item.display_name)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Sociedade
              <select
                value={entry.billing_entity_id ?? ""}
                onChange={(e) =>
                  setEntry({
                    ...entry,
                    billing_entity_id: e.target.value || null,
                  })
                }
                className="control mt-1 w-full px-3"
              >
                <option value="">Por atribuir</option>
                {options.societies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm sm:col-span-2 lg:col-span-3">
              Cliente
              <select
                required
                value={entry.client_profile_id}
                onChange={(e) =>
                  setEntry({
                    ...entry,
                    client_profile_id: e.target.value,
                    matter_id: null,
                  })
                }
                className="control mt-1 w-full px-3"
              >
                {options.clientProfiles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.display_name} ·{" "}
                    {item.client_type === "individual"
                      ? "Particular"
                      : "Empresa"}{" "}
                    · {item.client_code}
                  </option>
                ))}
              </select>
            </label>
            {isLegalteam(options.societies.find(item=>item.id===entry.billing_entity_id)?.name??'')&&<TaskReferrerFields value={entry.task_referrer??''} other={entry.task_referrer_other??''} onChange={(task_referrer,task_referrer_other)=>setEntry({...entry,task_referrer,task_referrer_other})}/>}
            <label className="text-sm sm:col-span-2 lg:col-span-3">Tratamento para facturação<select aria-label="Tratamento para facturação" value={entry.billing_scope} onChange={event=>{const billing_scope=event.target.value as 'standard'|'retainer';setEntry({...entry,billing_scope,...(billing_scope==='retainer'?{effective_hourly_rate:null,effective_amount:null,effective_discount_amount:null,discount_percentage:null,discount_reason:null,charge_type:'retainer',is_billable:false,is_invoiced:false,invoice_date:null,is_paid:false,status:'draft'}:{charge_type:'hourly',is_billable:true})})}} className="control mt-1 w-full px-3"><option value="standard">Fora da avença · facturação normal</option><option value="retainer">Coberto pela avença · apenas horas</option></select><span className="mt-1 block text-xs text-text-secondary">Ao escolher avença, o movimento perde preço e valor individual.</span></label>
            <label className="text-sm sm:col-span-2 lg:col-span-3">
              Actividade
              <textarea
                required
                value={entry.activity_description}
                onChange={(e) =>
                  setEntry({ ...entry, activity_description: e.target.value })
                }
                className="control mt-1 min-h-24 w-full p-3"
              />
            </label>
            <label className="text-sm sm:col-span-2 lg:col-span-3">
              Observações
              <textarea
                value={entry.observations ?? ""}
                onChange={(e) =>
                  setEntry({ ...entry, observations: e.target.value })
                }
                className="control mt-1 min-h-20 w-full p-3"
              />
            </label>
            <label className="text-sm">
              Duração
              <DurationSelect
                value={entry.duration_minutes}
                onChange={(duration_minutes)=>setEntry({
                  ...entry,
                  duration_minutes,
                  effective_amount: recalculateAmount(
                    duration_minutes,
                    entry.effective_hourly_rate,
                    entry.effective_discount_amount,
                  ),
                })}
              />
            </label>
            <WorkEntryExpensesEditor entryId={entry.id} drafts={expenseDrafts} onDraftsChange={setExpenseDrafts} requiresReason={requiresReason===true}/>
            <label className="text-sm">
              Preço/hora efectivo
              <input
                disabled={entry.billing_scope==='retainer'}
                type="number"
                min="0"
                step="0.01"
                value={entry.effective_hourly_rate ?? ""}
                onChange={(e) =>
                  setEntry((current) => {
                    if (!current) return current;
                    const effective_hourly_rate = numeric(e.target.value);
                    return {
                      ...current,
                      effective_hourly_rate,
                      charge_type: effective_hourly_rate === null ? current.charge_type : "hourly",
                      effective_amount: recalculateAmount(
                        current.duration_minutes,
                        effective_hourly_rate,
                        current.effective_discount_amount,
                      ),
                    };
                  })
                }
                className="control mt-1 w-full px-3"
              />
            </label>
            <label className="text-sm">
              Valor final
              <input
                disabled={entry.billing_scope==='retainer'}
                type="number"
                min="0"
                step="0.01"
                value={entry.effective_amount ?? ""}
                onChange={(e) =>
                  setEntry({
                    ...entry,
                    effective_amount: numeric(e.target.value),
                  })
                }
                className="control mt-1 w-full px-3"
              />
            </label>
            <label className="text-sm">
              Moeda
              <input
                required
                pattern="[A-Z]{3}"
                maxLength={3}
                value={entry.currency}
                onChange={(e) =>
                  setEntry({ ...entry, currency: e.target.value.toUpperCase() })
                }
                className="control mt-1 w-full px-3"
              />
            </label>
            <label className="text-sm">
              Tipo de cobrança
              <select
                disabled={entry.billing_scope==='retainer'}
                value={entry.charge_type ?? ""}
                onChange={(e) =>
                  setEntry({ ...entry, charge_type: e.target.value || null })
                }
                className="control mt-1 w-full px-3"
              >
                {charges.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Desconto efectivo
              <input
                type="number"
                min="0"
                step="0.01"
                value={entry.effective_discount_amount ?? ""}
                onChange={(e) =>
                  setEntry((current) => {
                    if (!current) return current;
                    const effective_discount_amount = numeric(e.target.value);
                    return {
                      ...current,
                      effective_discount_amount,
                      discount_percentage: null,
                      effective_amount: recalculateAmount(
                        current.duration_minutes,
                        current.effective_hourly_rate,
                        effective_discount_amount,
                      ),
                    };
                  })
                }
                className="control mt-1 w-full px-3"
              />
            </label>
            <label className="text-sm">
              Desconto (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={entry.discount_percentage ?? ""}
                onChange={(e) =>
                  setEntry((current) => {
                    if (!current) return current;
                    const discount_percentage = numeric(e.target.value);
                    const baseAmount = current.effective_hourly_rate === null
                      ? null
                      : current.effective_hourly_rate * current.duration_minutes / 60;
                    const effective_discount_amount = baseAmount === null || discount_percentage === null
                      ? null
                      : Math.round(baseAmount * discount_percentage) / 100;
                    return {
                      ...current,
                      discount_percentage,
                      effective_discount_amount,
                      effective_amount: baseAmount === null
                        ? null
                        : Math.max(0, Math.round((baseAmount - (effective_discount_amount ?? 0)) * 100) / 100),
                    };
                  })
                }
                className="control mt-1 w-full px-3"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Motivo do desconto
              <input
                value={entry.discount_reason ?? ""}
                onChange={(e) =>
                  setEntry({ ...entry, discount_reason: e.target.value })
                }
                className="control mt-1 w-full px-3"
              />
            </label>
            <label className="text-sm">
              Estado
              <select
                value={entry.status}
                onChange={(e) => setEntry(withStatus(entry, e.target.value))}
                className="control mt-1 w-full px-3"
              >
                {statuses.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Arquivo
              <select
                value={entry.archive_status ?? ""}
                onChange={(e) =>
                  setEntry({ ...entry, archive_status: e.target.value || null })
                }
                className="control mt-1 w-full px-3"
              >
                {archives.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              Origem
              <input
                readOnly
                value={entry.source_type}
                className="control mt-1 w-full px-3 opacity-70"
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={entry.billing_scope==='retainer'}
                checked={entry.is_billable}
                onChange={(e) =>
                  setEntry({ ...entry, is_billable: e.target.checked })
                }
              />
              Facturável
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={entry.billing_scope==='retainer'}
                checked={entry.is_invoiced}
                onChange={(e) =>
                  setEntry({
                    ...entry,
                    is_invoiced: e.target.checked,
                    is_paid: e.target.checked ? entry.is_paid : false,
                    invoice_date: e.target.checked ? entry.invoice_date : null,
                    status: e.target.checked
                      ? entry.is_paid
                        ? "paid"
                        : "invoiced"
                      : "approved",
                  })
                }
              />
              Facturado
            </label>
            <label className="text-sm">
              Data da factura
              <CalendarDateInput
                disabled={entry.billing_scope==='retainer'}
                ariaLabel="Data da factura"
                value={entry.invoice_date ?? ""}
                onChange={(value) => {
                  const invoiceDate = value || null;
                  setEntry({
                    ...entry,
                    invoice_date: invoiceDate,
                    is_invoiced: Boolean(invoiceDate),
                    is_paid: invoiceDate ? entry.is_paid : false,
                    status: invoiceDate
                      ? entry.is_paid
                        ? "paid"
                        : "invoiced"
                      : "approved",
                  });
                }}
                className="mt-1 w-full px-3"
              />
            </label>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!entry.is_invoiced}
                checked={entry.is_paid}
                onChange={(e) =>
                  setEntry({
                    ...entry,
                    is_paid: e.target.checked,
                    status: e.target.checked ? "paid" : "invoiced",
                  })
                }
              />
              Pago
            </label>
            <label className="text-sm sm:col-span-2">
              Motivo da alteração manual{requiresReason === false ? " (opcional)" : ""}
              <textarea
                required={requiresReason === true}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="control mt-1 min-h-20 w-full p-3"
              />
            </label>
          </div>
        )}
        {deleteMode && (
          <section className="mt-6 rounded-xl border border-danger/40 bg-danger-soft p-4">
            <h3 className="font-semibold text-danger">
              Eliminar definitivamente
            </h3>
            <p className="mt-1 text-sm text-danger">
              Esta operação apaga o movimento. Facturas e importações
              associadas são preservadas, mas deixam de ter ligação ao
              movimento.
            </p>
            {error && (
              <p className="mt-2 text-sm font-semibold text-danger">{error}</p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteMode(false)}
                className="control px-4 py-2 font-semibold"
              >
                Cancelar eliminação
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void remove()}
                className="rounded-lg bg-danger px-4 py-2 font-semibold text-surface disabled:opacity-50"
              >
                Sim, apagar movimento
              </button>
            </div>
          </section>
        )}
        <div className="sticky bottom-0 z-50 -mx-6 mt-6 flex flex-wrap justify-between gap-3 border-t border-border bg-surface px-6 py-3 pb-[max(.75rem,var(--safe-bottom))] shadow-[0_-8px_18px_-14px_rgba(0,0,0,.45)]">
          {canDelete?<button
            type="button"
            disabled={saving || !entry}
            onClick={() => setDeleteMode(true)}
            className="min-h-11 rounded-lg border border-danger px-4 font-semibold text-danger disabled:opacity-40"
          >
            Apagar movimento
          </button>:<span />}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="control px-4 py-2 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !entry || !options || !dirty}
              className="rounded-lg bg-primary px-4 py-2 font-semibold text-surface disabled:opacity-50"
            >
              {saving ? "A guardar…" : "Guardar alterações"}
            </button>
          </div>
        </div>
      </form>
    </div>, document.body
  );
}
