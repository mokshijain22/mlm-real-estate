import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import { getStoredUser } from "../../utils/userHelpers.js";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtMoney(n) {
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function emiLabel(emiNumber) {
  if (emiNumber === -1) return "Down Payment";
  if (emiNumber === 0) return "Booking Token";
  if (emiNumber === 99) return "Registry";
  if (emiNumber < 0) return `Down Payment ${Math.abs(emiNumber)}`;
  return `EMI ${emiNumber}`;
}

function EmiEditRequests() {
  const isSuperAdminUser = getStoredUser()?.role === "super_admin";
  const [emis, setEmis] = useState(null);
  const [error, setError] = useState(null);
  const [actionId, setActionId] = useState(null);
  const [actionError, setActionError] = useState("");
  // Super Admin defaults to their action queue (pending only). Sub Admin
  // defaults to "all" so they can see the outcome of past requests too.
  const [statusFilter, setStatusFilter] = useState(isSuperAdminUser ? "pending" : "all");

  const load = () => {
    api
      .get("/admin/emis/edit-requests", { params: { status: statusFilter } })
      .then((res) => setEmis(res.data.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(load, [statusFilter]);

  const statusBadge = (status) => {
    if (status === "approved") return <span className="badge bg-success-subtle text-success">Approved</span>;
    if (status === "rejected") return <span className="badge bg-danger-subtle text-danger">Rejected</span>;
    return <span className="badge bg-warning-subtle text-warning">Pending</span>;
  };

  const approve = (id) => {
    setActionId(id);
    setActionError("");
    api
      .post(`/admin/emis/${id}/approve-edit`)
      .then(load)
      .catch((err) => setActionError(err.response?.data?.message || err.message))
      .finally(() => setActionId(null));
  };

  const reject = (id) => {
    const reason = window.prompt("Reason for rejecting this edit (optional):") || "";
    setActionId(id);
    setActionError("");
    api
      .post(`/admin/emis/${id}/reject-edit`, { rejection_reason: reason })
      .then(load)
      .catch((err) => setActionError(err.response?.data?.message || err.message))
      .finally(() => setActionId(null));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="row">
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3">
            <h4 className="header-title m-0 text-dark fw-bold">
              {isSuperAdminUser ? "Pending Installment Edit Approvals" : "My Pending Edit Requests"}
            </h4>
            <div className="d-flex gap-2">
              <select
                className="form-select form-select-sm"
                style={{ width: 160 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <Link to="/admin/bookings" className="btn btn-outline-secondary btn-sm rounded-pill px-3">
                <iconify-icon icon="solar:list-bold-duotone" className="align-middle me-1"></iconify-icon>
                All Bookings
              </Link>
            </div>
          </div>
          <div className="card-body p-0">
            {actionError && <div className="alert alert-danger m-3">{actionError}</div>}
            <div className="table-responsive">
              <table className="table table-hover table-centered mb-0 align-middle">
                <thead className="table-light">
                  <tr className="text-muted small text-uppercase">
                    <th className="ps-3">Booking #</th>
                    <th>Customer</th>
                    <th>Installment</th>
                    <th className="text-end">Current</th>
                    <th className="text-end">Proposed</th>
                    <th>Requested By</th>
                    <th className="text-center">Requested On</th>
                    <th className="text-center">Status</th>
                    {isSuperAdminUser && <th className="pe-3 text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {!emis ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4">Loading...</td>
                    </tr>
                  ) : emis.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <div className="text-muted">
                          <iconify-icon icon="solar:folder-open-bold-duotone" className="fs-1 align-middle mb-2"></iconify-icon>
                          <p className="mb-0">No pending edit requests right now.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    emis.map((emi) => (
                      <tr key={emi._id}>
                        <td className="ps-3">
                          <Link to={`/admin/bookings/${emi.booking?._id}`} className="fw-bold text-primary">
                            {emi.booking?.bookingNumber}
                          </Link>
                        </td>
                        <td>{emi.booking?.customer?.name || "N/A"}</td>
                        <td>{emiLabel(emi.emiNumber)}</td>
                        <td className="text-end text-muted">
                          ₹ {fmtMoney(emi.amount)}
                          <div className="small">{fmtDate(emi.dueDate)}</div>
                        </td>
                        <td className="text-end fw-bold text-dark">
                          ₹ {fmtMoney(emi.editRequest.proposedAmount)}
                          <div className="small text-muted">
                            {emi.editRequest.proposedDueDate ? fmtDate(emi.editRequest.proposedDueDate) : "-"}
                          </div>
                        </td>
                        <td>{emi.editRequest.requestedBy?.name || "N/A"}</td>
                        <td className="text-center text-muted small">
                          {emi.editRequest.requestedAt ? fmtDate(emi.editRequest.requestedAt) : "-"}
                        </td>
                        <td className="text-center">
                          {statusBadge(emi.editRequest.status)}
                          {emi.editRequest.status === "rejected" && emi.editRequest.rejectionReason && (
                            <div className="small text-muted mt-1">{emi.editRequest.rejectionReason}</div>
                          )}
                          {emi.editRequest.status !== "pending" && emi.editRequest.reviewedBy?.name && (
                            <div className="small text-muted">by {emi.editRequest.reviewedBy.name}</div>
                          )}
                        </td>
                        {isSuperAdminUser && (
                          <td className="pe-3 text-end">
                            {emi.editRequest.status === "pending" ? (
                              <div className="btn-group gap-1">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-success-subtle text-success border-0 px-2"
                                  disabled={actionId === emi._id}
                                  onClick={() => approve(emi._id)}
                                >
                                  {actionId === emi._id ? "..." : "Approve"}
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-danger-subtle text-danger border-0 px-2"
                                  disabled={actionId === emi._id}
                                  onClick={() => reject(emi._id)}
                                >
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-muted small">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmiEditRequests;