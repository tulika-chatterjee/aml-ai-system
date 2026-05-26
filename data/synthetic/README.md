# Synthetic & sample CSV data

## Sample files for dashboard upload

Local-only CSV templates (not in git — copy from repo maintainer or use **Upload sample CSVs** in the UI, which uses bundled demo data in `frontend/src/demo/bundledSampleCsv.ts`):

| File | Purpose |
|------|---------|
| `sample_customers.csv` | 8 high-risk / PEP customers `CUST-9001` … `CUST-9008` |
| `sample_transactions.csv` | 30 large-value ring transfers on `ACC-9001` … `ACC-9007` (plus low-risk control txs) |
| `sample_one_customer.csv` | 1 customer — `CUST-9010` / `ACC-9010` |
| `sample_one_customer_transactions.csv` | 10 transactions for that customer only |

**Account ↔ customer link:** account `ACC-9001` maps to customer `CUST-9001` (same numeric suffix) in the detection pipeline. Same for `ACC-9010` → `CUST-9010`.

### How to use

1. Open the dashboard **Upload Data** section.
2. Select `sample_customers.csv` and `sample_transactions.csv`.
3. Click **Upload CSVs** (then **Run detection cycle** if alerts do not refresh automatically).

Timestamps in the transaction file are shifted into the last 24 hours on ingest if they are older than 48 hours, so the file stays valid for silver-layer features.

## Customer CSV columns

| Column | Required | Example |
|--------|----------|---------|
| `customer_id` | yes | `CUST-9001` |
| `full_name` | yes | `Alex Rivera` |
| `pep_flag` | no | `true` / `false` |
| `risk_tier` | no | `LOW`, `MEDIUM`, `HIGH` |
| `country` | no | `AU` |
| `narrative` | no | Free text |

## Transaction CSV columns

| Column | Required | Example |
|--------|----------|---------|
| `account_from` | yes | `ACC-9001` |
| `account_to` | yes | `ACC-9002` |
| `amount` | yes | `12500.00` |
| `timestamp_utc` | yes | `2026-05-25T08:15:00+00:00` |
| `external_ref` | no | `CSV-TX-001` |
| `currency` | no | `AUD` |
| `channel` | no | `FPS`, `CARD`, `BPAY` |

## API

- `POST /api/upload/customers` — multipart field `file`
- `POST /api/upload/transactions` — multipart field `file`

Programmatic generation still lives in `backend/app/simulator/generator.py` (**POST /api/simulate**).
