import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function money(n) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const TABS = [
  { key: "all", label: "All open" },
  { key: "past_due", label: "Past due" },
  { key: "due_today", label: "Due today" },
  { key: "due_in_7", label: "Due in 7 days" },
];

function InstallmentDues() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState("all");
  const [page, setPage] = useState(1);

  const [lines, setLines] = useState(null);
  const [meta, setMeta] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/admin/projects")
      .then((res) => setProjects(res.data.projects || res.data.data || res.data || []))
      .catch(() => {});
  }, []);

  function load() {
    api
      .get("/admin/emi-dues", {
        params: {
          page,
          bucket,
          project_id: projectId || undefined,
          search: search || undefined,
        },
      })
      .then((res) => {
        setLines(res.data.data || []);
        setMeta(res.data.meta);
        setSummary(res.data.summary);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, bucket]);

  function handleRefresh() {
    setPage(1);
    load();
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white py-3">
        <h4 className="card-title mb-0">Installment dues</h4>
        <p className="text-muted small mb-0">
          Amounts due today, coming soon, or past due — by schedule line across bookings.
        </p>
      </div>

      {summary && (
        <div className="card-body border-bottom pb-3">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="card bg-danger-subtle border-0">
                <div className="card-body">
                  <p className="text-danger-emphasis small fw-semibold mb-1">Past due</p>
                  <h4 className="fw-bold text-danger mb-0">{money(summary.pastDueAmount)}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-warning-subtle border-0">
                <div className="card-body">
                  <p className="text-warning-emphasis small fw-semibold mb-1">Due today</p>
                  <h4 className="fw-bold text-warning mb-0">{money(summary.dueTodayAmount)}</h4>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card bg-info-subtle border-0">
                <div className="card-body">
                  <p className="text-info-emphasis small fw-semibold mb-1">Due in 7 days</p>
                  <h4 className="fw-bold text-info mb-0">{money(summary.dueIn7Amount)}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card-body border-bottom">
        <div className="row g-3 align-items-end">
          <div className="col-md-3">
            <label className="form-label">Project</label>
            <select className="form-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-control"
              placeholder="Client, plot, project…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <button type="button" className="btn btn-primary w-100" onClick={handleRefresh}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="card-body border-bottom pb-3">
        <ul className="nav nav-pills gap-2">
          {TABS.map((t) => (
            <li key={t.key} className="nav-item">
              <button
                type="button"
                className={`nav-link ${bucket === t.key ? "active" : ""}`}
                onClick={() => {
                  setBucket(t.key);
                  setPage(1);
                }}
              >
                {t.label}
                {summary && (
                  <span className="badge bg-light text-dark border ms-2">
                    {t.key === "all" ? summary.allOpen : t.key === "past_due" ? summary.pastDue : t.key === "due_today" ? summary.dueToday : summary.dueIn7}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="card-body pb-0">
          <div className="alert alert-danger mb-0">{error}</div>
        </div>
      )}

      <div className="card-body">
        {meta && (
          <p className="text-muted small mb-3">
            {meta.total} lines · {money(summary?.pageRemaining)} remaining on this page
          </p>
        )}
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr className="text-muted small text-uppercase">
                <th>Client</th>
                <th>Project / Plot</th>
                <th>Step</th>
                <th>Due date</th>
                <th className="text-end">Remaining</th>
                <th>Status</th>
                <th>Booking</th>
              </tr>
            </thead>
            <tbody>
              {!lines ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    Loading…
                  </td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    Nothing due in this view.
                  </td>
                </tr>
              ) : (
                lines.map((l) => (
                  <tr key={l._id}>
                    <td>
                      <div className="fw-semibold">{l.client || "-"}</div>
                      <div className="text-muted small">{l.clientPhone}</div>
                    </td>
                    <td>
                      <div>{l.project || "-"}</div>
                      <div className="text-muted small">Plot {l.plot || "-"}</div>
                    </td>
                    <td>{l.step}</td>
                    <td>{fmtDate(l.dueDate)}</td>
                    <td className="text-end fw-semibold">{money(l.remaining)}</td>
                    <td>
                      <span className={`badge ${l.status === "overdue" ? "bg-danger" : "bg-warning text-dark"}`}>
                        {l.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {l.bookingId ? (
                        <Link to={`/admin/bookings/${l.bookingId}`} className="btn btn-sm btn-light">
                          View
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {meta && (
          <div className="d-flex justify-content-between align-items-center mt-3">
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
    </div>
  );
}

export default InstallmentDues;