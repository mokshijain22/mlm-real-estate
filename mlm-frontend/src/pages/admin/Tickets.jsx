import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

const categoryLabels = {
  commission: "Commission",
  kyc: "KYC",
  booking: "Booking",
  general: "General",
};

function Tickets() {
  const [tickets, setTickets] = useState(null);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    api
      .get("/admin/tickets", { params: { status, category, page } })
      .then((res) => {
        setTickets(res.data.data);
        setMeta(res.data.meta);
        setStats(res.data.stats);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [status, category, page]);

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <div className="row align-items-center mb-4">
        <div className="col-sm-8">
          <h3 className="fw-bold mb-1">Support Tickets</h3>
          <p className="text-muted mb-0">Respond to agent support requests.</p>
        </div>
      </div>

      {stats && (
        <div className="row mb-3">
          <div className="col-md-4 col-sm-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h3 className="fw-bold mb-0 text-warning">{stats.open}</h3>
                <p className="text-muted small mb-0">Open Tickets</p>
              </div>
            </div>
          </div>
          <div className="col-md-4 col-sm-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h3 className="fw-bold mb-0 text-success">{stats.closed}</h3>
                <p className="text-muted small mb-0">Closed Tickets</p>
              </div>
            </div>
          </div>
          <div className="col-md-4 col-sm-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <h3 className="fw-bold mb-0 text-primary">{stats.total}</h3>
                <p className="text-muted small mb-0">Total Tickets</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-3">
              <select
                className="form-select"
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="col-md-3">
              <select
                className="form-select"
                value={category}
                onChange={(e) => {
                  setPage(1);
                  setCategory(e.target.value);
                }}
              >
                <option value="all">All Categories</option>
                <option value="commission">Commission</option>
                <option value="kyc">KYC</option>
                <option value="booking">Booking</option>
                <option value="general">General</option>
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
                <th className="ps-3 text-muted small">Ticket#</th>
                <th className="text-muted small">Agent</th>
                <th className="text-muted small">Subject</th>
                <th className="text-muted small">Category</th>
                <th className="text-muted small">Status</th>
                <th className="text-muted small">Created</th>
                <th className="text-muted small text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!tickets ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    Loading...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    No tickets found.
                  </td>
                </tr>
              ) : (
                tickets.map((t) => (
                  <tr key={t._id}>
                    <td className="ps-3 fw-medium">#{t.ticketNumber}</td>
                    <td>{t.agent?.name || "-"}</td>
                    <td>{t.subject}</td>
                    <td>
                      <span className="badge bg-secondary-subtle text-secondary">
                        {categoryLabels[t.category] || t.category}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${t.status === "open" ? "bg-warning-subtle text-warning" : "bg-success-subtle text-success"}`}>
                        {t.status.charAt(0).toUpperCase() + t.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-muted small">{new Date(t.createdAt).toLocaleDateString("en-IN")}</td>
                    <td className="text-end pe-3">
                      <Link to={`/admin/tickets/${t._id}`} className="btn btn-sm btn-soft-primary">
                        View
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

export default Tickets;