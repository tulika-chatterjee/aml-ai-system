import { useMemo, useState } from "react";
import { MOCK_TRANSACTIONS } from "../demo/mockTransactions";

export function TransactionsPage() {
  const countries = useMemo(() => {
    const s = new Set(MOCK_TRANSACTIONS.map((t) => t.country));
    return ["", ...[...s].sort()];
  }, []);

  const [minAmt, setMinAmt] = useState("");
  const [maxAmt, setMaxAmt] = useState("");
  const [country, setCountry] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rows = useMemo(() => {
    return MOCK_TRANSACTIONS.filter((t) => {
      if (minAmt !== "" && t.amount < Number(minAmt)) return false;
      if (maxAmt !== "" && t.amount > Number(maxAmt)) return false;
      if (country && t.country !== country) return false;
      if (from && t.timestamp.slice(0, 10) < from) return false;
      if (to && t.timestamp.slice(0, 10) > to) return false;
      return true;
    });
  }, [minAmt, maxAmt, country, from, to]);

  return (
    <div className="page-stack">
      <div className="page-head">
        <div>
          <h2 className="page-title">Transactions</h2>
          <p className="page-sub muted">
            Ingestion Agent · bronze transaction stream (demo rows until a live `/api/transactions` ships)
          </p>
        </div>
      </div>

      <section className="panel elevate filters-panel">
        <h3 className="filters-title">Filters</h3>
        <div className="filters-grid">
          <label className="field">
            <span className="field-label">Amount min</span>
            <input type="number" value={minAmt} onChange={(e) => setMinAmt(e.target.value)} placeholder="0" />
          </label>
          <label className="field">
            <span className="field-label">Amount max</span>
            <input type="number" value={maxAmt} onChange={(e) => setMaxAmt(e.target.value)} placeholder="Any" />
          </label>
          <label className="field">
            <span className="field-label">Country</span>
            <select value={country} onChange={(e) => setCountry(e.target.value)}>
              {countries.map((c) => (
                <option key={c || "all"} value={c}>
                  {c || "All"}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Date from</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Date to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="panel elevate">
        <div className="panel-head">
          <h3>Raw transactions</h3>
          <span className="pill">{rows.length} rows</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Sender</th>
                <th>Receiver</th>
                <th>Amount</th>
                <th>Country</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.id}</td>
                  <td>{t.sender}</td>
                  <td>{t.receiver}</td>
                  <td>{t.amount.toLocaleString()}</td>
                  <td>{t.country}</td>
                  <td className="muted">{new Date(t.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
