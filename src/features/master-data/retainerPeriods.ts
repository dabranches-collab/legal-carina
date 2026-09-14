export type RetainerPeriodTerms = {
  starts_on: string;
  ends_on: string | null;
  billing_interval_months: number;
};

export function missingRetainerChargePeriods<T extends RetainerPeriodTerms>(
  retainers: T[],
  existingPeriods: Set<string>,
  today = new Date(),
) {
  if (!retainers.length) return [];
  const chronological = [...retainers].sort((a, b) =>
      a.starts_on.localeCompare(b.starts_on),
    ),
    first = new Date(`${chronological[0].starts_on.slice(0, 7)}-01T12:00:00`),
    lastTerms = chronological[chronological.length - 1],
    last = lastTerms.ends_on
      ? new Date(`${lastTerms.ends_on.slice(0, 7)}-01T12:00:00`)
      : today,
    periods: Array<{ periodStart: string; terms: T }> = [];
  for (const date = new Date(first); date <= last; ) {
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      periodStart = `${period}-01`,
      terms = chronological.find(
        (item) =>
          item.starts_on <= periodStart &&
          (!item.ends_on || item.ends_on >= periodStart),
      );
    if (!existingPeriods.has(period) && terms) periods.push({ periodStart, terms });
    date.setMonth(date.getMonth() + (terms?.billing_interval_months ?? 1));
  }
  return periods;
}
