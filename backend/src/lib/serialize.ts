export const DEFAULT_CATEGORIES = [
  "ค่าแรง",
  "อุปกรณ์",
  "ซอฟต์แวร์",
  "ระบบ/เซิร์ฟเวอร์",
  "วัสดุ",
  "โฆษณา",
  "การตลาด",
  "เดินทาง",
  "สินทรัพย์",
  "อื่นๆ",
] as const;

export function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

export function serializeProject(row: {
  id: string;
  name: string;
  description: string;
  budget: string;
  startDate: string;
  endDate: string | null;
  owner: string;
  createdAt: Date;
}) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    budget: toNumber(row.budget),
    startDate: row.startDate,
    endDate: row.endDate,
    owner: row.owner,
    createdAt: row.createdAt.toISOString(),
  };
}

export function serializeTransaction(row: {
  id: string;
  projectId: string;
  kind: string;
  title: string;
  category: string;
  transactionDate: string;
  amount: string;
  paidTo: string;
  personId: string | null;
  note: string | null;
  receiptUrl: string | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    projectId: row.projectId,
    kind: (row.kind === "salary" ? "salary" : "general") as
      | "general"
      | "salary",
    title: row.title,
    category: row.category,
    transactionDate: row.transactionDate,
    amount: toNumber(row.amount),
    to: row.paidTo,
    personId: row.personId ?? undefined,
    note: row.note ?? undefined,
    receiptUrl: row.receiptUrl ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}
