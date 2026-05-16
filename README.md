# AML AI System

Demo **multi-agent AML intelligence** layout with FastAPI, React, top-level `agents/` and `models/`, synthetic data, and Docker infra.

**Not legal advice** and **not production AML software**.

## Layout

```
aml-ai-system/
├── frontend/
├── backend/
├── agents/
├── models/
├── data/
├── notebooks/
├── docs/
└── docker/
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the detection pipeline. **Flow diagram:** [`docs/PIPELINE_FLOW.md`](docs/PIPELINE_FLOW.md).

## Docker (full stack)

From the repository root:

```bash
docker compose -f docker/docker-compose.yml up --build
```

Then open **http://localhost:8080** (UI). The API is proxied at `/api` (also **http://localhost:8000** for direct access).

- **postgres**, **api**, and **web** start by default.
- Optional Neo4j + Kafka: `docker compose -f docker/docker-compose.yml --profile full up --build`
- Optional OpenAI for case narratives: copy `docker/.env.example` to `docker/.env`, set `OPENAI_API_KEY`, then  
  `docker compose -f docker/docker-compose.yml --env-file docker/.env up --build`

On first API startup, tables are created and demo alerts are seeded when the queue is empty.

Build images manually (context must be repo root):

```bash
docker build -f backend/Dockerfile -t aml-api .
docker build -f frontend/Dockerfile -t aml-web .
```

## Quick start (local dev)

```bash
docker compose -f docker/docker-compose.yml up -d postgres neo4j

cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
chmod +x run_dev.sh
./run_dev.sh
```

In another terminal:

```bash
cd frontend && npm install && npm run dev
```

Then open `http://localhost:5173` → **Load synthetic data** → **Run detection cycle**.

Optional LLM: set `OPENAI_API_KEY` in `backend/.env`.

## Initialise database

```bash
cd backend && source .venv/bin/activate
export PYTHONPATH="$(pwd):$(pwd)/.."
python -m app.db.init_db
```
