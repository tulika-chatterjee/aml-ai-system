import { ReactNode } from "react";
import { AgentPipelineRail } from "./AgentPipeline";
import { TttFinanceLogo } from "./TttFinanceLogo";

export type NavKey =
  | "dashboard"
  | "customers"
  | "pipeline"
  | "transactions"
  | "alerts"
  | "cases"
  | "sars"
  | "report"
  | "compliance"
  | "settings";

const NAV: { key: NavKey; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "customers", label: "Customers", icon: "👥" },
  { key: "pipeline", label: "Pipeline", icon: "🧠" },
  { key: "transactions", label: "Transactions", icon: "💸" },
  { key: "alerts", label: "Alerts", icon: "🚨" },
  { key: "cases", label: "Cases", icon: "🗂️" },
  { key: "sars", label: "SARs", icon: "📝" },
  { key: "report", label: "Report", icon: "📄" },
  { key: "compliance", label: "Compliance", icon: "✅" },
  { key: "settings", label: "Settings", icon: "⚙️" },
];

type Props = {
  active: NavKey;
  onNav: (key: NavKey) => void;
  apiLine: string;
  toolbar: ReactNode;
  children: ReactNode;
};

export function AppShell({ active, onNav, apiLine, toolbar, children }: Props) {
  return (
    <div className="app-root">
      <header className="app-topbar">
        <div className="app-brand">
          <TttFinanceLogo />
          <div>
            <p className="app-product-family">TTT Finance AI</p>
            <h1 className="app-title">AML-AI-SYSTEM</h1>
            <p className="app-tagline">
              Ingestion → risk scoring & profiling → case management → SAR generation → compliance → analyst feedback
              (demo)
            </p>
          </div>
        </div>
        <div className="app-topbar-right">
          <p className="app-api-line">{apiLine}</p>
          {toolbar}
        </div>
      </header>

      <div className="app-body">
        <aside className="app-sidebar" aria-label="Primary">
          <nav className="app-nav">
            {NAV.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`app-nav-item${active === item.key ? " active" : ""}`}
                onClick={() => onNav(item.key)}
              >
                <span aria-hidden>{item.icon}</span> {item.label}
              </button>
            ))}
          </nav>
          <AgentPipelineRail />
        </aside>
        <main className="app-main">{children}</main>
      </div>
    </div>
  );
}
