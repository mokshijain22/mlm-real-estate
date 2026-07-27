import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function Bookings() {
  const [bookings, setBookings] = useState(null);
  const [meta, setMeta] = useState(null);
  const [projects, setProjects] = useState([]);
  const [agents, setAgents] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState(null);

  const [status, setStatus] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("");
  const [projectId, setProjectId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = { page };
    if (status) params.status = status;
    if (approvalStatus) params.approval_status = approvalStatus;
    if (projectId) params.project_id = projectId;
    if (agentId) params.agent_id = agentId;
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    api
      .get("/admin/bookings", { params })
      .then((res) => {
        setBookings(res.data.data);
        setMeta(res.data.meta);
        setProjects(res.data.projects);
        setAgents(res.data.agents);
        setPendingCount(res.data.pendingCount);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  }, [status, approvalStatus, projectId, agentId, dateFrom, dateTo, page]);

  const resetToPage1 = (setter) => (val) => {
    setPage(1);
    setter(val);
  };

  const isAllTab = !status && !approvalStatus;

  const goTab = (nextStatus, nextApproval) => {
    setPage(1);
    setStatus(nextStatus);
    setApprovalStatus(nextApproval);
  };

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <>
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
         <h4 className="card-title mb-0">Booking Management</h4>
          <div className="d-flex gap-2">
            <Link to="/admin/bookings/create" className="btn btn-primary btn-sm shadow-sm">
              <iconify-icon icon="solar:add-circle-bold-duotone" className="align-middle me-1"></iconify-icon>
              Create Booking
            </Link>
            <Link to="/admin/bookings/pending" className="btn btn-warning btn-sm shadow-sm">
              <iconify-icon icon="solar:clock-circle-bold-duotone" className="align-middle me-1"></iconify-icon>
              Pending Approval
              {pendingCount > 0 && <span className="badge bg-danger ms-1">{pendingCount}</span>}
            </Link>
          </div>
        </div>

        <div className="card-body border-bottom pb-0">
          <ul className="nav nav-tabs border-0 mb-0">
            <li className="nav-item">
              <button className={`nav-link ${isAllTab ? "active" : ""}`} onClick={() => goTab("", "")}>
                All Bookings
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${approvalStatus === "pending" ? "active" : ""}`}
                onClick={() => goTab("", "pending")}
              >
                Pending Approval <span className="badge bg-warning text-dark ms-1">{pendingCount}</span>
              </button>
            </li>
            <li className="nav-item">
              <button className={`nav-link ${status === "active" ? "active" : ""}`} onClick={() => goTab("active", "")}>
                Active
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${status === "completed" ? "active" : ""}`}
                onClick={() => goTab("completed", "")}
              >
                Completed
              </button>
            </li>
          </ul>
        </div>

        <div className="card-body">
          <div className="row g-3 mb-4">
            <div className="col-md-2">
              <label className="form-label small text-muted">Project</label>
              <select className="form-select" value={projectId} onChange={(e) => resetToPage1(setProjectId)(e.target.value)}>
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted">Status</label>
              <select className="form-select" value={status} onChange={(e) => resetToPage1(setStatus)(e.target.value)}>
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted">Approval</label>
              <select
                className="form-select"
                value={approvalStatus}
                onChange={(e) => resetToPage1(setApprovalStatus)(e.target.value)}
              >
                <option value="">All Approval</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small text-muted">Agent</label>
              <select className="form-select" value={agentId} onChange={(e) => resetToPage1(setAgentId)(e.target.value)}>
                <option value="">All Agents</option>
                {agents.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small text-muted">Date Range</label>
              <div className="input-group">
                <input
                  type="date"
                  className="form-control"
                  value={dateFrom}
                  onChange={(e) => resetToPage1(setDateFrom)(e.target.value)}
                />
                <span className="input-group-text">to</span>
                <input
                  type="date"
                  className="form-control"
                  value={dateTo}
                  onChange={(e) => resetToPage1(setDateTo)(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-centered table-nowrap mb-0">
              <thead className="table-light">
                <tr>
                  <th>Booking #</th>
                  <th>Customer</th>
                  <th>Plot</th>
                  <th>Project</th>
                  <th>Agent</th>
                  <th>Rank @ Booking</th>
                  <th>Total Amount</th>
                  <th>EMI Amount</th>
                  <th>Mode</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Reason</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!bookings ? (
                  <tr>
                    <td colSpan="14" className="text-center py-4">
                      Loading...
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan="14" className="text-center py-4">
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  bookings.map((b) => {
                    let reasonText = "-";
                    let reasonClass = "text-muted";
                    if (b.approvalStatus === "rejected" && b.rejectionReason) {
                      reasonText = b.rejectionReason.length > 20 ? b.rejectionReason.slice(0, 20) + "..." : b.rejectionReason;
                      reasonClass = "text-danger";
                    } else if (b.approvalStatus === "approved" && b.approvalReason) {
                      reasonText = b.approvalReason.length > 20 ? b.approvalReason.slice(0, 20) + "..." : b.approvalReason;
                      reasonClass = "text-success";
                    } else if (b.notes) {
                      reasonText = b.notes.length > 20 ? b.notes.slice(0, 20) + "..." : b.notes;
                      reasonClass = "text-muted";
                    }

                    const approvalBadge =
                      b.approvalStatus === "approved"
                        ? "bg-success"
                        : b.approvalStatus === "pending"
                        ? "bg-warning"
                        : b.approvalStatus === "rejected"
                        ? "bg-danger"
                        : "bg-secondary";

                    return (
                      <tr key={b._id}>
                        <td className="fw-bold text-primary">{b.bookingNumber}</td>
                        <td>{b.customer?.name}</td>
                        <td>{b.plot?.plotNumber}</td>
                        <td>{b.project?.name}</td>
                        <td>{b.agent?.name}</td>
                        <td>
                          <span className="badge bg-secondary-subtle text-secondary">
                            {b.agentRank?.abbreviation || "N/A"}
                          </span>
                        </td>
                        <td>₹{Number(b.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>
                          ₹{Number(b.emiAmount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} x {b.emiMonths}
                        </td>
                        <td>
                          <span className="text-uppercase small fw-bold">{b.paymentMode}</span>
                        </td>
                        <td>
                          {b.status === "active" ? (
                            <span className="badge bg-primary-subtle text-primary">Active</span>
                          ) : b.status === "completed" ? (
                            <span className="badge bg-success-subtle text-success">Completed</span>
                          ) : (
                            <span className="badge bg-danger-subtle text-danger">Cancelled</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${approvalBadge}`}>
                            {b.approvalStatus.charAt(0).toUpperCase() + b.approvalStatus.slice(1)}
                          </span>
                        </td>
                        <td>
                          <span className={`small ${reasonClass}`}>{reasonText}</span>
                        </td>
                        <td>{new Date(b.bookingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td>
                          <div className="d-flex gap-1">
                            <Link to={`/admin/bookings/${b._id}`} className="btn btn-soft-primary btn-sm">
                              View
                            </Link>
                            {b.approvalStatus === "pending" && (
                              <Link to={`/admin/bookings/${b._id}`} className="btn btn-soft-success btn-sm">
                                Review
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {meta && (
            <div className="mt-3 d-flex justify-content-between align-items-center">
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
    </>
  );
}

export default Bookings;