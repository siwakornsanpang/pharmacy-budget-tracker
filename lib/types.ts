export type Project = {
  id: string;
  name: string;
  description: string;
  budget: number;
  startDate: string;
  endDate: string;
  owner: string;
};

export type Transaction = {
  id: string;
  projectId: string;
  title: string;
  category: string;
  transactionDate: string;
  amount: number;
  to: string;
  note?: string;
  createdAt?: string;
};

export type ProjectWithStats = Project & {
  spent: number;
  remaining: number;
  percentUsed: number;
  variance: number;
  variancePct: number;
};
