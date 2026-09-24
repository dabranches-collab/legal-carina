type ClientCodeRow = { client_code?: string | null };

export function suggestedClientCodes(rows: ClientCodeRow[]) {
  const next = (prefix: "01" | "02") => {
    const pattern = new RegExp(`^${prefix}\\.(\\d+)$`);
    const used = new Set<number>();
    for (const row of rows) {
      const match = pattern.exec(row.client_code ?? "");
      if (!match) continue;
      const number = Number(match[1]);
      if (Number.isSafeInteger(number) && number > 0) used.add(number);
    }
    let number = 1;
    while (used.has(number)) number += 1;
    return `${prefix}.${String(number).padStart(4, "0")}`;
  };
  return { individual: next("02"), company: next("01") };
}
