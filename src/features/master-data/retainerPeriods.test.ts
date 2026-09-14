import { expect, test } from "vitest";
import { missingRetainerChargePeriods } from "./retainerPeriods";

test("a primeira prestação respeita imediatamente o intervalo anual", () => {
  const periods = missingRetainerChargePeriods(
    [
      {
        starts_on: "2026-01-01",
        ends_on: "2027-12-31",
        billing_interval_months: 12,
      },
    ],
    new Set(),
    new Date("2027-12-31T12:00:00"),
  );
  expect(periods.map((item) => item.periodStart)).toEqual([
    "2026-01-01",
    "2027-01-01",
  ]);
});
