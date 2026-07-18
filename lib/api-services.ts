import { api } from "@/lib/api";
import type { Project, ProjectWithStats, Transaction } from "@/lib/types";

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    username: string;
    name: string;
  };
};

export type ProjectInput = {
  name: string;
  description: string;
  budget: number;
  startDate: string;
  endDate: string;
  owner: string;
};

export type TransactionInput = {
  title: string;
  category: string;
  transactionDate: string;
  amount: number;
  to: string;
  note?: string;
};

export async function loginRequest(
  username: string,
  password: string,
): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/login", {
    method: "POST",
    auth: false,
    body: { username, password },
  });
}

export async function registerRequest(
  username: string,
  password: string,
  name?: string,
): Promise<AuthResponse> {
  return api<AuthResponse>("/auth/register", {
    method: "POST",
    auth: false,
    body: { username, password, name },
  });
}

export async function fetchProjects(params?: {
  status?: "all" | "active" | "completed";
  q?: string;
}): Promise<ProjectWithStats[]> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.q) search.set("q", params.q);
  const qs = search.toString();
  return api<ProjectWithStats[]>(`/projects${qs ? `?${qs}` : ""}`);
}

export async function fetchProject(id: string): Promise<ProjectWithStats> {
  return api<ProjectWithStats>(`/projects/${id}`);
}

export async function createProject(input: ProjectInput): Promise<Project> {
  return api<Project>("/projects", { method: "POST", body: input });
}

export async function fetchTransactions(
  projectId: string,
): Promise<Transaction[]> {
  return api<Transaction[]>(`/projects/${projectId}/transactions`);
}

export async function createTransaction(
  projectId: string,
  input: TransactionInput,
): Promise<Transaction> {
  return api<Transaction>(`/projects/${projectId}/transactions`, {
    method: "POST",
    body: input,
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await api<void>(`/transactions/${id}`, { method: "DELETE" });
}

export async function fetchCategories(): Promise<{ id: string; name: string }[]> {
  return api<{ id: string; name: string }[]>("/categories");
}

export async function createCategory(
  name: string,
): Promise<{ id: string; name: string }> {
  return api<{ id: string; name: string }>("/categories", {
    method: "POST",
    body: { name },
  });
}
