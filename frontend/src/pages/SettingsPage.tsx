import { AGENT_PIPELINE } from "../agents/catalog";
import { apiBase } from "../api";

type Props = {
  apiLine: string;
};

export function SettingsPage({ apiLine }: Props) {
  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h2 className="page-title">Settings</h2>
          <p className="page-sub muted">Environment · agent reference · connectivity</p>
        </div>
      </div>

      <section className="panel elevate">
        <h3 className="invest-heading">Multi-agent layout</h3>
        <ul className="settings-agent-list">
          {AGENT_PIPELINE.map((a, i) => (
            <li key={a.id}>
              <span className="settings-agent-n">{i + 1}</span>
              <div>
                <p className="settings-agent-title">{a.title}</p>
                <p className="settings-agent-desc muted">{a.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel elevate">
        <h3 className="invest-heading">API</h3>
        <p className="invest-body">{apiLine}</p>
        <p className="muted small">
          {apiBase ? (
            <>
              Production API base: <code className="inline-code">{apiBase}</code>
            </>
          ) : (
            <>
              Local dev proxies <code className="inline-code">/api</code> to{" "}
              <code className="inline-code">127.0.0.1:8000</code>. On Vercel set{" "}
              <code className="inline-code">VITE_API_URL</code> to your Render origin and redeploy.
            </>
          )}
        </p>
      </section>

      <section className="panel elevate">
        <h3 className="invest-heading">Disclaimer</h3>
        <p className="invest-body muted">
          Synthetic data only. Not legal advice and not production AML software. Institutional compliance review is always
          required.
        </p>
      </section>
    </div>
  );
}
