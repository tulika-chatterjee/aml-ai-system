import { FormEvent, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { synthesizeComplianceReplyLocal } from "../utils/complianceLocalReply";

type ChatMsg = { role: "user" | "assistant"; text: string };

const SUGGESTIONS = [
  "When might we file an SMR?",
  "What does risk-based transaction monitoring mean?",
  "PEP and enhanced due diligence — summary",
];

type Props = {
  context: Record<string, unknown>;
};

export function ComplianceAgentChat({ context }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text: "Hi — I’m the **Compliance Agent**. Ask about AUSTRAC / AML–CTF topics (SMR, CDD, monitoring). I retrieve from the demo regulatory corpus — **not** legal advice.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const skipInitialScroll = useRef(true);

  useEffect(() => {
    if (skipInitialScroll.current) {
      skipInitialScroll.current = false;
      return;
    }
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setInput("");
    setBusy(true);
    try {
      const res = await api.complianceChat({ message: trimmed, context });
      setMessages((m) => [...m, { role: "assistant", text: res.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      const offline = synthesizeComplianceReplyLocal(trimmed, context, { offlineNote: true });
      setMessages((m) => [...m, { role: "assistant", text: offline }]);
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <section className="panel elevate compliance-chat">
      <div className="panel-head">
        <div>
          <h3>Compliance Agent</h3>
          <p className="compliance-chat-sub muted">RAG over demo regulatory snippets · ask compliance questions</p>
        </div>
        <span className="pill ghost">Chat</span>
      </div>

      <div className="compliance-suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="chip" disabled={busy} onClick={() => void send(s)}>
            {s}
          </button>
        ))}
      </div>

      <div ref={threadRef} className="compliance-thread" role="log" aria-live="polite">
        {messages.map((msg, i) => (
          <div key={i} className={`compliance-bubble ${msg.role}`}>
            <span className="compliance-bubble-label">{msg.role === "user" ? "You" : "Compliance Agent"}</span>
            <article className={`compliance-bubble-body${msg.role === "user" ? " plain" : ""}`}>{msg.text}</article>
          </div>
        ))}
        {busy && (
          <div className="compliance-bubble assistant">
            <span className="compliance-bubble-label">Compliance Agent</span>
            <p className="compliance-typing muted">Retrieving from corpus…</p>
          </div>
        )}
      </div>

      {error && <p className="compliance-chat-error muted small">{error}</p>}

      <form className="compliance-chat-form" onSubmit={onSubmit}>
        <label className="compliance-chat-field">
          <span className="sr-only">Your question</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Outline SMR escalation steps for our queue…"
            disabled={busy}
            maxLength={4000}
          />
        </label>
        <button type="submit" className="btn primary sm" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
