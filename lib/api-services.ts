import { api } from "@/lib/api";
import type {
  MemberRole,
  Project,
  ProjectMember,
  ProjectPerson,
  ProjectWithStats,
  Transaction,
} from "@/lib/types";

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
  endDate: string | null;
  owner: string;
};

export type TransactionInput = {
  kind: "general" | "salary";
  title: string;
  category?: string;
  transactionDate: string;
  amount: number;
  to?: string;
  personId?: string | null;
  note?: string;
};

export type PersonInput = {
  name: string;
  roleTitle: string;
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

export async function updateProject(
  id: string,
  input: Partial<ProjectInput>,
): Promise<Project> {
  return api<Project>(`/projects/${id}`, { method: "PATCH", body: input });
}

export async function deleteProject(id: string): Promise<void> {
  await api<void>(`/projects/${id}`, { method: "DELETE" });
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

export async function updateTransaction(
  id: string,
  input: Partial<TransactionInput>,
): Promise<Transaction> {
  return api<Transaction>(`/transactions/${id}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await api<void>(`/transactions/${id}`, { method: "DELETE" });
}

export async function fetchMembers(
  projectId: string,
): Promise<ProjectMember[]> {
  return api<ProjectMember[]>(`/projects/${projectId}/members`);
}

export async function addMember(
  projectId: string,
  input: { username: string; role: MemberRole },
): Promise<ProjectMember> {
  return api<ProjectMember>(`/projects/${projectId}/members`, {
    method: "POST",
    body: input,
  });
}

export async function updateMemberRole(
  projectId: string,
  userId: string,
  role: MemberRole,
): Promise<ProjectMember> {
  return api<ProjectMember>(`/projects/${projectId}/members/${userId}`, {
    method: "PATCH",
    body: { role },
  });
}

export async function removeMember(
  projectId: string,
  userId: string,
): Promise<void> {
  await api<void>(`/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

export async function fetchPeople(
  projectId: string,
): Promise<ProjectPerson[]> {
  return api<ProjectPerson[]>(`/projects/${projectId}/people`);
}

export async function createPerson(
  projectId: string,
  input: PersonInput,
): Promise<ProjectPerson> {
  return api<ProjectPerson>(`/projects/${projectId}/people`, {
    method: "POST",
    body: input,
  });
}

export async function updatePerson(
  projectId: string,
  personId: string,
  input: Partial<PersonInput>,
): Promise<ProjectPerson> {
  return api<ProjectPerson>(`/projects/${projectId}/people/${personId}`, {
    method: "PATCH",
    body: input,
  });
}

export async function deletePerson(
  projectId: string,
  personId: string,
): Promise<void> {
  await api<void>(`/projects/${projectId}/people/${personId}`, {
    method: "DELETE",
  });
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
