import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";

function BookingsPending() {
  const [bookings, setBookings] = useState(null);
  const [meta, setMeta] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  const [approveTarget, setApproveTarget] = useState(null);
  const [approvalReason, setApprovalReason] = useState("");
  const [approveSaving, setApproveSaving] = useState(false);
  const [approveError, setApproveError] = useState(null);

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectSaving, setRejectSaving] = useState(false);
  const [rejectError, setRejectError] = useState(null);

  const load = () => {
    api
      .get("/admin/bookings/pending", { params: { page } })
      .then((res) => {
        setBookings(res.data.data);
        setMeta(res.data.meta);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(load, [page]);

  const openApprove = (b) => {
    setApproveTarget(b);
    setApprovalReason("");
    setApproveError(null);
  };
  const closeApprove = () => setApproveTarget(null);

  const submitApprove = () => {
    setApproveSaving(true);
    setApproveError(null);
    api
      .patch(`/admin/bookings/${approveTarget._id}/approve`, { approval_reason: approvalReason })
      .then(() => {
        closeApprove();
        load();
      })
      .catch((err) => setApproveError(err.response?.data?.message || err.message))
      .finally(() => setApproveSaving(false));
  };

  const openReject = (b) => {
    setRejectTarget(b);
    setRejectionReason("");
    setRejectError(null);
  };
  const closeReject = () => setRejectTarget(null);

  const submitReject = () => {
    if (!rejectionReason || rejectionReason.trim().length < 3) {
      setRejectError("Rejection reason must be at least 3 characters.");
      return;
    }
    setRejectSaving(true);
    setRejectError(null);
    api
      .patch(`/admin/bookings/${rejectTarget._id}/reject`, { rejection_reason: rejectionReason })
      .then(() => {
        closeReject();
        load();
      })
      .catch((err) => setRejectError(err.response?.data?.errors?.rejection_reason || err.response?.data?.message || err.message))
      .finally(() => setRejectSaving(false));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;

  return (
    <div className="row">
      <div className="col-12">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-bottom d-flex justify-content-between align-items-center py-3">
            <h4 className="header-title m-0 text-dark fw-bold">Pending Booking Approvals</h4>
            <Link to="/admin/bookings" className="btn btn-outline-secondary btn-sm rounded-pill px-3">
              <iconify-icon icon="solar:list-bold-duotone" className="align-middle me-1"></iconify-icon>
              All Bookings
            </Link>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover table-centered mb-0 align-middle">
                <thead className="table-light">
                  <tr className="text-muted small text-uppercase">
                    <th className="ps-3" style={{ width: 120 }}>Booking #</th>
                    <th>Customer</th>
                    <th>Plot Details</th>
                    <th>Agent</th>
                    <th className="text-end">Total Amount</th>
                    <th className="text-end">Deposit</th>
                    <th className="text-center">Date</th>
                    <th className="pe-3 text-end" style={{ width: 250 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!bookings ? (
                    <tr>
                      <td colSpan="8" className="text-center py-4">Loading...</td>
                    </tr>
                  ) : bookings.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-5">
                        <div className="text-muted">
                          <iconify-icon icon="solar:folder-open-bold-duotone" className="fs-1 align-middle mb-2"></iconify-icon>
                          <p className="mb-0">No pending bookings found at the moment.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bookings.map((b) => (
                      <tr key={b._id}>
                        <td className="ps-3"><span className="fw-bold text-primary">{b.bookingNumber}</span></td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div
                              className="avatar-sm bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-2 fw-bold"
                              style={{ width: 32, height: 32 }}
                            >
                              {b.customer?.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="fw-medium">{b.customer?.name}</span>
                          </div>
                        </td>
                        <td>
                          <div className="text-dark fw-semibold">{b.project?.name || "N/A"}</div>
                          <div className="text-muted small">Plot: {b.plot?.plotNumber || "N/A"}</div>
                        </td>
                        <td>
                          <span className="text-muted small">by</span> {b.agent?.name || "N/A"}
                        </td>
                        <td className="text-end fw-bold text-dark">
                          ₹ {Number(b.totalAmount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="text-end fw-bold text-success">
                          ₹ {Number(b.bookingAmount).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="text-center text-muted small">
                          {new Date(b.bookingDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="pe-3 text-end">
                          <div className="btn-group gap-1">
                            <Link to={`/admin/bookings/${b._id}`} className="btn btn-sm btn-light border-0 shadow-none text-primary" title="Review">
                              <iconify-icon icon="solar:eye-bold-duotone"></iconify-icon>
                            </Link>
                            <button
                              type="button"
                              className="btn btn-sm btn-success-subtle text-success border-0 px-2"
                              onClick={() => openApprove(b)}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-danger-subtle text-danger border-0 px-2"
                              onClick={() => openReject(b)}
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {meta && (
            <div className="card-footer bg-white border-top d-flex justify-content-between align-items-center">
              <span className="text-muted small">
                Page {meta.page} of {meta.lastPage || 1} ({meta.total} total)
              </span>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </button>
                <button className="btn btn-sm btn-outline-secondary" disabled={page >= meta.lastPage} onClick={() => setPage((p) => p + 1)}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Approve Modal */}
      {approveTarget && (
        <>
          <div className="modal fade show" style={{ display: "block" }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold">Approve Booking: {approveTarget.bookingNumber}</h5>
                  <button type="button" className="btn-close" onClick={closeApprove}></button>
                </div>
                <div className="modal-body py-4">
                  {approveError && <div className="alert alert-danger">{approveError}</div>}
                  <div className="text-center mb-3">
                    <div className="avatar-lg bg-success-subtle text-success rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3">
                      <iconify-icon icon="solar:check-read-bold-duotone" className="fs-2"></iconify-icon>
                    </div>
                    <p className="text-muted px-3">Are you sure you want to approve this booking? This will activate the plot and generate EMIs.</p>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium text-dark">Approval Note (Optional)</label>
                    <textarea
                      className="form-control border-light-subtle bg-light-subtle"
                      rows="3"
                      placeholder="Add a note for the agent..."
                      value={approvalReason}
                      onChange={(e) => setApprovalReason(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={closeApprove}>
                    Close
                  </button>
                  <button type="button" className="btn btn-success rounded-pill px-4" disabled={approveSaving} onClick={submitApprove}>
                    {approveSaving ? "Approving..." : "Approve & Activate"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <>
          <div className="modal fade show" style={{ display: "block" }} tabIndex="-1">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header border-0 pb-0">
                  <h5 className="modal-title fw-bold text-danger">Reject Booking: {rejectTarget.bookingNumber}</h5>
                  <button type="button" className="btn-close" onClick={closeReject}></button>
                </div>
                <div className="modal-body py-4">
                  {rejectError && <div className="alert alert-danger">{rejectError}</div>}
                  <div className="text-center mb-3">
                    <div className="avatar-lg bg-danger-subtle text-danger rounded-circle d-inline-flex align-items-center justify-content-center mx-auto mb-3">
                      <iconify-icon icon="solar:close-circle-bold-duotone" className="fs-2"></iconify-icon>
                    </div>
                    <p className="text-muted px-3">
                      This will cancel the booking and release the plot back to <strong>AVAILABLE</strong> status.
                    </p>
                  </div>
                  <div className="mb-3 px-2">
                    <label className="form-label fw-medium text-dark">
                      Rejection Reason <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control border-light-subtle bg-light-subtle"
                      rows="4"
                      placeholder="Explain why this booking is being rejected..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer border-0 pt-0">
                  <button type="button" className="btn btn-light rounded-pill px-4" onClick={closeReject}>
                    Close
                  </button>
                  <button type="button" className="btn btn-danger rounded-pill px-4" disabled={rejectSaving} onClick={submitReject}>
                    {rejectSaving ? "Rejecting..." : "Reject & Release Plot"}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </div>
  );
}

export default BookingsPending;