/** Set `VITE_API_URL` on Vercel to your Render API origin, e.g. https://aml-api.onrender.com */
export const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

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

function apiConfigHint(): string {
  if (apiBase) {
    return `API base: ${apiBase}. Check Render is up and CORS_ORIGINS includes this Vercel URL.`;
  }
  return "Set VITE_API_URL on Vercel to your Render URL (e.g. https://your-api.onrender.com), then redeploy.";
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const trimmed = text.trimStart();
  if (trimmed.startsWith("<!") || trimmed.startsWith("<html")) {
    throw new Error(apiConfigHint());
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      trimmed
        ? `Invalid JSON from API: ${trimmed.slice(0, 120)}`
        : `Empty response from API. ${apiConfigHint()}`,
    );
  }
}

async function uploadCsv<T>(path: string, file: File): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch(`${apiBase}${path}`, { method: "POST", body });
  if (!res.ok) {
    const text = await res.text();
    if (text.trimStart().startsWith("<!")) {
      throw new Error(apiConfigHint());
    }
    throw new Error(`${res.status} ${text.slice(0, 200)}`);
  }
  return parseJson<T>(res);
}

function networkErrorHint(path: string): string {
  if (apiBase) {
    return `Cannot reach API at ${apiBase}${path}. Confirm Render is running, CORS allows this origin, and VITE_API_URL is correct.`;
  }
  return `Cannot reach API at ${path}. Start the FastAPI backend on port 8000 (./backend/run_dev.sh) and use the Vite dev server so /api is proxied.`;
}

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBase}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === "Failed to fetch" || msg.includes("NetworkError") || msg.includes("Load failed")) {
      throw new Error(networkErrorHint(path));
    }
    throw e;
  }
  if (!res.ok) {
    const text = await res.text();
    if (text.trimStart().startsWith("<!")) {
      throw new Error(apiConfigHint());
    }
    throw new Error(`${res.status} ${text.slice(0, 200)}`);
  }
  return parseJson<T>(res);
}

export type CaseOpenResponse = { case_id: string };

export type FeedbackResponse = {
  status: string;
  feedback_id: string;
  case_id: string;
  alert_id: string;
  alert_status: string;
  alert_severity: string;
  disposition: string;
  verdict: string;
};

export type ComplianceChatResponse = {
  reply: string;
  sources: { doc_id: string; title: string; score: number }[];
};

export const api = {
  health: () => json<{ status: string }>("/api/health"),
  stats: () =>
    json<{ transaction_count: number; customer_count: number; alert_count: number }>("/api/stats"),
  detect: () =>
    json<{ alerts_created: number; alert_ids: string[] }>("/api/detect", {
      method: "POST",
      signal: AbortSignal.timeout(180_000),
    }),
  uploadCustomersCsv: (file: File) =>
    uploadCsv<{ ingested_kyc: number; customer_ids: string[] }>("/api/upload/customers", file),
  uploadTransactionsCsv: (file: File) =>
    uploadCsv<{ ingested_transactions: number }>("/api/upload/transactions", file),
  alerts: () => json<AlertSummary[]>("/api/alerts"),
  alert: (id: string) => json<AlertDetail>(`/api/alerts/${id}`),
  openCase: (alertId: string, assignedTo?: string | null) =>
    json<CaseOpenResponse>(`/api/alerts/${alertId}/case`, {
      method: "POST",
      body: JSON.stringify({ assigned_to: assignedTo ?? null }),
    }),
  fileSar: (
    alertId: string,
    body?: { case_id?: string | null; analyst_id?: string; comment?: string | null },
  ) =>
    json<{ alert_id: string; status: string }>(`/api/alerts/${alertId}/file-sar`, {
      method: "POST",
      body: JSON.stringify(body ?? {}),
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
