import { useCallback, useEffect, useState, type ReactElement } from "react";
import { AlertDetail, AlertSummary, api } from "./api";
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

const DEMO_TX_BASELINE = 12340;

type Props = {
  onSignOut: () => void;
};

export function MainApp({ onSignOut }: Props) {
  const [nav, setNav] = useState<NavKey>("dashboard");
  const [status, setStatus] = useState("");
  const [apiOnline, setApiOnline] = useState(false);
  const [alerts, setAlerts] = useState<AlertSummary[]>([]);

  const [investigationAlertId, setInvestigationAlertId] = useState<string | null>(null);
  const [investigationDetail, setInvestigationDetail] = useState<AlertDetail | null>(null);
  const [investigationLoading, setInvestigationLoading] = useState(false);
  const [caseByAlert, setCaseByAlert] = useState<Record<string, string>>({});

  const [analystNotes, setAnalystNotes] = useState("");
  const [decisionBusy, setDecisionBusy] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    const rows = await api.alerts();
    setAlerts(rows);
  }, []);

  useEffect(() => {
    api
      .health()
      .then(() => {
        setStatus("API reachable");
        setApiOnline(true);
      })
      .catch(() => {
        setStatus("API offline — start FastAPI on :8000");
        setApiOnline(false);
      });
    refresh().catch((e) => setError(String((e as Error).message)));
  }, [refresh]);

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
    try {
      await api.detect();
      await refresh();
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  }

  async function handleViewCase(alertId: string) {
    setError(null);
    setAnalystNotes("");
    try {
      if (apiOnline) {
        const { case_id } = await api.openCase(alertId);
        setCaseByAlert((m) => ({ ...m, [alertId]: case_id }));
      }
    } catch (e) {
      setError(String((e as Error).message));
    }
    setInvestigationAlertId(alertId);
    setNav("cases");
  }

  async function handleDecision(verdict: "fraud" | "safe") {
    if (!investigationAlertId) return;
    const caseId = caseByAlert[investigationAlertId];
    if (!caseId) return;
    setDecisionBusy(true);
    setError(null);
    try {
      await api.feedback({
        case_id: caseId,
        analyst_id: "demo-analyst",
        verdict,
        comment: analystNotes || null,
      });
      await refresh();
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setDecisionBusy(false);
    }
  }

  const totalTransactions = DEMO_TX_BASELINE;
  const casesOpen = Object.keys(caseByAlert).length;

  const toolbar = (
    <div className="toolbar">
      <button type="button" className="btn primary sm" disabled={busy} onClick={runDetect}>
        Run detection cycle
      </button>
      <button type="button" className="btn sm" disabled={busy} onClick={() => refresh().catch((e) => setError(String(e)))}>
        Refresh alerts
      </button>
      <button type="button" className="btn ghost sm" onClick={onSignOut}>
        Sign out
      </button>
    </div>
  );

  const rulePreview = (a: AlertSummary) =>
    `${a.rule_count} rule trigger${a.rule_count === 1 ? "" : "s"}`;

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
          alertId={investigationAlertId}
          detail={investigationDetail}
          loading={investigationLoading}
          caseId={investigationAlertId ? caseByAlert[investigationAlertId] ?? null : null}
          apiOnline={apiOnline}
          analystNotes={analystNotes}
          onNotesChange={setAnalystNotes}
          onDecision={handleDecision}
          decisionBusy={decisionBusy}
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
      {content}
    </AppShell>
  );
}
