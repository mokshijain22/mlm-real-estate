import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function Withdrawals() {
  const [withdrawals, setWithdrawals] = useState(null);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("pending");
  const [pointsType, setPointsType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = { page };
    if (status) params.status = status;
    if (pointsType) params.points_type = pointsType;
    if (search.trim()) params.search = search.trim();

    api
      .get("/admin/withdrawals", { params })
      .then((res) => {
        setWithdrawals(res.data.data);
        setMeta(res.data.meta);
        setStats(res.data.stats);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [status, pointsType, search, page]);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <div className="row align-items-center mb-4">
        <div className="col-sm-8">
          <h3 className="fw-bold mb-1">Withdrawal Management</h3>
          <p className="text-muted mb-0">Review and process agent withdrawal requests.</p>
        </div>
      </div>

      {stats && (
        <div className="row mb-3">
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h3 className="fw-bold mb-0 text-warning">{stats.pending_count}</h3>
                <p className="text-muted small mb-0">Pending Requests</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h3 className="fw-bold mb-0 text-success">{stats.approved_this_month}</h3>
                <p className="text-muted small mb-0">Approved This Month</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h3 className="fw-bold mb-0 text-primary">₹{Math.round(stats.total_paid_bv).toLocaleString("en-IN")}</h3>
                <p className="text-muted small mb-0">Total Paid (Online)</p>
              </div>
            </div>
          </div>
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h3 className="fw-bold mb-0 text-info">₹{Math.round(stats.total_paid_pv).toLocaleString("en-IN")}</h3>
                <p className="text-muted small mb-0">Total Paid (Cash)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-4">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <iconify-icon icon="solar:magnifer-linear"></iconify-icon>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by agent name or reference..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={pointsType}
                onChange={(e) => {
                  setPage(1);
                  setPointsType(e.target.value);
                }}
              >
                <option value="">All Types</option>
                <option value="BV">Online</option>
                <option value="PV">Cash</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover table-nowrap align-middle mb-0">
            <thead className="bg-light bg-opacity-50">
              <tr>
                <th className="ps-3 text-muted small">Agent</th>
                <th className="text-muted small">Type</th>
                <th className="text-muted small">Amount</th>
                <th className="text-muted small">TDS</th>
                <th className="text-muted small">Net Amount</th>
                <th className="text-muted small">Status</th>
                <th className="text-muted small">Requested</th>
                <th className="text-muted small text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!withdrawals ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    Loading...
                  </td>
                </tr>
              ) : withdrawals.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    No withdrawal requests found.
                  </td>
                </tr>
              ) : (
                withdrawals.map((w) => (
                  <tr key={w._id}>
                    <td className="ps-3 fw-medium">{w.agent?.name || "-"}</td>
                    <td>
                      <span className={`badge border ${w.pointsType === "BV" ? "border-primary text-primary" : "border-info text-info"}`}>
                        {w.pointsType === "BV" ? "Online" : "Cash"}
                      </span>
                    </td>
                    <td>₹{Math.round(w.amount).toLocaleString("en-IN")}</td>
                    <td className="text-danger">-₹{Math.round(w.tdsAmount).toLocaleString("en-IN")}</td>
                    <td className="fw-bold">₹{Math.round(w.netAmount).toLocaleString("en-IN")}</td>
                    <td>
                      <span
                        className={`badge ${
                          w.status === "approved"
                            ? "bg-success-subtle text-success"
                            : w.status === "rejected"
                            ? "bg-danger-subtle text-danger"
                            : "bg-warning-subtle text-warning"
                        }`}
                      >
                        {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-muted small">{new Date(w.requestedAt).toLocaleDateString("en-IN")}</td>
                    <td className="text-end pe-3">
                      <Link to={`/admin/withdrawals/${w._id}`} className="btn btn-sm btn-soft-primary">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Page {meta.page} of {meta.lastPage || 1} ({meta.total} total)
            </span>
            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page >= meta.lastPage}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Withdrawals;