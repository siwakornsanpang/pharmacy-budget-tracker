export type MemberRole = "admin" | "editor" | "viewer";
export type AccessRole = MemberRole | "creator";
export type TransactionKind = "general" | "salary";

export type ProjectAccessFlags = {
  isCreator?: boolean;
  role?: AccessRole;
  canEditProject?: boolean;
  canDeleteProject?: boolean;
  canEditTransactions?: boolean;
  canManageMembers?: boolean;
  canManagePeople?: boolean;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  budget: number;
  startDate: string;
  endDate: string | null;
  owner: string;
  createdAt?: string;
};

export type Transaction = {
  id: string;
  projectId: string;
  kind?: TransactionKind;
  title: string;
  category: string;
  transactionDate: string;
  amount: number;
  to: string;
  personId?: string;
  note?: string;
  receiptUrl?: string;
  createdAt?: string;
};

export type ProjectWithStats = Project &
  ProjectAccessFlags & {
    spent: number;
    remaining: number;
    percentUsed: number;
    variance?: number;
    variancePct?: number;
    status?: "active" | "completed";
  };

export type ProjectMember = {
  id?: string;
  userId: string;
  username: string;
  name: string;
  role: AccessRole;
  isCreator: boolean;
  createdAt?: string;
};

export type ProjectPerson = {
  id: string;
  projectId: string;
  name: string;
  roleTitle: string;
  note?: string;
  createdAt?: string;
};
