"""Synthetic transaction + customer generator (privacy-safe demos)."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from random import Random
from typing import Any


def _ts(seed: int, i: int) -> datetime:
    base = datetime.now(timezone.utc) - timedelta(hours=48)
    return base + timedelta(minutes=i * 13 + seed % 17)


def generate_demo_customers(
    n_customers: int = 40,
    seed: int = 42,
) -> list[dict[str, Any]]:
    rng = Random(seed)
    customers: list[dict[str, Any]] = []
    for i in range(n_customers):
        cid = f"CUST-{i:04d}"
        pep = i % 17 == 0
        tier = "HIGH" if (i % 11 == 0 or pep) else "MEDIUM"
        customers.append(
            {
                "customer_id": cid,
                "full_name": f"Synthetic Person {i}",
                "pep_flag": pep,
                "risk_tier": tier,
                "country": "AU",
                "narrative": f"Synthetic KYC profile batch={seed} segment={rng.choice(['retail', 'sme', 'private'])}.",
                "metadata": {"source": "simulator", "seed": seed},
            }
        )
    return customers


def generate_demo_dataset(
    n_customers: int = 40,
    n_transactions: int = 800,
    fraud_ring_size: int = 8,
    seed: int = 42,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    rng = Random(seed)
    customers = generate_demo_customers(n_customers=n_customers, seed=seed)

    accounts = [f"ACC-{i:04d}" for i in range(n_customers)]
    ring = accounts[:fraud_ring_size]

    txs: list[dict[str, Any]] = []
    for i in range(n_transactions):
        if i % 6 == 0 and rng.random() < 0.55:
            a, b = rng.sample(ring, 2)
            amt = Decimal(str(round(rng.uniform(8000, 22000), 2)))
        elif i % 9 == 0:
            a = rng.choice(accounts)
            b = rng.choice(accounts)
            while b == a:
                b = rng.choice(accounts)
            amt = Decimal(str(round(rng.uniform(50, 500), 2)))
        else:
            a, b = rng.sample(accounts, 2)
            amt = Decimal(str(round(rng.uniform(20, 3500), 2)))

        cust_idx = int(a.split("-")[1])
        txs.append(
            {
                "external_ref": f"SIM-{i:06d}",
                "account_from": a,
                "account_to": b,
                "amount": amt,
                "currency": "AUD",
                "timestamp_utc": _ts(seed, i),
                "channel": rng.choice(["FPS", "BPAY", "BRANCH", "CARD"]),
                "metadata": {
                    "linked_customer": customers[cust_idx]["customer_id"],
                    "simulator": True,
                },
            }
        )

    return customers, txs
