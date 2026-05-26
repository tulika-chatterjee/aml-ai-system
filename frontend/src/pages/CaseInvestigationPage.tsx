import type { AlertDetail } from "../api";
import { NetworkGraph } from "../components/NetworkGraph";
import { isSarFiledStatus } from "../utils/alertStatus";
import { formatRuleFlags } from "../utils/format";

function behaviorBlurb(ml: Record<string, unknown>): string {
  const summary = ml.summary ?? ml.narrative ?? ml.anomaly_summary;
  if (typeof summary === "string" && summary.trim()) return summary;
  const vel = ml.velocity_score ?? ml.velocity_anomaly;
  const typical = ml.typical_band ?? ml.baseline_range;
  if (typeof vel === "number") {
    return `Velocity / anomaly signals elevated (score ${vel}). Typical band in features: ${JSON.stringify(typical ?? "n/a")}.`;
  }
  return "Case Management Agent consolidates anomaly context versus peer / historical activity — see structured features below.";
}

function agentSteps(detail: AlertDetail): { agent: string; message: string }[] {
  const flags = formatRuleFlags(detail.rule_triggers);
  const behaviorMsg = behaviorBlurb(detail.ml_contribution);
  const behaviorShort = behaviorMsg.slice(0, 140) + (behaviorMsg.length > 140 ? "…" : "");
  const graphHint =
    detail.graph_signals && typeof detail.graph_signals === "object"
      ? JSON.stringify(detail.graph_signals).slice(0, 120)
      : "Pattern scan complete";
  return [
    { agent: "Ingestion Agent", message: "Streams normalized into bronze (transactions, KYC, external payloads)." },
    {
      agent: "Risk Scoring & Profiling Agent",
      message: `Hybrid ML + rules · score ${detail.hybrid_score.toFixed(2)} · ${flags}. Network profile: ${graphHint}…`,
    },
    { agent: "Case Management Agent", message: behaviorShort },
    {
      agent: "SAR Generation Agent",
      message: detail.explanation
        ? detail.explanation.slice(0, 160) + "…"
        : "RAG narrative pending — optional OPENAI_API_KEY on backend.",
    },
    {
      agent: "Compliance Agent",
      message: `Regulatory mapping (AUSTRAC hints): ${formatRuleFlags(detail.austrac_refs)}`,
    },
    {
      agent: "Human-in-the-loop Agent",
      message: "Analyst verdict + notes → feedback audit trail for governance and learning loops.",
    },
  ];
}

type Props = {
  alertId: string | null;
  detail: AlertDetail | null;
  loading: boolean;
  caseId: string | null;
  apiOnline: boolean;
  analystNotes: string;
  onNotesChange: (v: string) => void;
  onDecision: (verdict: "fraud" | "safe") => void;
  onFileSar: () => void;
  decisionBusy: boolean;
};

export function CaseInvestigationPage({
  alertId,
  detail,
  loading,
  caseId,
  apiOnline,
  analystNotes,
  onNotesChange,
  onDecision,
  onFileSar,
  decisionBusy,
}: Props) {
  if (!alertId) {
    return (
      <div className="page-stack">
        <div className="page-head">
          <h2 className="page-title">Cases</h2>
          <p className="page-sub muted">Select View case from Alerts or Dashboard to open an investigation.</p>
        </div>
        <section className="panel elevate empty-case">
          <p className="muted">No case selected.</p>
        </section>
      </div>
    );
  }

  if (loading || !detail) {
    return (
      <div className="page-stack">
        <div className="page-head">
          <h2 className="page-title">Case investigation</h2>
          <p className="case-id mono">Case · {alertId.slice(0, 8)}…</p>
        </div>
        <p className="muted">Loading case intelligence…</p>
      </div>
    );
  }

  const sarFiled = isSarFiledStatus(detail.status);
  const canSubmit = apiOnline && !!caseId && !decisionBusy;
  const canFileSar = apiOnline && !!caseId && !decisionBusy && !sarFiled;

  return (
    <div className="page-stack case-page">
      <div className="page-head">
        <div>
          <h2 className="page-title">Case investigation</h2>
          <p className="case-id mono">Alert / case ID · {detail.id}</p>
          {!caseId && <p className="banner warn inline">API offline or case not opened — decisions require a server-backed case.</p>}
        </div>
      </div>

      <section className="invest-block">
        <h3 className="invest-heading">Risk Scoring &amp; Profiling Agent</h3>
        <p className="invest-kicker muted">ML model + rule engine hybrid with network risk profiling</p>
        <div className="risk-grid">
          <div>
            <p className="label">Risk score</p>
            <p className="risk-score">{detail.hybrid_score.toFixed(2)}</p>
          </div>
          <div>
            <p className="label">Severity · status</p>
            <p>
              <span className={`sev ${detail.severity.toLowerCase()}`}>{detail.severity}</span>
              <span className="muted"> · {detail.status}</span>
            </p>
          </div>
          <div className="wide">
            <p className="label">Rules triggered</p>
            <ul className="rule-list">
              {formatRuleFlags(detail.rule_triggers) === "—" ? (
                <li className="muted">None recorded</li>
              ) : (
                formatRuleFlags(detail.rule_triggers)
                  .split(", ")
                  .map((r) => <li key={r}>{r}</li>)
              )}
            </ul>
          </div>
          <div className="wide">
            <p className="label">Network profile context</p>
            <NetworkGraph variant="case" />
            <pre className="invest-pre">{JSON.stringify(detail.graph_signals, null, 2)}</pre>
          </div>
        </div>
      </section>

      <section className="invest-block">
        <h3 className="invest-heading">Case Management Agent</h3>
        <p className="invest-kicker muted">Case context packaging and anomaly summary</p>
        <p className="invest-body">{behaviorBlurb(detail.ml_contribution)}</p>
        <pre className="invest-pre">{JSON.stringify(detail.ml_contribution, null, 2)}</pre>
      </section>

      <section className="invest-block ai-summary">
        <h3 className="invest-heading">SAR Generation Agent</h3>
        <p className="invest-kicker muted">RAG-powered SAR/SMR narrative draft</p>
        <article className="invest-body markdown">
          {detail.explanation ??
            "No narrative yet. Configure OPENAI_API_KEY in backend `.env` and re-run detection for richer RAG output."}
        </article>
        {sarFiled ? (
          <p className="banner ok inline">This alert is marked <strong>SAR/SMR filed</strong> — it appears on the SARs tab.</p>
        ) : (
          <p className="muted small">
            Review the narrative, then file from Human-in-the-loop below when suspicion is confirmed (demo status only).
          </p>
        )}
      </section>

      <section className="invest-block">
        <h3 className="invest-heading">Compliance Agent</h3>
        <p className="invest-kicker muted">Maps alerts → AUSTRAC / AML–CTF obligations</p>
        <p className="invest-body">Structured hints aligned to institutional SMR workflows (demo corpus).</p>
        <pre className="invest-pre">{JSON.stringify(detail.austrac_refs, null, 2)}</pre>
      </section>

      <section className="invest-block analyst">
        <h3 className="invest-heading">Human-in-the-loop Agent</h3>
        <p className="invest-kicker muted">Feedback loop for learning</p>
        <div className="analyst-actions">
          <button type="button" className="btn primary" disabled={!canFileSar} onClick={onFileSar}>
            Mark SAR/SMR filed
          </button>
          <button type="button" className="btn danger" disabled={!canSubmit || sarFiled} onClick={() => onDecision("fraud")}>
            Approve fraud
          </button>
          <button type="button" className="btn success" disabled={!canSubmit || sarFiled} onClick={() => onDecision("safe")}>
            Mark as safe
          </button>
        </div>
        <label className="field block">
          <span className="field-label">Notes</span>
          <textarea
            rows={3}
            value={analystNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Analyst rationale…"
          />
        </label>
      </section>

      <details className="agent-log">
        <summary>Agent activity log · pipeline trace</summary>
        <ul className="agent-steps">
          {agentSteps(detail).map((s) => (
            <li key={s.agent}>
              <strong>{s.agent}</strong>
              <span> → {s.message}</span>
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
