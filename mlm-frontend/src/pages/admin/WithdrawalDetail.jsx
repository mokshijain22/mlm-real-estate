import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api/axios.js";

function WithdrawalDetail() {
  const { id } = useParams();

  const [withdrawal, setWithdrawal] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [showApproveForm, setShowApproveForm] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [approveError, setApproveError] = useState("");

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  const load = () => {
    api
      .get(`/admin/withdrawals/${id}`)
      .then((res) => {
        setWithdrawal(res.data.withdrawal);
        setWallet(res.data.wallet);
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleApprove = (e) => {
    e.preventDefault();
    setApproveError("");
    setActionLoading(true);
    api
      .patch(`/admin/withdrawals/${id}/approve`, { payment_reference: paymentReference })
      .then(() => {
        setShowApproveForm(false);
        setPaymentReference("");
        load();
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setApproveError(Object.values(err.response.data.errors)[0]);
        } else {
          alert(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setActionLoading(false));
  };

  const handleReject = (e) => {
    e.preventDefault();
    setRejectError("");
    setActionLoading(true);
    api
      .patch(`/admin/withdrawals/${id}/reject`, { rejection_reason: rejectionReason })
      .then(() => {
        setShowRejectForm(false);
        setRejectionReason("");
        load();
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setRejectError(Object.values(err.response.data.errors)[0]);
        } else {
          alert(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setActionLoading(false));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!withdrawal) return <div className="text-center py-5">Loading...</div>;

  return (
    <>
      <div className="row align-items-center mb-4">
        <div className="col-sm-8">
          <Link to="/admin/withdrawals" className="text-muted small mb-1 d-inline-block">
            <iconify-icon icon="solar:arrow-left-linear" className="align-middle"></iconify-icon> Back to Withdrawals
          </Link>
          <h3 className="fw-bold mb-1">{withdrawal.agent?.name}</h3>
          <span
            className={`badge ${
              withdrawal.status === "approved"
                ? "bg-success-subtle text-success"
                : withdrawal.status === "rejected"
                ? "bg-danger-subtle text-danger"
                : "bg-warning-subtle text-warning"
            }`}
          >
            {withdrawal.status.charAt(0).toUpperCase() + withdrawal.status.slice(1)}
          </span>
        </div>
        {withdrawal.status === "pending" && (
          <div className="col-sm-4 text-sm-end mt-3 mt-sm-0 d-flex gap-2 justify-content-sm-end">
            <button className="btn btn-success" onClick={() => setShowApproveForm(!showApproveForm)}>
              <iconify-icon icon="solar:check-circle-bold-duotone" className="align-middle me-1"></iconify-icon>
              Approve
            </button>
            <button className="btn btn-danger" onClick={() => setShowRejectForm(!showRejectForm)}>
              <iconify-icon icon="solar:close-circle-bold-duotone" className="align-middle me-1"></iconify-icon>
              Reject
            </button>
          </div>
        )}
      </div>

      {withdrawal.status === "rejected" && withdrawal.rejectionReason && (
        <div className="alert alert-danger border-0 shadow-sm">
          <strong>Rejection Reason:</strong> {withdrawal.rejectionReason}
        </div>
      )}

      {withdrawal.status === "approved" && withdrawal.paymentReference && (
        <div className="alert alert-success border-0 shadow-sm">
          <strong>Payment Reference:</strong> {withdrawal.paymentReference}
        </div>
      )}

      {showApproveForm && (
        <div className="card border-0 shadow-sm mb-3 border-success">
          <div className="card-body">
            <form onSubmit={handleApprove}>
              <label className="form-label fw-semibold">Payment Reference</label>
              <input
                type="text"
                className={`form-control ${approveError ? "is-invalid" : ""}`}
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g. UTR / Transaction ID"
                required
              />
              {approveError && <div className="invalid-feedback">{approveError}</div>}
              <div className="mt-2 d-flex gap-2">
                <button type="submit" className="btn btn-success" disabled={actionLoading}>
                  {actionLoading ? "Processing..." : "Confirm Approve"}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowApproveForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRejectForm && (
        <div className="card border-0 shadow-sm mb-3 border-danger">
          <div className="card-body">
            <form onSubmit={handleReject}>
              <label className="form-label fw-semibold">Rejection Reason</label>
              <textarea
                className={`form-control ${rejectError ? "is-invalid" : ""}`}
                rows="3"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this request is being rejected (min 10 characters)..."
                required
              ></textarea>
              {rejectError && <div className="invalid-feedback">{rejectError}</div>}
              <div className="mt-2 d-flex gap-2">
                <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                  {actionLoading ? "Submitting..." : "Confirm Reject"}
                </button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => setShowRejectForm(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="row">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h4 className="card-title mb-0">Request Details</h4>
            </div>
            <div className="card-body">
              <table className="table table-borderless mb-0">
                <tbody>
                  <tr>
                    <td className="text-muted" style={{ width: "40%" }}>
                      Agent
                    </td>
                    <td className="fw-medium">{withdrawal.agent?.name}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Email</td>
                    <td className="fw-medium">{withdrawal.agent?.email}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Rank</td>
                    <td className="fw-medium">{withdrawal.agent?.rank?.name || "-"}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">KYC Status</td>
                    <td>
                      {withdrawal.agent?.isKycVerified ? (
                        <span className="badge bg-success-subtle text-success">Verified</span>
                      ) : (
                        <span className="badge bg-warning-subtle text-warning">Not Verified</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td className="text-muted">Points Type</td>
                    <td className="fw-medium">{withdrawal.pointsType}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Requested Amount</td>
                    <td className="fw-medium">₹{Math.round(withdrawal.amount).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">TDS Deducted</td>
                    <td className="text-danger fw-medium">-₹{Math.round(withdrawal.tdsAmount).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Net Payable</td>
                    <td className="fw-bold text-success fs-16">₹{Math.round(withdrawal.netAmount).toLocaleString("en-IN")}</td>
                  </tr>
                  <tr>
                    <td className="text-muted">Requested On</td>
                    <td className="fw-medium">{new Date(withdrawal.requestedAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                  {withdrawal.reviewedBy && (
                    <tr>
                      <td className="text-muted">Reviewed By</td>
                      <td className="fw-medium">{withdrawal.reviewedBy.name}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <h4 className="card-title mb-0">Agent's Current Wallet</h4>
            </div>
            <div className="card-body">
              {wallet ? (
                <table className="table table-borderless mb-0">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: "40%" }}>
                        BV Balance
                      </td>
                      <td className="fw-medium">{Number(wallet.bvBalance).toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">PV Balance</td>
                      <td className="fw-medium">{Number(wallet.pvBalance).toFixed(2)}</td>
                    </tr>
                    
                  </tbody>
                </table>
              ) : (
                <div className="text-muted">No wallet record found.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default WithdrawalDetail;