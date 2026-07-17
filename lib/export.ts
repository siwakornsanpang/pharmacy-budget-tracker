import type { Transaction } from "./types";

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
): void {
  const escape = (cell: string | number) => {
    const s = String(cell);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ];
  const blob = new Blob(["\uFEFF" + lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportTransactionsCsv(
  projectName: string,
  transactions: Transaction[],
): void {
  const chronological = [...transactions].sort(
    (a, b) =>
      new Date(a.transactionDate).getTime() -
      new Date(b.transactionDate).getTime(),
  );

  let running = 0;
  const rows = chronological.map((t) => {
    running += t.amount;
    return [
      t.id,
      t.transactionDate,
      t.title,
      t.category,
      t.to,
      t.amount,
      running,
      t.note ?? "",
    ];
  });

  const safeName = projectName.replace(/[^\w\u0E00-\u0E7F-]+/g, "_");
  downloadCsv(
    `${safeName}_transactions_${new Date().toISOString().slice(0, 10)}.csv`,
    [
      "รหัส",
      "วันที่",
      "รายการ",
      "หมวดหมู่",
      "จ่ายให้",
      "จำนวนเงิน",
      "รวมสะสม",
      "หมายเหตุ",
    ],
    rows,
  );
}

export function exportProjectSummaryCsv(
  projectName: string,
  rows: { label: string; value: string | number }[],
): void {
  const safeName = projectName.replace(/[^\w\u0E00-\u0E7F-]+/g, "_");
  downloadCsv(
    `${safeName}_summary_${new Date().toISOString().slice(0, 10)}.csv`,
    ["หัวข้อ", "ค่า"],
    rows.map((r) => [r.label, r.value]),
  );
}
