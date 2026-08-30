export interface Salary {
  id: string;
  month: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalaryResponse {
  success: true;
  data: { salary: Salary | null };
}
