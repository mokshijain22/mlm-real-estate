import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

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
  }, [page, status, kycStatus]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleAction = (id, action) => {
    setActionLoading(id + action);
    api
      .patch(`/admin/agents/${id}/${action}`)
      .then(() => load())
      .catch((err) => alert(err.response?.data?.message || err.message))
      .finally(() => setActionLoading(null));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <div className="row align-items-center mb-4">
        <div className="col-sm-8">
          <h3 className="fw-bold mb-1">Agent Management</h3>
          <p className="text-muted mb-0">View, approve, and manage all agents.</p>
        </div>
      </div>

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
                  placeholder="Search by name, email, phone..."
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
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="col-md-3">
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
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover table-nowrap align-middle mb-0">
            <thead className="bg-light bg-opacity-50">
              <tr>
                <th className="ps-3 text-muted small">Name</th>
                <th className="text-muted small">Email</th>
                <th className="text-muted small">Phone</th>
                <th className="text-muted small">Referred By</th>
                <th className="text-muted small">KYC</th>
                <th className="text-muted small">Status</th>
                <th className="text-muted small">Joined</th>
                <th className="text-muted small text-end pe-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!agents ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    Loading...
                  </td>
                </tr>
              ) : agents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted">
                    No agents found.
                  </td>
                </tr>
              ) : (
                agents.map((agent) => (
                  <tr key={agent._id}>
                    <td className="ps-3 fw-medium">
                      <Link to={`/admin/agents/${agent._id}`}>{agent.name}</Link>
                    </td>
                    <td>{agent.email}</td>
                    <td>{agent.phone || "-"}</td>
                    <td>{agent.referredBy?.name || "-"}</td>
                    <td>
                      {agent.isKycVerified ? (
                        <span className="badge bg-success-subtle text-success">Verified</span>
                      ) : (
                        <span className="badge bg-warning-subtle text-warning">Pending</span>
                      )}
                    </td>
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