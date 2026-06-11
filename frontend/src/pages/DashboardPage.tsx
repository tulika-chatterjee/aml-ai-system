import { useMemo, useState } from "react";
import { api, type AlertSummary } from "../api";
import { AlertsPieChart } from "../components/AlertsPieChart";
import { ComplianceAgentChat } from "../components/ComplianceAgentChat";
import { RiskDistributionChart } from "../components/RiskDistributionChart";
import { SAMPLE_CUSTOMERS_CSV, SAMPLE_TRANSACTIONS_CSV } from "../demo/bundledSampleCsv";
import { alertsSeriesLastDays } from "../utils/format";

type Props = {
  alerts: AlertSummary[];
  totalTransactions: number;
  casesOpen: number;
  onOpenAlert: (id: string) => void;
  onGoAlerts: () => void;
  onAfterUpload: () => Promise<{ alerts_created: number; alert_ids: string[] }>;
  apiOnline: boolean;
  customerCount: number;
};

function customerNameFromId(customerId: string): string {
  const match = customerId.match(/CUST-(\d+)/i);
  if (!match) return customerId === "UNMAPPED" ? "Unmapped customer" : "Unknown";
  return `Synthetic Person ${Number(match[1])}`;
}

export function DashboardPage({
  alerts,
  totalTransactions,
  casesOpen: _casesOpen,
  onOpenAlert,
  onGoAlerts,
  onAfterUpload,
  apiOnline,
  customerCount,
}: Props) {
  const [customerCsv, setCustomerCsv] = useState<File | null>(null);
  const [transactionCsv, setTransactionCsv] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const sarFiled = alerts.filter((a) => {
    const s = a.status.toLowerCase();
    return s.includes("sar") || s.includes("smr") || s.includes("filed");
  }).length;
  const monitoredTransactions = Math.max(alerts.length - sarFiled, 0);
  const riskDistribution = alerts.reduce(
    (acc, a) => {
      const sev = a.severity.toLowerCase();
      if (sev === "low") {
        acc.low += 1;
      } else if (sev === "medium") {
        acc.medium += 1;
      } else if (sev === "high") {
        acc.high += 1;
      } else if (a.hybrid_score >= 0.75) {
        acc.high += 1;
      } else if (a.hybrid_score >= 0.5) {
        acc.medium += 1;
      } else {
        acc.low += 1;
      }
      return acc;
    },
    { low: 0, medium: 0, high: 0 },
  );
  const series = alertsSeriesLastDays(alerts);
  const recent = [...alerts].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6);
  const highRiskCustomers = (() => {
    const m = new Map<
      string,
      { customerId: string; customerName: string; accountNumber: string; highRiskAlerts: number; maxRisk: number }
    >();
    alerts.forEach((a) => {
      if (!(a.severity.toLowerCase() === "high" || a.hybrid_score >= 0.85)) return;
      const cid = a.customer_id ?? "UNMAPPED";
      const row = m.get(cid) ?? {
        customerId: cid,
        customerName: customerNameFromId(cid),
        accountNumber: a.account_id,
        highRiskAlerts: 0,
        maxRisk: 0,
      };
      row.highRiskAlerts += 1;
      if (a.hybrid_score >= row.maxRisk) {
        row.accountNumber = a.account_id;
      }
      row.maxRisk = Math.max(row.maxRisk, a.hybrid_score);
      m.set(cid, row);
    });
    return [...m.values()].sort((a, b) => {
      if (b.highRiskAlerts !== a.highRiskAlerts) return b.highRiskAlerts - a.highRiskAlerts;
      return b.maxRisk - a.maxRisk;
    });
  })();

  async function handleUploadSelected() {
    if (!customerCsv && !transactionCsv) {
      setUploadStatus("Select at least one CSV file (customer and/or transactions).");
      return;
    }
    if (!apiOnline) {
      setUploadStatus("API offline — cannot upload.");
      return;
    }
    setUploading(true);
    setUploadStatus("Uploading to backend…");
    try {
      const msg = await pushCsvToBackendPartial(customerCsv, transactionCsv);
      setUploadStatus(`Done — ${msg}`);
    } catch (e) {
      setUploadStatus(String((e as Error).message));
    } finally {
      setUploading(false);
    }
  }

  async function pushCsvToBackendPartial(customerFile: File | null, transactionFile: File | null) {
    const parts: string[] = [];
    if (customerFile) {
      const custRes = await api.uploadCustomersCsv(customerFile);
      parts.push(`${custRes.ingested_kyc} customer(s)`);
    }
    if (transactionFile) {
      const txnRes = await api.uploadTransactionsCsv(transactionFile);
      parts.push(`${txnRes.ingested_transactions} transaction(s)`);
    }
    const detect = await onAfterUpload();
    parts.push(`${detect.alerts_created} alert(s) created`);
    return parts.join(" · ");
  }

  async function handleUploadSampleData() {
    if (!apiOnline) {
      setUploadStatus("API offline — cannot upload.");
      return;
    }
    setUploading(true);
    setUploadStatus("Loading sample data and pushing to backend…");
    try {
      const customerFile = new File([SAMPLE_CUSTOMERS_CSV], "sample_customers.csv", { type: "text/csv" });
      const transactionFile = new File([SAMPLE_TRANSACTIONS_CSV], "sample_transactions.csv", { type: "text/csv" });
      setCustomerCsv(customerFile);
      setTransactionCsv(transactionFile);
      const msg = await pushCsvToBackendPartial(customerFile, transactionFile);
      setUploadStatus(`Done — ${msg}`);
    } catch (e) {
      setUploadStatus(String((e as Error).message));
    } finally {
      setUploading(false);
    }
  }

  const complianceContext = useMemo(
    () => ({
      alert_count: alerts.length,
      high_risk_count: alerts.filter((a) => a.severity.toLowerCase() === "high" || a.hybrid_score >= 0.85).length,
      sar_filed_count: sarFiled,
      total_transactions_baseline: totalTransactions,
    }),
    [alerts, sarFiled, totalTransactions],
  );

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-sub muted">
            Operations snapshot · alerts surface after detection runs · full agent layout on the Pipeline tab
          </p>
        </div>
        <button type="button" className="btn ghost sm" onClick={onGoAlerts}>
          Open alerts queue →
        </button>
      </div>

      <section className="kpi-grid">
        <div className="kpi-card blue">
          <p className="kpi-label">Total transactions</p>
          <p className="kpi-value">{totalTransactions.toLocaleString()}</p>
          <p className="kpi-hint muted">Bronze transaction rows in database (updates after CSV upload)</p>
        </div>
        <div className="kpi-card orange">
          <p className="kpi-label">Monitored transactions</p>
          <p className="kpi-value">{monitoredTransactions}</p>
          <p className="kpi-hint muted">Active monitored items (non-SAR queue)</p>
        </div>
        <div className="kpi-card red">
          <p className="kpi-label">Alerts</p>
          <p className="kpi-value">{alerts.length}</p>
          <p className="kpi-hint muted">Current queue</p>
        </div>
        <div className="kpi-card">
          <p className="kpi-label">Customers (KYC)</p>
          <p className="kpi-value">{customerCount.toLocaleString()}</p>
          <p className="kpi-hint muted">Bronze customer records</p>
        </div>
        <div className="kpi-card green">
          <p className="kpi-label">SAR filed</p>
          <p className="kpi-value">{sarFiled}</p>
          <p className="kpi-hint muted">Alerts marked as SAR/SMR filed</p>
        </div>
      </section>

      <section className="dashboard-chart-row">
        <section className="panel elevate">
          <div className="panel-head">
            <h3>Risk distribution</h3>
          </div>
          <RiskDistributionChart counts={riskDistribution} />
        </section>

        <section className="panel elevate">
          <div className="panel-head panel-head-chart">
            <div className="panel-head-left">
              <h3>Alerts distribution</h3>
              <span className="pill ghost">Last 7 days · pie chart</span>
            </div>
          </div>
          <AlertsPieChart series={series} />
        </section>
      </section>

      <section className="panel elevate">
        <div className="panel-head panel-head-chart">
          <div className="panel-head-left">
            <h3>Upload Data</h3>
            <span className="pill ghost">CSV → backend bronze layer</span>
          </div>
          <button
            type="button"
            className="btn primary sm"
            disabled={uploading || !apiOnline}
            onClick={handleUploadSampleData}
          >
            {uploading ? "Uploading…" : "Upload sample CSVs & refresh alerts"}
          </button>
        </div>
        <div className="upload-grid">
          <label className="field">
            <span className="field-label">Customer Data CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setCustomerCsv(e.target.files?.[0] ?? null)}
            />
            <span className="muted small">{customerCsv ? customerCsv.name : "No file selected"}</span>
          </label>
          <label className="field">
            <span className="field-label">Transaction Data CSV</span>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setTransactionCsv(e.target.files?.[0] ?? null)}
            />
            <span className="muted small">{transactionCsv ? transactionCsv.name : "No file selected"}</span>
          </label>
        </div>
        <div className="upload-actions">
          <button
            type="button"
            className="btn primary sm"
            disabled={uploading || !apiOnline || (!customerCsv && !transactionCsv)}
            onClick={handleUploadSelected}
          >
            {uploading ? "Uploading…" : "Upload selected CSVs & refresh alerts"}
          </button>
        </div>
        <p className="muted small">
          Pushes customer + transaction rows to the API, runs detection, and updates dashboards and the alerts
          queue. Or use the sample button above (no file picker needed).
        </p>
        {uploadStatus && (
          <p className={`upload-status small${uploadStatus.startsWith("Done") ? " upload-status-ok" : ""}`}>
            {uploadStatus}
          </p>
        )}
      </section>

      <section className="panel elevate">
        <div className="panel-head">
          <h3>Recent high-risk alerts</h3>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Account</th>
                <th>Risk score</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recent.map((a) => (
                <tr key={a.id}>
                  <td className="mono">{a.id.slice(0, 8)}…</td>
                  <td>{a.account_id}</td>
                  <td>{a.hybrid_score.toFixed(2)}</td>
                  <td>{a.status}</td>
                  <td>
                    <button type="button" className="btn link sm" onClick={() => onOpenAlert(a.id)}>
                      View case
                    </button>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No alerts yet. Start the API (demo seed fills gold_alerts) or run detection from the toolbar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel elevate">
        <div className="panel-head">
          <h3>High risk customers</h3>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Customer ID</th>
                <th>Customer Name</th>
                <th>Account Number</th>
                <th>High-risk alerts</th>
                <th>Max risk score</th>
              </tr>
            </thead>
            <tbody>
              {highRiskCustomers.slice(0, 8).map((c) => (
                <tr key={c.customerId}>
                  <td className="mono">{c.customerId}</td>
                  <td>{c.customerName}</td>
                  <td className="mono">{c.accountNumber}</td>
                  <td>{c.highRiskAlerts}</td>
                  <td>{c.maxRisk.toFixed(2)}</td>
                </tr>
              ))}
              {highRiskCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No high-risk customers found in the current alert set.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ComplianceAgentChat context={complianceContext} />
    </div>
  );
}
