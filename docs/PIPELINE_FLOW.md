# AML-AI-SYSTEM — pipeline flow

Visual and diagrammatic view of the hybrid detection stack (see [`ARCHITECTURE.md`](./ARCHITECTURE.md) for file-level detail).

## Flow image

![Hybrid AML pipeline from ingestion through gold alerts to the UI](./aml-ai-system-pipeline-flowchart.png)

## Mermaid

Renders on GitHub and in Mermaid Live / compatible tools. Copy the fenced block below if you need it elsewhere.

```mermaid
flowchart TB
  subgraph ingest["Ingestion"]
    A[Ingestion Agent<br/>KYC · transactions]
    B[(Bronze DB)]
    A --> B
  end

  subgraph silver["Medallion — silver"]
    C[Feature compute]
    D[(Silver aggregates)]
    B --> C --> D
  end

  subgraph hybrid["Hybrid scoring"]
    R[Rule engine]
    M[ML anomaly]
    G[Graph intelligence]
    P[Compliance map]
  end

  D --> R
  D --> M
  D --> G
  D --> P

  K[(RAG corpus<br/>data/regulatory)]
  L[LLM investigator<br/>RAG + optional OpenAI gpt-4o-mini<br/>or template if no key]

  K -.->|lexical retrieve| L
  R --> L
  M --> L
  G --> L
  P --> L

  N[(Gold alerts)]
  L --> N

  F[FastAPI /api]
  U[React dashboard]
  N --> F --> U
```
