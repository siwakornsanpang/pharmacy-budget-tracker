import { TRANSACTION_CATEGORIES } from "@/lib/mock-data";

const CATEGORIES_KEY = "budget-tracker-categories-v2";

export function getDefaultCategories(): string[] {
  return [...TRANSACTION_CATEGORIES];
}

export function getStoredCategories(): string[] {
  if (typeof window === "undefined") return getDefaultCategories();
  try {
    const raw = localStorage.getItem(CATEGORIES_KEY);
    if (!raw) return getDefaultCategories();
    const parsed = JSON.parse(raw) as string[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return getDefaultCategories();
    }
    return mergeCategories(getDefaultCategories(), parsed);
  } catch {
    return getDefaultCategories();
  }
}

export function saveCategories(categories: string[]): void {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}

export function addCategory(name: string, current: string[]): string[] {
  const trimmed = name.trim();
  if (!trimmed) return current;
  const exists = current.some(
    (c) => c.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exists) return current;
  const next = [...current, trimmed];
  saveCategories(next);
  return next;
}

function mergeCategories(defaults: string[], stored: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of [...defaults, ...stored]) {
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(c);
  }
  return result;
}
