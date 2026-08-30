import { ConnectionStatus } from "@/modules/dashboard/components/connection-status";
import { SalaryCard } from "@/modules/salary/components/salary-card";

export default function DashboardPage() {
  return (
    <div className="page-stack">
      <div>
        <p className="eyebrow">MONTHLY OVERVIEW</p>
        <h1>Your monthly ledger</h1>
        <p>Set the salary that your spending and future forecasts will use.</p>
      </div>
      <ConnectionStatus />
      <SalaryCard />
    </div>
  );
}
