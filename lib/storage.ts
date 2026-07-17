import type { Project, Transaction } from "./types";
import { MOCK_PROJECTS, MOCK_TRANSACTIONS } from "./mock-data";

const PROJECTS_KEY = "budget-tracker-projects-v2";
const TRANSACTIONS_KEY = "budget-tracker-transactions-v2";

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function loadProjects(): Project[] {
  if (!canUseStorage()) return [...MOCK_PROJECTS];
  try {
    const raw = localStorage.getItem(PROJECTS_KEY);
    if (!raw) {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(MOCK_PROJECTS));
      return [...MOCK_PROJECTS];
    }
    return JSON.parse(raw) as Project[];
  } catch {
    return [...MOCK_PROJECTS];
  }
}

export function saveProjects(projects: Project[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function loadTransactions(): Transaction[] {
  if (!canUseStorage()) return [...MOCK_TRANSACTIONS];
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (!raw) {
      localStorage.setItem(
        TRANSACTIONS_KEY,
        JSON.stringify(MOCK_TRANSACTIONS),
      );
      return [...MOCK_TRANSACTIONS];
    }
    return JSON.parse(raw) as Transaction[];
  } catch {
    return [...MOCK_TRANSACTIONS];
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export function loadProjectTransactions(projectId: string): Transaction[] {
  return loadTransactions()
    .filter((t) => t.projectId === projectId)
    .sort(
      (a, b) =>
        new Date(b.transactionDate).getTime() -
        new Date(a.transactionDate).getTime(),
    );
}

export function upsertTransaction(txn: Transaction): Transaction[] {
  const all = loadTransactions();
  const idx = all.findIndex((t) => t.id === txn.id);
  const next =
    idx >= 0
      ? all.map((t, i) => (i === idx ? txn : t))
      : [txn, ...all];
  saveTransactions(next);
  return next;
}

export function addProject(project: Project): Project[] {
  const next = [project, ...loadProjects()];
  saveProjects(next);
  return next;
}
