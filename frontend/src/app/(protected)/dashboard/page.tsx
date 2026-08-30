import { ConnectionStatus } from "@/modules/dashboard/components/connection-status";

export default function DashboardPage() {
  return (
    <div className="page-stack">
      <div>
        <p className="eyebrow">MONTHLY OVERVIEW</p>
        <h1>Dashboard foundation</h1>
        <p>Salary, expense, forecast, and savings modules will connect here phase by phase.</p>
      </div>
      <ConnectionStatus />
      <div className="placeholder-grid">
        <section><span>Salary</span><strong>Not set</strong></section>
        <section><span>Spent</span><strong>BDT 0.00</strong></section>
        <section><span>Forecast balance</span><strong>Waiting for data</strong></section>
      </div>
    </div>
  );
}
