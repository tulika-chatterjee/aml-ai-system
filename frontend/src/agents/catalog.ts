/** Canonical multi-agent layout for AML demo UI (aligned with backend stages). */

export type AgentCatalogEntry = {
  id: string;
  title: string;
  /** Sidebar / narrow layouts */
  shortLabel: string;
  description: string;
};

export const AGENT_PIPELINE: AgentCatalogEntry[] = [
  {
    id: "ingestion",
    title: "Ingestion Agent",
    shortLabel: "Ingestion",
    description: "Streams transactions, KYC, external data",
  },
  {
    id: "risk",
    title: "Risk Scoring & Profiling Agent",
    shortLabel: "Risk scoring + profiling",
    description: "Hybrid ML + rules with network-based profiling and typology context",
  },
  {
    id: "behavior",
    title: "Case Management Agent",
    shortLabel: "Case management",
    description: "Packages signals into investigation-ready case context and workflow",
  },
  {
    id: "llm",
    title: "SAR Generation Agent",
    shortLabel: "SAR generation",
    description: "Drafts SAR/SMR-ready narratives from risk and compliance evidence",
  },
  {
    id: "compliance",
    title: "Compliance Agent",
    shortLabel: "Compliance",
    description: "Maps alerts → regulatory rules (AUSTRAC)",
  },
  {
    id: "hitl",
    title: "Human-in-the-loop Agent",
    shortLabel: "Human-in-the-loop",
    description: "Feedback loop for learning",
  },
];
