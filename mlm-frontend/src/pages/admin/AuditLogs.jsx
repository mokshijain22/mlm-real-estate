import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function headline(action) {
  const words = action.replace(/[._]/g, " ").split(" ").filter(Boolean);
  const titled = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  return titled.replace(/Kyc/gi, "KYC");
}

function badgeClass(action) {
  if (action.startsWith("auth.")) return "bg-secondary-subtle text-secondary";
  if (action.startsWith("kyc.")) return "bg-info-subtle text-info";
  if (action.startsWith("booking.")) return "bg-warning-subtle text-warning";
  if (action.startsWith("withdrawal.")) return "bg-primary-subtle text-primary";
  if (action.startsWith("agent.")) return "bg-teal-subtle text-teal";
  if (action.startsWith("rank.")) return "bg-warning-subtle text-warning";
  if (action.startsWith("settings.")) return "bg-danger-subtle text-danger";
  if (action.startsWith("emi.")) return "bg-success-subtle text-success";
  return "bg-secondary-subtle text-secondary";
}

function AuditLogs() {
  const [logs, setLogs] = useState(null);
  const [meta, setMeta] = useState(null);
  const [actions, setActions] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);

  const [userId, setUserId] = useState("");
  const [action, setAction] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [page, setPage] = useState(1);

  const load = () => {
    const params = { page };
    if (userId) params.user_id = userId;
    if (action) params.action = action;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;
    if (ipAddress) params.ip_address = ipAddress;

    api
      .get("/admin/audit-logs", { params })
      .then((res) => {
        setLogs(res.data.data);
        setMeta(res.data.meta);
        setActions(res.data.filters.actions);
        setUsers(res.data.filters.users);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleApply = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const handleReset = () => {
    setUserId("");
    setAction("");
    setDateFrom("");
    setDateTo("");
    setIpAddress("");
    setPage(1);
    setTimeout(load, 0);
  };

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white py-3">
        <h4 className="card-title mb-0">Audit Logs</h4>
        <p className="text-muted mb-0">Track all critical system actions and user activities.</p>
      </div>
      <div className="card-body">
        <form onSubmit={handleApply} className="row g-3 mb-4">
          <div className="col-md-3">
            <label className="form-label">User</label>
            <select className="form-select" value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">All Users</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">Action</label>
            <select className="form-select" value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">All Actions</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {headline(a)}
                </option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label">Date From</label>
            <input type="date" className="form-control" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label">Date To</label>
            <input type="date" className="form-control" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label">IP Address</label>
            <input
              type="text"
              className="form-control"
              placeholder="Search IP..."
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-3 col-lg-2 d-flex align-items-end">
            <div className="d-flex gap-2 w-100 flex-column flex-sm-row">
              <button type="submit" className="btn btn-primary flex-fill">
                Apply
              </button>
              <button type="button" className="btn btn-light flex-fill" onClick={handleReset}>
                Reset
              </button>
            </div>
          </div>
        </form>

        <div className="table-responsive">
          <table className="table table-hover table-centered mb-0">
            <thead className="table-light">
              <tr>
                <th>Date & Time</th>
                <th>User</th>
                <th>Role</th>
                <th>Action</th>
                <th>Description</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {!logs ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    Loading...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-4">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id}>
                    <td>
                      <span className="text-body fw-bold">
                        {new Date(log.createdAt).toLocaleDateString("en-IN", { month: "short", day: "2-digit", year: "numeric" })}
                      </span>
                      <br />
                      <small className="text-muted">
                        {new Date(log.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
                      </small>
                    </td>
                    <td>
                      {log.user ? (
                        <Link to={`/admin/agents/${log.user._id}`} className="text-body">
                          {log.userName}
                        </Link>
                      ) : (
                        log.userName
                      )}
                    </td>
                    <td>
                      <span className="text-capitalize">{log.userRole}</span>
                    </td>
                    <td>
                      <span className={`badge ${badgeClass(log.action)}`}>{headline(log.action)}</span>
                    </td>
                    <td className="text-wrap" style={{ maxWidth: "300px" }}>
                      {log.description}
                    </td>
                    <td>
                      <small className="text-muted">{log.ipAddress}</small>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
  );
}

export default AuditLogs;