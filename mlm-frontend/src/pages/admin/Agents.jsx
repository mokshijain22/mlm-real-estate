import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function initials(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

function avatarColor(name) {
  const colors = ["#2563eb", "#0891b2", "#7c3aed", "#db2777", "#059669", "#d97706"];
  const idx = (name || "").charCodeAt(0) % colors.length;
  return colors[idx] || colors[0];
}

function Agents() {
  const [agents, setAgents] = useState(null);
  const [meta, setMeta] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState("");
  const [kycStatus, setKycStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

  const load = () => {
    const params = { page };
    if (status) params.status = status;
    if (kycStatus !== "") params.kyc_status = kycStatus;
    if (search.trim()) params.search = search.trim();

    api
      .get("/admin/agents", { params })
      .then((res) => {
        setAgents(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, kycStatus, search]);

  useEffect(() => {
    const t = setTimeout(() => setPage(1), 400);
    return () => clearTimeout(t);
  }, [search]);

  const resetFilters = () => {
    setSearch("");
    setStatus("");
    setKycStatus("");
    setPage(1);
  };

  const handleAction = (id, action) => {
    setActionLoading(id + action);
    api
      .patch(`/admin/agents/${id}/${action}`)
      .then(() => load())
      .catch((err) => alert(err.response?.data?.message || err.message))
      .finally(() => setActionLoading(null));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;

  const startSno = meta ? (meta.page - 1) * meta.limit + 1 : 1;

  return (
    <>
      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
          <div>
            <h3 className="fw-bold mb-1">Executives</h3>
            <p className="text-muted mb-0">View, approve, and manage all executives.</p>
          </div>
          <Link to="/admin/agents/create" className="btn btn-warning fw-semibold">
            <iconify-icon icon="solar:add-circle-bold" className="me-1 align-middle"></iconify-icon>
            Add Executive
          </Link>
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-12 col-md-6">
              <label className="form-label fs-11 fw-bold text-muted text-uppercase mb-1">Search</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <iconify-icon icon="solar:magnifer-linear"></iconify-icon>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search name / username / email / phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="col-6 col-md-3">
              <label className="form-label fs-11 fw-bold text-muted text-uppercase mb-1">Status</label>
              <select
                className="form-select"
                value={status}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="col-6 col-md-2">
              <select
                className="form-select"
                value={kycStatus}
                onChange={(e) => {
                  setPage(1);
                  setKycStatus(e.target.value);
                }}
              >
                <option value="">All KYC</option>
                <option value="1">KYC Verified</option>
                <option value="0">KYC Not Verified</option>
              </select>
            </div>
            <div className="col-12 col-md-1">
              <button className="btn btn-light w-100" onClick={resetFilters}>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover table-nowrap align-middle mb-0">
            <thead className="bg-light bg-opacity-50">
              <tr>
                <th className="ps-3 text-muted small">S.No</th>
                <th className="text-muted small">Image</th>
                <th className="text-muted small">Name</th>
                <th className="text-muted small">Username</th>
                <th className="text-muted small">Email</th>
                <th className="text-muted small">Phone</th>
                <th className="text-muted small">Designation</th>
                <th className="text-muted small">Level</th>
                <th className="text-muted small">Status</th>
                <th className="text-muted small">Created</th>
                <th className="text-muted small text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!agents ? (
                <tr>
                  <td colSpan="11" className="text-center py-5">
                    Loading...
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan="11" className="text-center py-5 text-muted">
                    No executives found.
                  </td>
                </tr>
              ) : (
                agents.map((agent, i) => (
                  <tr key={agent._id}>
                    <td className="ps-3 text-muted">{startSno + i}</td>
                    <td>
                      {agent.profilePhoto ? (
                        <img
                          src={agent.profilePhoto}
                          alt={agent.name}
                          className="rounded-circle"
                          style={{ width: 36, height: 36, objectFit: "cover" }}
                        />
                      ) : (
                        <div
                          className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold"
                          style={{ width: 36, height: 36, background: avatarColor(agent.name) }}
                        >
                          {initials(agent.name)}
                        </div>
                      )}
                    </td>
                    <td className="fw-medium">
                      <Link to={`/admin/agents/${agent._id}`}>{agent.name}</Link>
                    </td>
                    <td className="text-muted">{agent.referralCode || "-"}</td>
                    <td>{agent.email}</td>
                    <td>{agent.phone || "-"}</td>
                    <td>{agent.position || "-"}</td>
                    <td>Level {agent.mlmLevel ?? 1}</td>
                    <td>
                      <span
                        className={`badge ${
                          agent.status === "active"
                            ? "bg-success-subtle text-success"
                            : agent.status === "blocked"
                            ? "bg-danger-subtle text-danger"
                            : "bg-secondary-subtle text-secondary"
                        }`}
                      >
                        {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-muted small">
                      {new Date(agent.createdAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="text-end pe-3">
                      <div className="d-flex gap-1 justify-content-end">
                        <Link to={`/admin/agents/${agent._id}`} className="btn btn-sm btn-soft-primary">
                          View
                        </Link>
                        {agent.status === "active" ? (
                          <button
                            className="btn btn-sm btn-soft-danger"
                            disabled={actionLoading === agent._id + "deactivate"}
                            onClick={() => handleAction(agent._id, "deactivate")}
                          >
                            {actionLoading === agent._id + "deactivate" ? "..." : "Deactivate"}
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-soft-success"
                            disabled={actionLoading === agent._id + "activate"}
                            onClick={() => handleAction(agent._id, "activate")}
                          >
                            {actionLoading === agent._id + "activate" ? "..." : "Activate"}
                          </button>
                        )}
                      </div>
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
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
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

export default Agents;