import { useCallback, useEffect, useState, type ReactElement } from "react";
import { AlertDetail, AlertSummary, api, apiBase } from "./api";
import { AppShell, NavKey } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { CustomersPage } from "./pages/CustomersPage";
import { TransactionsPage } from "./pages/TransactionsPage";
import { AlertsPage } from "./pages/AlertsPage";
import { CaseInvestigationPage } from "./pages/CaseInvestigationPage";
import { SARsPage } from "./pages/SARsPage";
import { ReportPage } from "./pages/ReportPage";
import { PipelinePage } from "./pages/PipelinePage";
import { SettingsPage } from "./pages/SettingsPage";
import { CompliancePage } from "./pages/CompliancePage";

type Props = {
  onSignOut: () => void;
};

export function MainApp({ onSignOut }: Props) {
  const [nav, setNav] = useState<NavKey>("dashboard");
  const [status, setStatus] = useState("");
  const [refreshNote, setRefreshNote] = useState<string | null>(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);

  const [investigationAlertId, setInvestigationAlertId] = useState<string | null>(null);
  const [investigationDetail, setInvestigationDetail] = useState<AlertDetail | null>(null);
  const [investigationLoading, setInvestigationLoading] = useState(false);
  const [caseByAlert, setCaseByAlert] = useState<Record<string, string>>({});

  const [analystNotes, setAnalystNotes] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [lastDecision, setLastDecision] = useState<{
    verdict: "fraud" | "safe";
    alertStatus: string;
    alertSeverity: string;
    recordedAt: string;
  } | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionCount, setTransactionCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);

  const refresh = useCallback(async () => {
    setError(null);
    const rows = await api.alerts();
    setAlerts(rows);
  }, []);

  const refreshStats = useCallback(async () => {
    const s = await api.stats();
    setTransactionCount(s.transaction_count);
    setCustomerCount(s.customer_count);
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), refreshStats()]);
  }, [refresh, refreshStats]);

  useEffect(() => {
    api
      .health()
      .then(() => {
        setStatus("API reachable");
        setApiOnline(true);
      })
      .catch((e) => {
        const msg = (e as Error).message;
        setStatus(
          apiBase
            ? `API unreachable — ${msg}`
            : `API not configured — set VITE_API_URL on Vercel to your Render URL`,
        );
        setApiOnline(false);
      });
    refreshAll().catch((e) => setError(String((e as Error).message)));
  }, [refreshAll]);

  useEffect(() => {
    if (!investigationAlertId) {
      setInvestigationDetail(null);
      return;
    }
    let cancelled = false;
    setInvestigationLoading(true);
    api
      .alert(investigationAlertId)
      .then((d) => {
        if (!cancelled)
          setInvestigationDetail({
            ...d,
            rule_count: Array.isArray(d.rule_triggers) ? d.rule_triggers.length : d.rule_count ?? 0,
          });
      })
      .catch((e) => {
        if (!cancelled) setError(String((e as Error).message));
      })
      .finally(() => {
        if (!cancelled) setInvestigationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [investigationAlertId]);

  async function runDetect() {
    setBusy(true);
    setError(null);
    setRefreshNote(null);
    try {
      const result = await api.detect();
      setCaseByAlert({});
      await refreshAll();
      if (investigationAlertId) {
        setInvestigationAlertId(null);
        setInvestigationDetail(null);
      }
      setRefreshNote(`Detection complete — ${result.alerts_created} alert(s) created (previous queue replaced).`);
      return result;
    } catch (e) {
      setError(String((e as Error).message));
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function handleRefreshAlerts() {
    if (!apiOnline) {
      setError("API offline — cannot refresh.");
      return;
    }
    setBusy(true);
    setError(null);
    setRefreshNote(null);
    try {
      const [rows] = await Promise.all([api.alerts(), api.stats().then((s) => {
        setTransactionCount(s.transaction_count);
        setCustomerCount(s.customer_count);
        return s;
      })]);
      setAlerts(rows);
      if (investigationAlertId) {
        const d = await api.alert(investigationAlertId);
        setInvestigationDetail({
          ...d,
          rule_count: Array.isArray(d.rule_triggers) ? d.rule_triggers.length : d.rule_count ?? 0,
        });
      }
      setRefreshNote(`Refreshed — ${rows.length} alert(s) from database (no rescoring).`);
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  const ensureCaseForAlert = useCallback(
    async (alertId: string): Promise<string> => {
      const cached = caseByAlert[alertId];
      if (cached) return cached;
      const { case_id } = await api.openCase(alertId);
      setCaseByAlert((m) => ({ ...m, [alertId]: case_id }));
      return case_id;
    },
    [caseByAlert],
  );

  useEffect(() => {
    if (!investigationAlertId || !apiOnline) return;
    let cancelled = false;
    ensureCaseForAlert(investigationAlertId).catch((e) => {
      if (!cancelled) setError(String((e as Error).message));
    });
    return () => {
      cancelled = true;
    };
  }, [investigationAlertId, apiOnline, ensureCaseForAlert]);

  async function handleViewCase(alertId: string) {
    setError(null);
    setAnalystNotes("");
    setLastDecision(null);
    setInvestigationAlertId(alertId);
    setNav("cases");
    if (!apiOnline) return;
    try {
      await ensureCaseForAlert(alertId);
    } catch (e) {
      setError(String((e as Error).message));
    }
  }

  async function handleDecision(verdict: "fraud" | "safe") {
    if (!investigationAlertId) return;
    if (!apiOnline) {
      setError("API offline — cannot record analyst decision.");
      return;
    }
    setDecisionBusy(true);
    setError(null);
    try {
      const caseId = await ensureCaseForAlert(investigationAlertId);
      const res = await api.feedback({
        case_id: caseId,
        analyst_id: "demo-analyst",
        verdict,
        comment: analystNotes || null,
      });
      setLastDecision({
        verdict,
        alertStatus: res.alert_status,
        alertSeverity: res.alert_severity,
        recordedAt: new Date().toISOString(),
      });
      const d = await api.alert(investigationAlertId);
      setInvestigationDetail({
        ...d,
        rule_count: Array.isArray(d.rule_triggers) ? d.rule_triggers.length : d.rule_count ?? 0,
      });
      await refreshAll();
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setDecisionBusy(false);
    }
  }

  async function handleFileSar() {
    if (!investigationAlertId) return;
    if (!apiOnline) {
      setError("API offline — cannot file SAR.");
      return;
    }
    setDecisionBusy(true);
    setError(null);
    try {
      const caseId = await ensureCaseForAlert(investigationAlertId);
      await api.fileSar(investigationAlertId, {
        case_id: caseId,
        analyst_id: "demo-analyst",
        comment: analystNotes || null,
      });
      const d = await api.alert(investigationAlertId);
      setInvestigationDetail({
        ...d,
        rule_count: Array.isArray(d.rule_triggers) ? d.rule_triggers.length : 0,
      });
      await refreshAll();
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setDecisionBusy(false);
    }
  }

  const totalTransactions = transactionCount;
  const casesOpen = Object.keys(caseByAlert).length;

  const toolbar = (
    <div className="toolbar">
      <button type="button" className="btn primary sm" disabled={busy || !apiOnline} onClick={runDetect}>
        Run detection cycle
      </button>
      <button type="button" className="btn sm" disabled={busy} onClick={handleRefreshAlerts}>
        {busy ? "Working…" : "Refresh alerts"}
      </button>
      <button type="button" className="btn ghost sm" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );

  const rulePreview = (a: AlertSummary) =>
    `${a.rule_count} rule trigger${a.rule_count === 1 ? "" : "s"}`;

  function handleBackToCasesList() {
    setInvestigationAlertId(null);
    setInvestigationDetail(null);
    setLastDecision(null);
    setAnalystNotes("");
    setError(null);
  }

  let content: ReactElement;
  switch (nav) {
    case "dashboard":
      content = (
        <DashboardPage
          alerts={alerts}
          totalTransactions={totalTransactions}
          casesOpen={casesOpen}
          onOpenAlert={handleViewCase}
          onGoAlerts={() => setNav("alerts")}
          onAfterUpload={runDetect}
          apiOnline={apiOnline}
          customerCount={customerCount}
        />
      );
      break;
    case "pipeline":
      content = <PipelinePage />;
      break;
    case "customers":
      content = <CustomersPage alerts={alerts} />;
      break;
    case "transactions":
      content = <TransactionsPage />;
      break;
    case "alerts":
      content = (
        <AlertsPage alerts={alerts} busy={busy} onViewCase={handleViewCase} rulePreview={rulePreview} />
      );
      break;
    case "cases":
      content = (
        <CaseInvestigationPage
          alerts={alerts}
          busy={busy}
          alertId={investigationAlertId}
          detail={investigationDetail}
          loading={investigationLoading}
          caseId={investigationAlertId ? caseByAlert[investigationAlertId] ?? null : null}
          apiOnline={apiOnline}
          analystNotes={analystNotes}
          onNotesChange={setAnalystNotes}
          onDecision={handleDecision}
          onFileSar={handleFileSar}
          onViewCase={handleViewCase}
          onBackToList={handleBackToCasesList}
          rulePreview={rulePreview}
          decisionBusy={decisionBusy}
          lastDecision={lastDecision}
          caseOpening={apiOnline && !!investigationAlertId && !caseByAlert[investigationAlertId ?? ""]}
        />
      );
      break;
    case "sars":
      content = <SARsPage alerts={alerts} onViewCase={handleViewCase} />;
      break;
    case "report":
      content = <ReportPage alerts={alerts} totalTransactions={totalTransactions} />;
      break;
    case "compliance":
      content = <CompliancePage alerts={alerts} />;
      break;
    case "settings":
      content = <SettingsPage apiLine={status} />;
      break;
  }

  return (
    <AppShell active={nav} onNav={setNav} apiLine={status} toolbar={toolbar}>
      {error && <div className="banner error page-banner">{error}</div>}
      {refreshNote && !error && <div className="banner ok inline page-banner">{refreshNote}</div>}
      {content}
    </AppShell>
  );
}
