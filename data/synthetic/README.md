# Synthetic data

Runtime generation lives in `backend/app/simulator/generator.py`. Use **POST /api/simulate** to load customers and transactions into PostgreSQL.

Exports or frozen CSV/Parquet snapshots can be dropped here for reproducible notebooks under `notebooks/`.
