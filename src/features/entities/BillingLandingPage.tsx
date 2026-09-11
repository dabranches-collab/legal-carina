import { useEffect, useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { supabase } from "../../lib/supabase";
import { AttentionPanel } from "./AttentionPanel";
import { getAttentionCounts, type AttentionCounts } from "./attentionCounts";
import { DashboardProcessingGrid } from "./DashboardProcessingGrid";

type BillingSummary = {
  id: string;
  society: string;
  minutes: number;
  worked: number | null;
  invoiced: number | null;
  paid: number | null;
  receivable: number | null;
  activeClients: number;
} & AttentionCounts;

const money = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("pt-PT");
const financial = (value: number | null) =>
  value == null ? "Sem acesso" : money.format(value);

export function BillingLandingPage({
  onSelect,
}: {
  onSelect: (society: string) => void;
}) {
  const [data, setData] = useState<BillingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingNames,setProcessingNames]=useState<string[]>([]);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!supabase) {
        setError("Ligação ao Supabase indisponível.");
        setLoading(false);
        return;
      }
      const entities=await supabase.from("billing_entities").select("id,name").eq("active", true);
      if(!active)return;
      if(!entities.error)setProcessingNames((entities.data??[]).map(item=>item.name).sort((a,b)=>a.localeCompare(b,'pt-PT')));
      const breakdowns=await supabase.rpc("get_dashboard_metric_breakdowns");
      if (!active) return;
      if (entities.error || breakdowns.error) {
        setError(entities.error?.message ?? breakdowns.error?.message ?? "Não foi possível carregar as sociedades.");
      } else {
        const rows = (breakdowns.data ?? []) as BillingSummary[];
        const byName = new Map(rows.map((row) => [row.society, row]));
        const baseData = (entities.data ?? []).sort((a,b)=>a.name.localeCompare(b.name,'pt-PT')).map(({ id, name }) => ({
            ...(byName.get(name) ?? {
              society: name,
              minutes: 0,
              worked: 0,
              invoiced: 0,
              paid: 0,
              receivable: 0,
              activeClients: 0,
            }), id,
          }));
        const counts=await Promise.all(baseData.map(item=>getAttentionCounts({billingEntityId:item.id})));
        if(active)setData(baseData.map((item,index)=>({...item,...counts[index]})));
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <DashboardProcessingGrid cards={(processingNames.length?processingNames:['Sociedade 1','Sociedade 2','Sociedade 3']).map((name,index)=>({key:`${name}-${index}`,title:name,subtitle:'Resumo da sociedade',icon:'building',metrics:['Clientes','Horas','Facturado','Por receber']}))}/>;
  if (error) return <DashboardProcessingGrid error={error} label="Erro ao calcular o dashboard de sociedades" cards={(processingNames.length?processingNames:['Sociedade 1','Sociedade 2','Sociedade 3']).map((name,index)=>({key:`${name}-${index}`,title:name,subtitle:'Resumo da sociedade',icon:'building',metrics:['Clientes','Horas','Facturado','Por receber']}))}/>;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-text-secondary">
          Resumo operacional e acesso aos dashboards de cada sociedade.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        {data.map((item) => (
          <article key={item.society} className="card flex min-h-80 flex-col overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-secondary via-accent to-secondary" />
            <div className="flex flex-1 flex-col p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary-soft text-secondary">
                  <Icon name="building" className="size-6" />
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold">{item.society}</h3>
                  <p className="mt-1 text-xs text-text-secondary">Resumo da sociedade</p>
                </div>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-surface-subtle p-3"><dt className="text-xs text-text-secondary">Clientes</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{number.format(item.activeClients)}</dd></div>
                <div className="rounded-lg bg-surface-subtle p-3"><dt className="text-xs text-text-secondary">Horas</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{number.format(Math.round(item.minutes / 60))} h</dd></div>
                <div className="rounded-lg bg-surface-subtle p-3"><dt className="text-xs text-text-secondary">Facturado</dt><dd className="financial-value mt-1 text-lg font-semibold tabular-nums">{financial(item.invoiced)}</dd></div>
                <div className="rounded-lg bg-surface-subtle p-3"><dt className="text-xs text-text-secondary">Por receber</dt><dd className="financial-value mt-1 text-lg font-semibold tabular-nums">{financial(item.receivable)}</dd></div>
              </dl>
              <AttentionPanel counts={item} links={{uninvoiced:`?view=work&billingEntityId=${item.id}&collectionState=uninvoiced`,unpaid:`?view=work&billingEntityId=${item.id}&collectionState=unpaid`,missingPrice:`?view=work&billingEntityId=${item.id}&missingPrice=true`}}/>
              <button type="button" onClick={() => onSelect(item.society)} className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-lg bg-secondary px-4 text-sm font-semibold text-surface hover:brightness-110">
                Abrir dashboard <Icon name="chevron" className="size-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
