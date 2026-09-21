import { supabase } from "../../lib/supabase";
import { loadFixedFeeLines } from "../clients/fixedFeeAnalytics";

export type FilterKey = "all" | "uninvoiced" | "unpaid" | "missingPrice" | "missingSociety";
export type FilterSummary = { count: number; minutes: number; amount: number | null; partial: boolean };
export type ClientFilterSummaries = Record<FilterKey, FilterSummary>;

type Entry = {
  id?: string;
  duration_minutes: number;
  effective_amount: number | null;
  effective_hourly_rate: number | null;
  billing_entity_name: string | null;
  billing_scope?: string;
};
type SearchResult = { items: Entry[]; total: number };
const summaryCache = new Map<string, { value: ClientFilterSummaries; expires: number }>();

function summarise(entries: Entry[]): FilterSummary {
  const priced = entries.filter((entry) => entry.effective_amount != null);
  return {
    count: entries.length,
    minutes: entries.reduce((total, entry) => total + Number(entry.duration_minutes || 0), 0),
    amount: entries.length && !priced.length ? null : priced.reduce((total, entry) => total + Number(entry.effective_amount), 0),
    partial: priced.length < entries.length,
  };
}

export function buildClientFilterSummaries(all: Entry[], uninvoiced: Entry[], unpaid: Entry[], missingPrice: Entry[]): ClientFilterSummaries {
  return {
    all: summarise(all),
    uninvoiced: summarise(uninvoiced),
    unpaid: summarise(unpaid),
    missingPrice: summarise(missingPrice),
    missingSociety: summarise(all.filter((entry) => entry.billing_entity_name == null)),
  };
}

export async function loadClientFilterSummaries(clientId: string): Promise<ClientFilterSummaries> {
  const cached = summaryCache.get(clientId);
  if (cached && cached.expires > Date.now()) return cached.value;
  if (!supabase) throw new Error("Ligação ao Supabase indisponível.");
  const [all, uninvoiced, unpaid, missingPrice, fixedFeeLines] = await Promise.all([
    supabase.rpc("search_work_entries", { p_client_id: clientId, p_page: 1, p_page_size: 10000 }),
    supabase.rpc("get_attention_work_entries", { p_kind: "uninvoiced", p_client_id: clientId }),
    supabase.rpc("get_attention_work_entries", { p_kind: "unpaid", p_client_id: clientId }),
    supabase.rpc("get_attention_work_entries", { p_kind: "missing_price", p_client_id: clientId }),
    loadFixedFeeLines({ clientId }),
  ]);
  for (const result of [all, uninvoiced, unpaid, missingPrice]) if (result.error) throw result.error;
  const allData = all.data as SearchResult;
  if (allData.total > allData.items.length) throw new Error("Resumo incompleto: há mais de 10 000 registos.");
  const fixedByEntry = new Map(fixedFeeLines.filter((line) => line.entryId).map((line) => [line.entryId!, line]));
  const withFixedAmount = (entry: Entry): Entry => {
    const fixed = entry.id ? fixedByEntry.get(entry.id) : undefined;
    return fixed ? { ...entry, effective_amount: fixed.amount, effective_hourly_rate: fixed.minutes ? fixed.amount * 60 / fixed.minutes : null } : entry;
  };
  const enrichedAll = allData.items.map(withFixedAmount);
  const value = buildClientFilterSummaries(
    enrichedAll,
    (uninvoiced.data as SearchResult).items.map(withFixedAmount),
    (unpaid.data as SearchResult).items.map(withFixedAmount),
    (missingPrice.data as SearchResult).items,
  );
  summaryCache.set(clientId, { value, expires: Date.now() + 60_000 });
  return value;
}

export function invalidateClientFilterSummaries(clientId: string) { summaryCache.delete(clientId); }

export const formatFilterHours = (minutes: number) => `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60} min` : ""}`;
export const formatFilterMoney = (summary: FilterSummary) => summary.amount == null ? "—" : `${new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(summary.amount)}${summary.partial ? " · parcial" : ""}`;
