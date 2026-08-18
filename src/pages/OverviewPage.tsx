import { useEffect, useState } from "react";
import { MetricCard } from "../components/dashboard/MetricCard";
import {
  AnnualValueChart,
  DonutChart,
  HorizontalChart,
  MonthlyValueChart,
  SocietyEvolutionChart,
  StackedSocietyChart,
  type ChartPoint,
  type MonthlyYearPoint,
  type SocietyMonthPoint,
  type SocietyYearPoint,
} from "../components/dashboard/Charts";
import { supabase } from "../lib/supabase";

type AnnualPoint = ChartPoint & { minutes: number };
type MoneyValue = number | null;
type MetricBreakdown = {
  society: string;
  minutes: number;
  worked: MoneyValue;
  invoiced: MoneyValue;
  paid: MoneyValue;
  receivable: MoneyValue;
  uninvoicedCount: number;
  unpaidCount: number;
  averageRate: MoneyValue;
  activeClients: number;
  missingPrice: number;
  missingBilling: number;
};
type OverviewData = {
  metrics: {
    minutes: number;
    worked: MoneyValue;
    invoiced: MoneyValue;
    paid: MoneyValue;
    receivable: MoneyValue;
    uninvoicedCount: number;
    unpaidCount: number;
    averageRate: MoneyValue;
    activeClients: number;
    missingPrice: number;
    missingBilling: number;
    overrides: number;
    importErrors: number;
  };
  annual: AnnualPoint[];
  monthly: ChartPoint[];
  monthlyByYear: MonthlyYearPoint[];
  billingAnnual: SocietyYearPoint[];
  billingMonthly: SocietyMonthPoint[];
  latestYear: number;
  byClient: ChartPoint[];
  byBilling: ChartPoint[];
  byProfessional: ChartPoint[];
  byArchive: ChartPoint[];
  clientTypes: ChartPoint[];
};
const money = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});
const number = new Intl.NumberFormat("pt-PT");
const financial = (value: MoneyValue) =>
  value == null ? "Sem acesso" : money.format(value);
const percent = (part: MoneyValue, total: MoneyValue) =>
  part != null && total != null && total > 0
    ? Math.round((part / total) * 100)
    : 0;

export function OverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [breakdowns, setBreakdowns] = useState<MetricBreakdown[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      if (!supabase) {
        setError("Ligação ao Supabase indisponível.");
        return;
      }
      const [overview, breakdown] = await Promise.all([
        supabase.rpc("get_dashboard_overview"),
        supabase.rpc("get_dashboard_metric_breakdowns"),
      ]);
      if (!active) return;
      const { data: result, error: failure } = overview;
      if (failure) {
        setError(failure.message);
        return;
      }
      const next = result as OverviewData;
      const serverAnnual = next.billingAnnual ?? [];
      next.annual = next.annual.map((point) => ({
        ...point,
        societies: Object.fromEntries(
          serverAnnual
            .filter((item) => item.year === Number(point.label))
            .map((item) => [item.society, item.value]),
        ),
      }));
      setBreakdowns(
        breakdown.error
          ? []
          : ((breakdown.data as MetricBreakdown[] | null) ?? []),
      );
      setData(next);
    })();
    return () => {
      active = false;
    };
  }, []);
  if (error)
    return (
      <div
        role="alert"
        className="card border-danger/30 bg-danger-soft p-6 text-danger"
      >
        Não foi possível carregar o dashboard: {error}
      </div>
    );
  if (!data)
    return (
      <div role="status" className="space-y-4">
        <div className="card flex min-h-24 items-center gap-3 p-5">
          <span
            className="size-5 animate-spin rounded-full border-2 border-secondary border-t-transparent"
            aria-hidden="true"
          />
          <div>
            <p className="font-semibold">A carregar a Visão geral</p>
            <p className="mt-1 text-sm text-text-secondary">
              Os dados estão a ser preparados.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div
              key={i}
              className="card h-32 animate-pulse bg-surface-subtle"
            />
          ))}
        </div>
      </div>
    );
  const m = data.metrics;
  const metrics = [
    [
      "Total de horas",
      `${number.format(Math.round(m.minutes / 60))} h`,
      "Duração importada convertida",
      "clock",
      "default",
    ],
    [
      "Valor trabalhado",
      financial(m.worked),
      "Valor efectivo preservado",
      "trend",
      "default",
    ],
    [
      "Valor facturado",
      financial(m.invoiced),
      m.invoiced == null
        ? "Sem permissão financeira"
        : `${percent(m.invoiced, m.worked)}% do trabalhado`,
      "invoice",
      "default",
    ],
    [
      "Valor recebido",
      financial(m.paid),
      m.paid == null
        ? "Sem permissão financeira"
        : `${percent(m.paid, m.invoiced)}% do facturado`,
      "payment",
      "success",
    ],
    [
      "Por receber",
      financial(m.receivable),
      "Facturado e ainda não pago",
      "warning",
      "warning",
    ],
    [
      "Não facturados",
      number.format(m.uninvoicedCount),
      "Movimentos",
      "invoice",
      "warning",
    ],
    [
      "Facturados não pagos",
      number.format(m.unpaidCount),
      "Requer acompanhamento",
      "payment",
      "warning",
    ],
    [
      "Preço médio/hora",
      financial(m.averageRate),
      "Média ponderada",
      "rules",
      "default",
    ],
    [
      "Clientes activos",
      number.format(m.activeClients),
      "Com movimentos",
      "clients",
      "default",
    ],
    [
      "Movimentos sem preço",
      number.format(m.missingPrice),
      "Necessitam de revisão",
      "warning",
      m.missingPrice ? "danger" : "default",
    ],
    [
      "Sem sociedade",
      number.format(m.missingBilling),
      "Movimentos sem sociedade associada",
      "building",
      m.missingBilling ? "warning" : "default",
    ],
  ] as const;
  const detailLinks: Record<string, string> = {
    "Por receber": "?view=work&invoiced=true&paid=false",
    "Não facturados": "?view=work&invoiced=false",
    "Facturados não pagos": "?view=work&invoiced=true&paid=false",
    "Movimentos sem preço": "?view=work&missingPrice=true",
    "Sem sociedade": "?view=work&missingSociety=true",
  };
  const followUpMetrics = metrics.filter(([label]) => detailLinks[label]),
    generalMetrics = metrics.filter(([label]) => !detailLinks[label]);
  const subtotalKey: Record<string, keyof MetricBreakdown> = {
    "Total de horas": "minutes",
    "Valor trabalhado": "worked",
    "Valor facturado": "invoiced",
    "Valor recebido": "paid",
    "Por receber": "receivable",
    "Não facturados": "uninvoicedCount",
    "Facturados não pagos": "unpaidCount",
    "Preço médio/hora": "averageRate",
    "Clientes activos": "activeClients",
    "Movimentos sem preço": "missingPrice",
    "Sem sociedade": "missingBilling",
  };
  const metricSubtotals = (label: string) => {
    const key = subtotalKey[label];
    return key
      ? breakdowns.map((row) => {
          const value = row[key] as number | null;
          const formatted =
            key === "minutes"
              ? `${number.format(Math.round((value ?? 0) / 60))} h`
              : [
                    "worked",
                    "invoiced",
                    "paid",
                    "receivable",
                    "averageRate",
                  ].includes(key)
                ? financial(value)
                : number.format(value ?? 0);
          return {
            label: row.society,
            value:
              key === "averageRate" && value != null
                ? `${formatted}/h`
                : formatted,
          };
        })
      : [];
  };
  const individual =
    data.clientTypes.find((p) => p.label === "individual")?.value ?? 0;
  const company =
    data.clientTypes.find((p) => p.label === "company")?.value ?? 0;
  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section aria-labelledby="summary-title">
          <div className="mb-4">
            <h2 id="summary-title" className="font-semibold">
              Resumo operacional
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Dados reais acessíveis através das políticas RLS
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {generalMetrics.map(([label, value, detail, icon, tone]) => (
              <MetricCard
                key={label}
                label={label}
                value={value}
                detail={detail}
                icon={icon}
                tone={tone}
                financial={/valor|preço|receb/i.test(label)}
                subtotals={metricSubtotals(label)}
              />
            ))}
          </div>
        </section>
        <section aria-labelledby="follow-up-title">
          <div className="mb-4">
            <h2 id="follow-up-title" className="font-semibold">
              Acompanhamento
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Indicadores com acesso directo aos movimentos contabilizados
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {followUpMetrics.map(([label, value, detail, icon, tone]) => (
              <MetricCard
                key={label}
                label={label}
                value={value}
                detail={detail}
                icon={icon}
                tone={tone === "warning" ? "danger" : tone}
                financial={/valor|preço|receb/i.test(label)}
                detailHref={detailLinks[label]}
                subtotals={metricSubtotals(label)}
              />
            ))}
          </div>
        </section>
      </div>
      <section aria-labelledby="analysis-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="analysis-title" className="font-semibold">
              Análise e tendências
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              Histórico importado de 2018 a {data.latestYear}
            </p>
          </div>
        </div>
        {m.worked == null ? (
          <p className="card p-5 text-sm text-text-secondary">
            Os gráficos financeiros não são apresentados porque este utilizador
            não tem permissão para consultar valores.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <AnnualValueChart data={data.annual} allowSocietyComparison />
              <MonthlyValueChart data={data.monthly} allowSocietyComparison />
            </div>
            <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
              <HorizontalChart
                title="Horas por ano"
                subtitle="Volume anual"
                labels={data.annual.map((p) => String(p.label))}
                values={data.annual.map((p) => p.minutes)}
                valueFormatter={(v) => `${number.format(Math.round(v / 60))} h`}
              />
              <HorizontalChart
                title="Valor por cliente"
                subtitle="Dez maiores"
                labels={data.byClient.map((p) => String(p.label))}
                values={data.byClient.map((p) => p.value)}
                valueFormatter={money.format}
              />
              <div className="grid gap-4 lg:[&>figure]:col-span-1">
                <HorizontalChart
                  title="Valor por sociedade"
                  subtitle="Sociedades"
                  labels={data.byBilling.map((p) => String(p.label))}
                  values={data.byBilling.map((p) => p.value)}
                  valueFormatter={money.format}
                />
                <HorizontalChart
                  title="Valor por responsável"
                  subtitle="Distribuição do trabalho"
                  labels={data.byProfessional.map((p) => String(p.label))}
                  values={data.byProfessional.map((p) => p.value)}
                  valueFormatter={money.format}
                />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DonutChart
                title="Facturação"
                subtitle="Valor facturado versus restante"
                firstLabel="Facturado"
                secondLabel="Não facturado"
                first={percent(m.invoiced, m.worked)}
                subtotals={metricSubtotals("Valor facturado")}
              />
              <DonutChart
                title="Recebimentos"
                subtitle="Valor pago versus por receber"
                firstLabel="Pago"
                secondLabel="Por receber"
                first={percent(m.paid, m.invoiced)}
                tone="success"
                subtotals={metricSubtotals("Valor recebido")}
              />
              <HorizontalChart
                title="Preço médio/hora"
                subtitle="Média global actual"
                labels={["Média ponderada"]}
                values={[m.averageRate ?? 0]}
                valueFormatter={(v) => `${money.format(v)}/h`}
                subtotals={metricSubtotals("Preço médio/hora")}
              />
              <DonutChart
                title="Tipo de cliente"
                subtitle="Contagens inclusivas; os mistos constam em ambas"
                firstLabel="Empresas"
                secondLabel="Particulares"
                first={percent(company, company + individual)}
                subtotals={[
                  { label: "Empresas", value: number.format(company) },
                  { label: "Particulares", value: number.format(individual) },
                ]}
              />
            </div>
            <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
              <div className="[&>*]:h-full">
                <SocietyEvolutionChart data={data.billingAnnual ?? []} />
              </div>
              <div className="grid gap-4 lg:[&>figure]:col-span-1">
                <HorizontalChart
                  title="Arquivo"
                  subtitle="Movimentos por localização"
                  labels={data.byArchive.map((p) => String(p.label))}
                  values={data.byArchive.map((p) => p.value)}
                />
                <StackedSocietyChart data={data.byBilling} />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
