import type { AlertSummary } from "../api";

type Props = {
  alerts: AlertSummary[];
};

type CustomerRow = {
  customerId: string;
  customerName: string;
  accountNumbers: Set<string>;
  alerts: number;
  highRiskAlerts: number;
  maxRiskScore: number;
};

function customerNameFromId(customerId: string): string {
  const match = customerId.match(/CUST-(\d+)/i);
  if (!match) return customerId === "UNMAPPED" ? "Unmapped customer" : "Unknown";
  return `Synthetic Person ${Number(match[1])}`;
}

export function CustomersPage({ alerts }: Props) {
  const byCustomer = new Map<string, CustomerRow>();

  alerts.forEach((a) => {
    const customerId = a.customer_id ?? "UNMAPPED";
    const row = byCustomer.get(customerId) ?? {
      customerId,
      customerName: customerNameFromId(customerId),
      accountNumbers: new Set<string>(),
      alerts: 0,
      highRiskAlerts: 0,
      maxRiskScore: 0,
    };
    row.accountNumbers.add(a.account_id);
    row.alerts += 1;
    if (a.severity.toLowerCase() === "high" || a.hybrid_score >= 0.85) {
      row.highRiskAlerts += 1;
    }
    row.maxRiskScore = Math.max(row.maxRiskScore, a.hybrid_score);
    byCustomer.set(customerId, row);
  });

  const rows = [...byCustomer.values()].sort((a, b) => {
    if (b.highRiskAlerts !== a.highRiskAlerts) return b.highRiskAlerts - a.highRiskAlerts;
    return b.maxRiskScore - a.maxRiskScore;
  });

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h2 className="page-title">Customers</h2>
          <p className="page-sub muted">Customer-level risk view based on generated alerts</p>
        </div>
      </div>

      <section className="panel elevate">
        <div className="panel-head">
          <h3>Customer risk list</h3>
          <span className="pill">{rows.length} customers</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Customer name</th>
                <th>Account number(s)</th>
                <th>Total alerts</th>
                <th>High-risk alerts</th>
                <th>Max risk score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.customerId}>
                  <td className="mono">{r.customerId}</td>
                  <td>{r.customerName}</td>
                  <td className="mono">{[...r.accountNumbers].join(", ") || "—"}</td>
                  <td>{r.alerts}</td>
                  <td>{r.highRiskAlerts}</td>
                  <td>{r.maxRiskScore.toFixed(2)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="muted">
                    No customer risk data yet. Run detection cycle and refresh alerts.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
