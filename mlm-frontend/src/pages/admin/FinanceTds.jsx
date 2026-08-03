import { useEffect, useState } from "react";
import api from "../../api/axios.js";

function moneyFull(n) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function FinanceTds() {
  const [period, setPeriod] = useState("this_month");
  const [rows, setRows] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .get("/admin/finance-tds/overview", { params: { period } })
      .then((res) => {
        setRows(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <div>
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-3">
              <label className="form-label small text-uppercase text-muted">Period</label>
              <select className="form-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="this_month">This month</option>
                <option value="last_month">Last month</option>
                <option value="this_year">This year</option>
                <option value="all_time">All time</option>
              </select>
            </div>
            <div className="col-md-2">
              <button className="btn btn-warning w-100" onClick={load} disabled={loading}>
                <iconify-icon icon="solar:refresh-bold" className="align-middle me-1"></iconify-icon>
                {loading ? "..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {meta && (
        <div className="row g-3 mb-3">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small text-uppercase">
                  <iconify-icon icon="solar:percentage-square-bold-duotone" className="align-middle me-1"></iconify-icon>
                  Current TDS rate
                </div>
                <div className="fs-3 fw-bold">{meta.currentRate}%</div>
                <div className="text-muted small">
                  <a href="/admin/settings">Edit in Settings</a>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small text-uppercase">
                  <iconify-icon icon="solar:cash-out-bold-duotone" className="align-middle me-1"></iconify-icon>
                  Gross withdrawals
                </div>
                <div className="fs-3 fw-bold">{moneyFull(meta.totalGross)}</div>
                <div className="text-muted small">{meta.count} entries</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small text-uppercase">
                  <iconify-icon icon="solar:percentage-square-bold-duotone" className="align-middle me-1"></iconify-icon>
                  TDS deducted
                </div>
                <div className="fs-3 fw-bold text-danger">{moneyFull(meta.totalTds)}</div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body">
                <div className="text-muted small text-uppercase">
                  <iconify-icon icon="solar:wallet-money-bold-duotone" className="align-middle me-1"></iconify-icon>
                  Net paid out
                </div>
                <div className="fs-3 fw-bold text-success">{moneyFull(meta.totalNet)}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3">
          <h5 className="card-title mb-0">
            <iconify-icon icon="solar:document-text-bold-duotone" className="align-middle me-1"></iconify-icon>
            TDS deduction ledger
          </h5>
        </div>
        <div className="card-body">
          {!rows ? (
            <div className="text-center py-4">Loading...</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-muted py-4">No TDS deductions in this period.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-centered table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Agent</th>
                    <th>Points</th>
                    <th>Reference</th>
                    <th className="text-end">Gross amount</th>
                    <th className="text-end">TDS deducted</th>
                    <th className="text-end">Net paid</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>{fmtDate(r.date)}</td>
                      <td>{r.agent}</td>
                      <td>{r.pointsType}</td>
                      <td>{r.reference}</td>
                      <td className="text-end">{moneyFull(r.grossAmount)}</td>
                      <td className="text-end text-danger">{moneyFull(r.tdsAmount)}</td>
                      <td className="text-end text-success">{moneyFull(r.netAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FinanceTds;