import { useState } from "react";

export type ChartPoint = {
  label: string | number;
  value: number;
  societies?: Record<string, number>;
};
export type MonthlyYearPoint = { year: number; month: number; value: number };
export type SocietyYearPoint = { society: string; year: number; value: number };
export type SocietyMonthPoint = {
  society: string;
  period: string;
  value: number;
};
export type ChartSubtotal = { label: string; value: string };

const compactMoney = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});
const fullMoney = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
});
const pointTooltip = (
  label: string | number,
  value: number,
  societies?: Record<string, number>,
) =>
  [
    String(label),
    `Total: ${fullMoney.format(value)}`,
    ...Object.entries(societies ?? {})
      .sort(([a], [b]) => a.localeCompare(b, "pt-PT"))
      .map(([society, amount]) => `${society}: ${fullMoney.format(amount)}`),
  ].join("\n");
const smoothLine = (values: number[], max: number, scale = 90) =>
  values
    .map((value, index) => ({
      x: (index / Math.max(values.length - 1, 1)) * 100,
      y: 100 - (value / max) * scale,
    }))
    .reduce((path, point, index, all) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const previous = all[index - 1],
        midX = (previous.x + point.x) / 2;
      return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
    }, "");

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure
      data-chart-title={title}
      className={`card relative min-w-0 p-5 ${className}`}
    >
      <figcaption className="pr-36">
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-text-secondary">{subtitle}</p>
      </figcaption>
      <div className="mt-5">{children}</div>
    </figure>
  );
}
function ChartSubtotals({
  items,
  financial = false,
}: {
  items: ChartSubtotal[];
  financial?: boolean;
}) {
  if (!items.length) return null;
  return (
    <dl className="mt-4 grid gap-1.5 border-t border-border pt-3 text-[0.68rem]">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-w-0 items-center justify-between gap-2"
        >
          <dt className="truncate text-text-secondary">{item.label}</dt>
          <dd
            className={`${financial ? "financial-value " : ""}shrink-0 font-semibold tabular-nums`}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
function SeriesToggle({
  individual,
  onChange,
  label,
  optionLabel = "sociedade",
}: {
  individual: boolean;
  onChange: (value: boolean) => void;
  label: string;
  optionLabel?: string;
}) {
  return (
    <div
      className="absolute right-3 top-3 flex gap-px"
      role="group"
      aria-label={`Representação de ${label}`}
    >
      <button
        type="button"
        aria-pressed={!individual}
        onClick={() => onChange(false)}
        className={`h-6 rounded-l border px-1.5 text-[0.6rem] font-semibold leading-none ${!individual ? "border-secondary bg-secondary text-surface" : "border-border bg-surface text-text-secondary"}`}
      >
        Agregado
      </button>
      <button
        type="button"
        aria-pressed={individual}
        onClick={() => onChange(true)}
        className={`h-6 rounded-r border px-1.5 text-[0.6rem] font-semibold leading-none ${individual ? "border-secondary bg-secondary text-surface" : "border-border bg-surface text-text-secondary"}`}
      >
        Por {optionLabel}
      </button>
    </div>
  );
}
function PeriodBreakdown({
  label,
  total,
  entries,
  emptyLabel = "Sociedade",
}: {
  label: string;
  total: number;
  entries: [string, number][];
  emptyLabel?: string;
}) {
  return (
    <span className="group relative block">
      <button
        type="button"
        className="period-breakdown-trigger relative min-h-7 w-full rounded px-0.5 text-[0.62rem] text-text-secondary hover:bg-secondary-soft focus-visible:outline-2 focus-visible:outline-secondary"
        aria-label={`Detalhe de ${label}`}
      >
        {label}
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-56 -translate-x-1/2 rounded-lg border border-border bg-surface p-3 text-left text-xs text-text-primary shadow-xl group-hover:block group-focus-within:block"
      >
        <strong className="block">Detalhe do período</strong>
        <span className="financial-value mt-1 flex justify-between gap-3 border-b border-border pb-2">
          <span>Total</span>
          <b>{fullMoney.format(total)}</b>
        </span>
        <span className="mt-2 grid gap-1.5">
          {entries.length ? (
            entries
              .sort(([a], [b]) => a.localeCompare(b, "pt-PT"))
              .map(([society, value]) => (
                <span key={society} className="flex justify-between gap-3">
                  <span className="truncate">{society}</span>
                  <b className="financial-value whitespace-nowrap">
                    {fullMoney.format(value)}
                  </b>
                </span>
              ))
          ) : (
            <span>Sem detalhe por {emptyLabel}.</span>
          )}
        </span>
      </span>
    </span>
  );
}

export function AnnualValueChart({
  data,
  societyData = [],
  allowSocietyComparison = false,
  comparisonLabel = "sociedade",
  comparisonPlural = "sociedades",
}: {
  data: ChartPoint[];
  societyData?: SocietyYearPoint[];
  allowSocietyComparison?: boolean;
  comparisonLabel?: string;
  comparisonPlural?: string;
}) {
  const [individual, setIndividual] = useState(false);
  const max = Math.max(...data.map((point) => point.value), 1);
  const societySeries = societyData.length
    ? societyData
    : data.flatMap((point) =>
        Object.entries(point.societies ?? {}).map(([society, value]) => ({
          society,
          year: Number(point.label),
          value,
        })),
      );
  const societies = allowSocietyComparison
      ? [...new Set(societySeries.map((point) => point.society))]
      : [],
    stackedMax = Math.max(
      ...data.map((point) =>
        societies.reduce(
          (total, society) =>
            total +
            (societySeries.find(
              (item) =>
                item.year === Number(point.label) && item.society === society,
            )?.value ?? 0),
          0,
        ),
      ),
      1,
    );
  const canCompareSocieties = allowSocietyComparison;
  return (
    <ChartCard
      title="Valor por ano"
      subtitle={
        individual
          ? `${comparisonPlural.charAt(0).toUpperCase()}${comparisonPlural.slice(1)} ${comparisonLabel === "sociedade" ? "representadas" : "representados"} individualmente`
          : allowSocietyComparison
            ? comparisonLabel === "sociedade"
              ? "Todas as sociedades agregadas"
              : `Todos os ${comparisonPlural} agregados`
            : "Valores agregados por ano"
      }
    >
      {canCompareSocieties && (
        <SeriesToggle
          individual={individual}
          onChange={setIndividual}
          label="valor por ano"
          optionLabel={comparisonLabel}
        />
      )}
      {individual ? (
        <>
          <div className="mb-3 flex flex-wrap justify-end gap-3 text-xs">
            {societies.map((society, index) => (
              <span key={society} className="flex items-center gap-2">
                <i
                  className="size-2.5 rounded-full"
                  style={{
                    background: `var(--color-chart-${(index % 4) + 1})`,
                  }}
                />
                {society}
              </span>
            ))}
          </div>
          <div
            className="grid h-56 items-end gap-1 border-b border-border pb-1 sm:gap-2"
            style={{
              gridTemplateColumns: `repeat(${Math.max(data.length, 1)},minmax(0,1fr))`,
            }}
            role="img"
            aria-label="Valor anual empilhado por sociedade"
          >
              {data.map((point) => (
                <div
                  key={point.label}
                  title={pointTooltip(point.label, point.value, point.societies)}
                  className="relative flex h-full min-w-0 flex-col justify-end pb-5"
                >
                  <span className="financial-value mb-1 truncate text-center text-[0.55rem] font-semibold tabular-nums">
                    {compactMoney.format(point.value)}
                  </span>
                  <div
                    className="mx-auto flex w-[72%] min-w-3 flex-col-reverse overflow-hidden rounded-t-sm"
                    style={{ height: `${(point.value / stackedMax) * 82}%` }}
                  >
                    {societies.map((society, index) => {
                      const value = societySeries.find(
                        (item) =>
                          item.year === Number(point.label) &&
                          item.society === society,
                      )?.value ?? 0;
                      return value > 0 ? (
                        <i
                          key={society}
                          className="block min-h-px w-full"
                          style={{
                            height: `${(value / point.value) * 100}%`,
                            background: `var(--color-chart-${(index % 4) + 1})`,
                          }}
                        />
                      ) : null;
                    })}
                  </div>
                  <span className="absolute inset-x-0 bottom-0">
                    <PeriodBreakdown
                      label={String(point.label).slice(2)}
                      total={point.value}
                      entries={societies.map((society) => [
                        society,
                        societySeries.find(
                          (item) =>
                            item.year === Number(point.label) &&
                            item.society === society,
                        )?.value ?? 0,
                      ])}
                      emptyLabel={comparisonLabel}
                    />
                  </span>
                </div>
              ))}
          </div>
        </>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div
            className="flex h-56 min-w-[34rem] items-end gap-2 border-b border-border pb-1 sm:gap-3"
            role="img"
            aria-label="Valor anual dos movimentos acessíveis"
          >
            {data.map((point) => (
              <div
                key={point.label}
                title={pointTooltip(point.label, point.value, point.societies)}
                className="group flex h-full min-w-0 flex-1 flex-col justify-end"
              >
                <span className="financial-value mb-2 whitespace-nowrap text-center text-[0.62rem] font-semibold tabular-nums text-text-primary">
                  {compactMoney.format(point.value)}
                </span>
                <div
                  className="min-h-1 rounded-t-md bg-chart-1 transition-[height,filter] duration-300 hover:brightness-110"
                  style={{ height: `${(point.value / max) * 100}%` }}
                />
                <span className="mt-2 text-center text-[0.62rem] text-text-secondary">
                  {String(point.label).slice(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

export function MonthlyValueChart({
  data,
  societyData = [],
  allowSocietyComparison = false,
  comparisonLabel = "sociedade",
}: {
  data: ChartPoint[];
  societyData?: SocietyMonthPoint[];
  allowSocietyComparison?: boolean;
  comparisonLabel?: string;
}) {
  const [individual, setIndividual] = useState(false);
  const rolling = data.some((point) =>
    /^\d{4}-\d{2}$/.test(String(point.label)),
  );
  const pointsData: ChartPoint[] = rolling
    ? data.slice(-12)
    : Array.from({ length: 12 }, (_, index) => {
        const point = data.find((item) => Number(item.label) === index + 1);
        return {
          label: index + 1,
          value: point?.value ?? 0,
          societies: point?.societies,
        };
      });
  const values = pointsData.map((point) => point.value);
  const max = Math.max(...values, 1);
  const points = values
    .map((value, index) => `${(index / 11) * 100},${100 - (value / max) * 90}`)
    .join(" ");
  const labels = pointsData.map((point) => {
    const raw = String(point.label);
    if (!rolling)
      return [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ][Number(raw) - 1];
    const [year, month] = raw.split("-").map(Number);
    return new Intl.DateTimeFormat("pt-PT", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    })
      .format(new Date(Date.UTC(year, month - 1, 1)))
      .replace(".", "");
  });
  const tooltips = pointsData.map((point, index) =>
    pointTooltip(labels[index], point.value, point.societies),
  );
  const societySeries = societyData.length
    ? societyData
    : pointsData.flatMap((point) =>
        Object.entries(point.societies ?? {}).map(([society, value]) => ({
          society,
          period: String(point.label),
          value,
        })),
      );
  const societies = allowSocietyComparison
      ? [...new Set(societySeries.map((point) => point.society))]
      : [],
    seriesMax = Math.max(...societySeries.map((point) => point.value), 1);
  const breakdownFor = (index: number): [string, number][] =>
    societySeries
      .filter((item) => item.period === String(pointsData[index].label))
      .map((item) => [item.society, item.value]);
  if (!allowSocietyComparison)
    return (
      <ChartCard
        title="Valor por mês"
        subtitle={
          rolling ? "Últimos 12 meses" : "Distribuição mensal disponível"
        }
      >
        <div className="overflow-x-auto pb-1">
          <div className="h-56 min-w-[42rem]">
            <div className="relative h-48">
              <svg
                viewBox="0 0 100 110"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full overflow-visible"
                role="img"
                aria-label="Valor mensal"
              >
                <defs>
                  <linearGradient id="area-single" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0"
                      stopColor="var(--color-chart-1)"
                      stopOpacity=".25"
                    />
                    <stop
                      offset="1"
                      stopColor="var(--color-chart-1)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                <path
                  d={`M0,100 L${points} L100,100 Z`}
                  fill="url(#area-single)"
                />
                <path
                  d={smoothLine(values, max)}
                  fill="none"
                  stroke="var(--color-chart-1)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {values.map((value, index) => (
                <span
                  key={index}
                  title={tooltips[index]}
                  className="financial-value absolute -translate-x-1/2 rounded bg-surface/90 px-1 text-[0.58rem] font-semibold tabular-nums text-text-primary shadow-sm"
                  style={{
                    left: `${(index / 11) * 100}%`,
                    top: `${Math.max(0, 88 - (value / max) * 82)}%`,
                  }}
                >
                  {compactMoney.format(value)}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-12 text-center text-[0.62rem] text-text-secondary">
              {labels.map((month, index) => (
                <span title={tooltips[index]} key={`${month}-${index}`}>
                  {month}
                </span>
              ))}
            </div>
          </div>
        </div>
      </ChartCard>
    );
  const valuesFor = (society: string) =>
    pointsData.map(
      (point) =>
        societySeries.find(
          (item) =>
            item.period === String(point.label) && item.society === society,
        )?.value ?? 0,
    );
  return (
    <ChartCard
      title="Valor por mês"
      subtitle={
        individual
          ? `Últimos 12 meses por ${comparisonLabel}`
          : rolling
            ? "Últimos 12 meses agregados"
            : "Distribuição mensal disponível"
      }
    >
      <SeriesToggle
        individual={individual}
        onChange={setIndividual}
        label="valor por mês"
        optionLabel={comparisonLabel}
      />
      {individual ? (
        <>
          <div className="mb-3 flex flex-wrap justify-end gap-3 text-xs">
            {societies.map((society, index) => (
              <span key={society} className="flex items-center gap-2">
                <i
                  className="size-2.5 rounded-full"
                  style={{
                    background: `var(--color-chart-${(index % 4) + 1})`,
                  }}
                />
                {society}
              </span>
            ))}
          </div>
          <div className="overflow-x-auto pb-1">
            <div className="h-60 min-w-[56rem]">
              <div
                className="relative h-52"
                role="img"
                aria-label="Valor mensal por sociedade"
              >
                <svg
                  viewBox="0 0 100 110"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full overflow-visible"
                >
                  {societies.map((society, index) => (
                    <path
                      key={society}
                      d={smoothLine(valuesFor(society), seriesMax, 86)}
                      fill="none"
                      stroke={`var(--color-chart-${(index % 4) + 1})`}
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}
                </svg>
                {societies.flatMap((society, societyIndex) =>
                  valuesFor(society).map((value, monthIndex) => (
                    <span
                      key={`${society}-${monthIndex}`}
                      className="financial-value absolute -translate-x-1/2 whitespace-nowrap rounded bg-surface/90 px-0.5 text-[0.46rem] font-semibold tabular-nums shadow-sm"
                      style={{
                        left: `${(monthIndex / 11) * 100}%`,
                        top: `${Math.max(0, 86 - (value / seriesMax) * 78 + societyIndex * 4)}%`,
                        color: `var(--color-chart-${(societyIndex % 4) + 1})`,
                      }}
                    >
                      {compactMoney.format(value)}
                    </span>
                  )),
                )}
              </div>
              <div className="grid grid-cols-12 text-center text-[0.62rem] text-text-secondary">
                {labels.map((month, index) => (
                  <PeriodBreakdown
                    key={`${month}-${index}`}
                    label={month}
                    total={pointsData[index].value}
                    entries={breakdownFor(index)}
                    emptyLabel={comparisonLabel}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="overflow-x-auto pb-1">
          <div className="h-56 min-w-[42rem]">
            <div className="relative h-48">
              <svg
                viewBox="0 0 100 110"
                preserveAspectRatio="none"
                className="absolute inset-0 h-full w-full overflow-visible"
                role="img"
                aria-label="Valor mensal"
              >
                <defs>
                  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0"
                      stopColor="var(--color-chart-1)"
                      stopOpacity=".25"
                    />
                    <stop
                      offset="1"
                      stopColor="var(--color-chart-1)"
                      stopOpacity="0"
                    />
                  </linearGradient>
                </defs>
                <path d={`M0,100 L${points} L100,100 Z`} fill="url(#area)" />
                <path
                  d={smoothLine(values, max)}
                  fill="none"
                  stroke="var(--color-chart-1)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {values.map((value, index) => (
                <span
                  key={index}
                  title={tooltips[index]}
                  className="financial-value absolute -translate-x-1/2 rounded bg-surface/90 px-1 text-[0.58rem] font-semibold tabular-nums text-text-primary shadow-sm"
                  style={{
                    left: `${(index / 11) * 100}%`,
                    top: `${Math.max(0, 88 - (value / max) * 82)}%`,
                  }}
                >
                  {compactMoney.format(value)}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-12 text-center text-[0.62rem] text-text-secondary">
            {labels.map((month, index) => (
              <PeriodBreakdown
                key={`${month}-${index}`}
                label={month}
                total={pointsData[index].value}
                entries={breakdownFor(index)}
                emptyLabel={comparisonLabel}
              />
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}
export function HorizontalChart({
  title,
  subtitle,
  labels,
  values,
  valueFormatter = (value) => value.toLocaleString("pt-PT"),
  subtotals = [],
}: {
  title: string;
  subtitle: string;
  labels: string[];
  values: number[];
  valueFormatter?: (value: number) => string;
  subtotals?: ChartSubtotal[];
}) {
  const max = Math.max(...values, 1);
  const financial = /valor|preço|factura|receb/i.test(`${title} ${subtitle}`);
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="space-y-3" role="img" aria-label={title}>
        {labels.map((label, index) => (
          <div key={label}>
            <div className="mb-1 flex justify-between gap-3 text-xs">
              <span className="truncate text-text-secondary">{label}</span>
              <span
                className={`${financial ? "financial-value " : ""}font-semibold tabular-nums`}
              >
                {valueFormatter(values[index])}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-subtle">
              <div
                className="h-full rounded-full bg-chart-1"
                style={{ width: `${(values[index] / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <ChartSubtotals items={subtotals} financial={financial} />
    </ChartCard>
  );
}

export function CompactVerticalChart({
  title,
  subtitle,
  labels,
  values,
  valueFormatter = (value) => value.toLocaleString("pt-PT"),
}: {
  title: string;
  subtitle: string;
  labels: string[];
  values: number[];
  valueFormatter?: (value: number) => string;
}) {
  const max = Math.max(...values, 1);
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="overflow-x-auto pb-1">
        <div
          className="flex h-40 min-w-[28rem] items-end gap-2 border-b border-border px-1"
          role="img"
          aria-label={title}
        >
          {labels.map((label, index) => (
            <div
              key={label}
              title={`${label}\n${valueFormatter(values[index])}`}
              className="group flex h-full min-w-0 flex-1 flex-col justify-end"
            >
              <span className="financial-value mb-1 truncate text-center text-[0.55rem] font-semibold tabular-nums">
                {valueFormatter(values[index])}
              </span>
              <span
                className="min-h-1 rounded-t bg-chart-1 transition-[height,filter] duration-300 group-hover:brightness-110"
                style={{ height: `${(values[index] / max) * 74}%` }}
              />
              <span className="mt-1.5 pb-1 text-center text-[0.6rem] text-text-secondary">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

export function DonutChart({
  title,
  subtitle,
  firstLabel,
  secondLabel,
  first,
  tone = "secondary",
  subtotals = [],
}: {
  title: string;
  subtitle: string;
  firstLabel: string;
  secondLabel: string;
  first: number;
  tone?: "secondary" | "success";
  subtotals?: ChartSubtotal[];
}) {
  const color =
    tone === "success" ? "var(--color-success)" : "var(--color-secondary)";
  const financial = /factura|receb/i.test(title);
  const remainderColor = financial
    ? "var(--color-danger)"
    : "var(--color-surface-subtle)";
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="grid justify-items-center gap-5 py-3 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center sm:justify-items-stretch">
        <div
          className="grid size-28 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(${color} ${first}%, ${remainderColor} 0)`,
          }}
          role="img"
          aria-label={`${firstLabel}: ${first}%`}
        >
          <div className="grid size-20 place-items-center rounded-full bg-surface text-lg font-semibold">
            <span className={financial ? "financial-value" : ""}>{first}%</span>
          </div>
        </div>
        <div className="grid w-full min-w-0 gap-3 text-xs">
          <p className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full"
              style={{ background: color }}
            />
            <span className="truncate">{firstLabel}</span>
            <strong
              className={`${financial ? "financial-value " : ""}tabular-nums`}
            >
              {first}%
            </strong>
          </p>
          <p className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
            <span
              className="inline-block size-2.5 rounded-full ring-1 ring-border"
              style={{ background: remainderColor }}
            />
            <span className="truncate">{secondLabel}</span>
            <strong
              className={`${financial ? "financial-value " : ""}tabular-nums`}
            >
              {100 - first}%
            </strong>
          </p>
        </div>
      </div>
      <ChartSubtotals items={subtotals} financial={financial} />
    </ChartCard>
  );
}

export function StackedSocietyChart({ data }: { data: ChartPoint[] }) {
  return (
    <ChartCard
      title="Distribuição das sociedades"
      subtitle="Valor total por sociedade"
      className="lg:col-span-2"
    >
      <div
        className="space-y-4"
        role="img"
        aria-label="Distribuição real das sociedades"
      >
        {data.map((point) => (
          <div
            key={point.label}
            className="grid grid-cols-[8rem_minmax(0,1fr)_auto] items-center gap-3"
          >
            <span className="truncate text-xs text-text-secondary">
              {point.label}
            </span>
            <div className="h-4 overflow-hidden rounded-full bg-surface-subtle">
              <span
                className="block h-full bg-chart-1"
                style={{
                  width: `${(point.value / Math.max(...data.map((item) => item.value), 1)) * 100}%`,
                }}
              />
            </div>
            <strong className="financial-value text-xs tabular-nums">
              {compactMoney.format(point.value)}
            </strong>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

export function YearComparisonChart({
  data,
  years,
}: {
  data: MonthlyYearPoint[];
  years: number[];
}) {
  const months = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  const values = years.flatMap((year) =>
    months.map(
      (_, index) =>
        data.find((point) => point.year === year && point.month === index + 1)
          ?.value ?? 0,
    ),
  );
  const max = Math.max(...values, 1);
  return (
    <ChartCard
      title="Comparação mensal entre anos"
      subtitle={years.length ? years.join(" versus ") : "Seleccione anos"}
      className="lg:col-span-2"
    >
      <div className="overflow-x-auto">
        <div className="min-w-[42rem]">
          <div className="mb-3 flex justify-end gap-4 text-xs">
            {years.map((year, index) => (
              <span key={year} className="flex items-center gap-2">
                <i
                  className="size-2.5 rounded-full"
                  style={{ background: `var(--color-chart-${index + 1})` }}
                />
                {year}
              </span>
            ))}
          </div>
          <div className="grid h-60 grid-cols-12 items-end gap-2 border-b border-border">
            {months.map((month, monthIndex) => (
              <div
                key={month}
                className="flex h-full min-w-0 items-end justify-center gap-0.5"
              >
                {years.map((year, yearIndex) => {
                  const value =
                    data.find(
                      (point) =>
                        point.year === year && point.month === monthIndex + 1,
                    )?.value ?? 0;
                  return (
                    <div
                      key={year}
                      className="group flex h-full min-w-0 flex-1 flex-col justify-end"
                    >
                      <span className="financial-value mb-1 -rotate-45 whitespace-nowrap text-[0.5rem] font-semibold tabular-nums">
                        {compactMoney.format(value)}
                      </span>
                      <span
                        className="min-h-0.5 rounded-t"
                        style={{
                          height: `${(value / max) * 90}%`,
                          background: `var(--color-chart-${yearIndex + 1})`,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-12 gap-2 pt-2 text-center text-[0.62rem] text-text-secondary">
            {months.map((month) => (
              <span key={month}>{month}</span>
            ))}
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

export function SocietyEvolutionChart({ data }: { data: SocietyYearPoint[] }) {
  const years = [...new Set(data.map((point) => point.year))].sort(),
    societies = [...new Set(data.map((point) => point.society))];
  const rows = [...societies, "Total"];
  return (
    <ChartCard
      title="Evolução anual das sociedades"
      subtitle="Comparação por sociedade"
      className="lg:col-span-2"
    >
      <div className="overflow-x-auto pb-1">
        <div
          className="min-w-[34rem] divide-y divide-border md:min-w-0"
          role="img"
          aria-label="Evolução anual por Sociedade"
        >
          {rows.map((society, societyIndex) => {
            const totals = society === "Total";
            const values = years.map((year) =>
              totals
                ? data
                    .filter((point) => point.year === year)
                    .reduce((sum, point) => sum + point.value, 0)
                : (data.find(
                    (point) => point.society === society && point.year === year,
                  )?.value ?? 0),
            );
            const rowMax = Math.max(...values, 1);
            return (
              <div
                key={society}
                className={`grid grid-cols-[7.5rem_minmax(0,1fr)] items-end gap-3 py-2 ${totals ? "border-t-2 border-secondary/40 bg-secondary-soft/40" : ""}`}
              >
                <p
                  className={`self-center truncate text-xs font-semibold ${totals ? "uppercase tracking-wider text-secondary" : ""}`}
                >
                  {society}
                </p>
                <div
                  className="grid h-16 items-end gap-1"
                  style={{
                    gridTemplateColumns: `repeat(${Math.max(years.length, 1)},minmax(0,1fr))`,
                  }}
                >
                  {years.map((year, index) => {
                    const value = values[index];
                    return (
                      <div
                        key={year}
                        title={`${society}\n${year}: ${fullMoney.format(value)}`}
                        className="relative flex h-full min-w-0 flex-col items-center justify-end pb-4"
                      >
                        <span className="financial-value mb-0.5 block max-w-full truncate text-[0.48rem] font-semibold tabular-nums">
                          {compactMoney.format(value)}
                        </span>
                        <i
                          className="block min-h-0.5 w-2/3 rounded-t transition-[height,filter] duration-300 hover:brightness-110"
                          style={{
                            height: `${(value / rowMax) * 58}%`,
                            background: totals
                              ? "var(--color-secondary)"
                              : `var(--color-chart-${(societyIndex % 4) + 1})`,
                          }}
                        />
                        <span className="absolute bottom-0 text-[0.55rem] text-text-secondary">
                          {String(year).slice(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}
