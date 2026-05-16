import type { AlertSummary } from "../api";

type Props = {
  alerts: AlertSummary[];
  totalTransactions: number;
};

export function ReportPage({ alerts, totalTransactions }: Props) {
  const high = alerts.filter((a) => a.severity.toLowerCase() === "high").length;
  const medium = alerts.filter((a) => a.severity.toLowerCase() === "medium").length;
  const low = alerts.filter((a) => a.severity.toLowerCase() === "low").length;
  const sarFiled = alerts.filter((a) => {
    const status = a.status.toLowerCase();
    return status.includes("sar") || status.includes("smr") || status.includes("filed");
  }).length;
  const monitoringRate = totalTransactions > 0 ? ((alerts.length / totalTransactions) * 100).toFixed(2) : "0.00";

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h2 className="page-title">Report</h2>
          <p className="page-sub muted">Operational summary for AML detection and SAR generation workflow</p>
        </div>
      </div>

      <section className="kpi-grid">
        <div className="kpi-card blue">
          <p className="kpi-label">Total transactions</p>
          <p className="kpi-value">{totalTransactions.toLocaleString()}</p>
        </div>
        <div className="kpi-card red">
          <p className="kpi-label">Total alerts</p>
          <p className="kpi-value">{alerts.length}</p>
        </div>
        <div className="kpi-card green">
          <p className="kpi-label">SARs filed</p>
          <p className="kpi-value">{sarFiled}</p>
        </div>
        <div className="kpi-card orange">
          <p className="kpi-label">Monitoring rate</p>
          <p className="kpi-value">{monitoringRate}%</p>
        </div>
      </section>

      <section className="panel elevate">
        <div className="panel-head">
          <h3>Risk mix</h3>
        </div>
        <p className="invest-body">
          Low: <strong>{low}</strong> · Medium: <strong>{medium}</strong> · High: <strong>{high}</strong>
        </p>
      </section>
    </div>
  );
}
