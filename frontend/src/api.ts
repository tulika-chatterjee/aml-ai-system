const BASE = "";

export type AlertSummary = {
  id: string;
  account_id: string;
  customer_id: string | null;
  severity: string;
  status: string;
  hybrid_score: number;
  created_at: string;
  rule_count: number;
};

export type AlertDetail = AlertSummary & {
  rule_triggers: unknown[];
  ml_contribution: Record<string, unknown>;
  graph_signals: Record<string, unknown>;
  austrac_refs: unknown[];
  explanation: string | null;
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

export type CaseOpenResponse = { case_id: string };

export type FeedbackResponse = { status: string; feedback_id: string };

export type ComplianceChatResponse = {
  reply: string;
  sources: { doc_id: string; title: string; score: number }[];
};

export const api = {
  health: () => json<{ status: string }>("/api/health"),
  detect: () => json<{ alerts_created: number; alert_ids: string[] }>("/api/detect", { method: "POST" }),
  alerts: () => json<AlertSummary[]>("/api/alerts"),
  alert: (id: string) => json<AlertDetail>(`/api/alerts/${id}`),
  openCase: (alertId: string, assignedTo?: string | null) =>
    json<CaseOpenResponse>(`/api/alerts/${alertId}/case`, {
      method: "POST",
      body: JSON.stringify({ assigned_to: assignedTo ?? null }),
    }),
  feedback: (body: { case_id: string; analyst_id: string; verdict: string; comment?: string | null }) =>
    json<FeedbackResponse>("/api/feedback", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  complianceChat: (body: { message: string; context?: Record<string, unknown> }) =>
    json<ComplianceChatResponse>("/api/compliance/chat", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
