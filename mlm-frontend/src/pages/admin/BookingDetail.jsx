import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import api from "../../api/axios.js";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(d) {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtMoney(n) {
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BookingDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  const [booking, setBooking] = useState(null);
  const [emis, setEmis] = useState([]);
  const [commissionPreview, setCommissionPreview] = useState({ rows: [], summary: null });
  const [commissionProgress, setCommissionProgress] = useState({ paidEmisCount: 0, totalEmisCount: 0, actualCreditedByAgent: {} });
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [showApproveForm, setShowApproveForm] = useState(false);
  const [approvalReason, setApprovalReason] = useState("");

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  const [payingEmiId, setPayingEmiId] = useState(null);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [payError, setPayError] = useState("");

  const load = () => {
    api
      .get(`/admin/bookings/${id}`)
      .then((res) => {
        setBooking(res.data.booking);
        setEmis(res.data.emis);
        setCommissionPreview(res.data.commissionPreview || { rows: [], summary: null });
        setCommissionProgress(res.data.commissionProgress || { paidEmisCount: 0, totalEmisCount: 0, actualCreditedByAgent: {} });
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (booking && searchParams.get("print") === "1") {
      setTimeout(() => window.print(), 300);
    }
  }, [booking, searchParams]);

  const handleApprove = (e) => {
    e.preventDefault();
    setActionLoading(true);
    api
      .patch(`/admin/bookings/${id}/approve`, { approval_reason: approvalReason })
      .then(() => {
        setShowApproveForm(false);
        setApprovalReason("");
        load();
      })
      .catch((err) => alert(err.response?.data?.message || err.message))
      .finally(() => setActionLoading(false));
  };

  const handleReject = (e) => {
    e.preventDefault();
    setRejectError("");
    setActionLoading(true);
    api
      .patch(`/admin/bookings/${id}/reject`, { rejection_reason: rejectionReason })
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

  const handlePayEmi = (e) => {
    e.preventDefault();
    setPayError("");
    setActionLoading(true);
    api
      .post(`/admin/emis/${payingEmiId}/mark-paid`, {
        paid_date: paidDate,
        payment_mode: paymentMode,
        payment_reference: paymentReference || undefined,
      })
      .then(() => {
        setPayingEmiId(null);
        setPaymentReference("");
        load();
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setPayError(Object.values(err.response.data.errors)[0]);
        } else {
          setPayError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setActionLoading(false));
  };

  const handleCancel = () => {
    if (!window.confirm("Are you sure you want to cancel this booking? This will free up the plot.")) return;
    setActionLoading(true);
    api
      .patch(`/admin/bookings/${id}/cancel`)
      .then(() => load())
      .catch((err) => alert(err.response?.data?.message || err.message))
      .finally(() => setActionLoading(false));
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!booking) return <div className="text-center py-5">Loading...</div>;

  const rankMismatch =
    booking.agentRank && booking.agent?.rank && booking.agent.rank._id !== booking.agentRank._id;

  return (
    <div className="row">
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }
          body {
            background: #fff !important;
          }
          .wrapper > .topbar-custom,
          .wrapper > .left-side-menu,
          .app-footer,
          .no-print,
          .d-print-none {
            display: none !important;
          }
          .page-content {
            margin: 0 !important;
            padding: 0 !important;
          }
          .container-fluid {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
          }
          .col-xl-9 {
            width: 100% !important;
            max-width: 100% !important;
            flex: 0 0 100% !important;
          }
        }
      `}</style>
      <div className="col-xl-9">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center py-3 d-print-none">
            <h4 className="card-title mb-0">Booking Details: {booking.bookingNumber}</h4>
            <div>
              {booking.status === "active" && (
                <button className="btn btn-soft-danger btn-sm" onClick={handleCancel} disabled={actionLoading}>
                  Cancel Booking
                </button>
              )}
              <Link to="/admin/bookings" className="btn btn-light btn-sm ms-2">
                Back to List
              </Link>
              <button className="btn btn-primary btn-sm ms-2" onClick={() => window.print()}>
                Print
              </button>
            </div>
          </div>
          <div className="d-none d-print-block p-4 pb-0 text-center">
            <h3 className="mb-1">{booking.project?.name}</h3>
            <p className="text-muted mb-0">Booking Receipt</p>
            <hr />
          </div>
          <div className="card-body">
            {/* Status banners */}
            {booking.approvalStatus === "pending" && (
              <div className="alert alert-warning border-0 mb-4 d-print-none">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <iconify-icon icon="solar:clock-circle-bold-duotone" className="fs-24 me-2"></iconify-icon>
                    <div>
                      <h5 className="alert-heading mb-1">Pending Approval</h5>
                      <p className="mb-0 small">This booking was created by an agent and is waiting for review.</p>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-success btn-sm" onClick={() => setShowApproveForm(!showApproveForm)}>
                      Approve
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => setShowRejectForm(!showRejectForm)}>
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )}

            {booking.approvalStatus === "rejected" && (
              <div className="alert alert-danger border-0 mb-4 d-print-none">
                <div className="d-flex align-items-center">
                  <iconify-icon icon="solar:close-circle-bold-duotone" className="fs-24 me-2"></iconify-icon>
                  <div>
                    <h5 className="alert-heading mb-1">Booking Rejected</h5>
                    <p className="mb-1">
                      <strong>Reason:</strong> {booking.rejectionReason || "No reason provided."}
                    </p>
                    <p className="mb-0 small text-muted">
                      Rejected by {booking.approvedBy?.name || "Admin"} on {booking.approvedAt ? fmtDateTime(booking.approvedAt) : "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {booking.approvalStatus === "approved" && booking.status !== "cancelled" && (
              <div className="alert alert-success border-0 mb-4 d-print-none">
                <div className="d-flex align-items-center">
                  <iconify-icon icon="solar:check-circle-bold-duotone" className="fs-24 me-2"></iconify-icon>
                  <div>
                    <h5 className="alert-heading mb-1">Booking Approved</h5>
                    <p className="mb-1">This booking was approved and is now active.</p>
                    {booking.approvalReason && (
                      <p className="mb-1 small">
                        <strong>Note:</strong> {booking.approvalReason}
                      </p>
                    )}
                    <p className="mb-0 small text-muted">
                      Approved by {booking.approvedBy?.name || "Admin"} on {booking.approvedAt ? fmtDateTime(booking.approvedAt) : "-"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {booking.status === "cancelled" && booking.approvalStatus !== "rejected" && (
              <div className="alert alert-danger border-0 mb-4 d-print-none">
                <div className="d-flex align-items-center">
                  <iconify-icon icon="solar:trash-bin-trash-bold-duotone" className="fs-24 me-2"></iconify-icon>
                  <div>
                    <h5 className="alert-heading mb-1">Booking Cancelled</h5>
                    <p className="mb-0 small">This booking has been cancelled and the plot has been released.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Approve form */}
            {showApproveForm && (
              <div className="card border-0 shadow-sm mb-3 border-success d-print-none">
                <div className="card-body">
                  <form onSubmit={handleApprove}>
                    <p>Are you sure you want to approve this booking? This will activate the plot and generate EMIs.</p>
                    <label className="form-label">Approval Note (Optional)</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      placeholder="Note for the agent..."
                      value={approvalReason}
                      onChange={(e) => setApprovalReason(e.target.value)}
                    ></textarea>
                    <div className="mt-2 d-flex gap-2">
                      <button type="submit" className="btn btn-success" disabled={actionLoading}>
                        {actionLoading ? "Processing..." : "Approve & Activate"}
                      </button>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowApproveForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Reject form */}
            {showRejectForm && (
              <div className="card border-0 shadow-sm mb-3 border-danger d-print-none">
                <div className="card-body">
                  <form onSubmit={handleReject}>
                    <p className="text-danger">This will cancel the booking and release the plot back to available status.</p>
                    <label className="form-label">
                      Rejection Reason <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className={`form-control ${rejectError ? "is-invalid" : ""}`}
                      rows="3"
                      required
                      placeholder="Explain why this booking is being rejected (min 10 characters)..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                    ></textarea>
                    {rejectError && <div className="invalid-feedback">{rejectError}</div>}
                    <div className="mt-2 d-flex gap-2">
                      <button type="submit" className="btn btn-danger" disabled={actionLoading}>
                        {actionLoading ? "Submitting..." : "Reject & Release Plot"}
                      </button>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setShowRejectForm(false)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Customer & Agent / Property Info */}
            <div className="row mb-4">
              <div className="col-md-6 border-end">
                <h5 className="text-primary mb-3">Customer & Agent</h5>
                <table className="table table-sm table-borderless mb-0">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: "140px" }}>Customer:</td>
                      <td className="fw-bold">{booking.customer?.name}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Customer Code:</td>
                      <td>{booking.customer?.customerCode}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Agent:</td>
                      <td className="fw-bold">{booking.agent?.name}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Current Rank:</td>
                      <td>
                        {booking.agent?.rank?.name} ({booking.agent?.rank?.abbreviation})
                      </td>
                    </tr>
                    <tr>
                      <td className="text-muted">Rank at Booking:</td>
                      <td className="fw-bold">
                        {booking.agentRank?.name || "N/A"} ({booking.agentRank?.abbreviation || "N/A"})
                      </td>
                    </tr>
                  </tbody>
                </table>
                {rankMismatch && (
                  <div className="alert alert-info border-0 p-2 mt-2 d-print-none">
                    <iconify-icon icon="solar:info-circle-broken" className="fs-18 me-1 align-middle"></iconify-icon>
                    <span className="small">
                      Agent promoted since booking. Commission calculated at booking rank:{" "}
                      <strong>{booking.agentRank?.abbreviation}</strong>
                    </span>
                  </div>
                )}
              </div>
              <div className="col-md-6">
                <h5 className="text-primary mb-3">Property Info</h5>
                <table className="table table-sm table-borderless mb-0">
                  <tbody>
                    <tr>
                      <td className="text-muted" style={{ width: "140px" }}>Project:</td>
                      <td className="fw-bold">{booking.project?.name}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Plot Number:</td>
                      <td className="fw-bold">{booking.plot?.plotNumber}</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Total Area:</td>
                      <td>{fmtMoney(booking.totalArea)} sqft</td>
                    </tr>
                    <tr>
                      <td className="text-muted">Rate:</td>
                      <td>₹ {fmtMoney(booking.pricePerSqft)} / sqft</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary bar */}
            <div className="row bg-light rounded p-3 mx-0 mb-4 g-3">
              <div className="col-6 col-md-3">
                <p className="text-muted mb-1 small">Total Amount</p>
                <h4 className="mb-0 text-break">₹ {fmtMoney(booking.totalAmount)}</h4>
              </div>
              <div className="col-6 col-md-3">
                <p className="text-muted mb-1 small">Booking Deposit</p>
                <h4 className="mb-0 text-break">₹ {fmtMoney(booking.bookingAmount)}</h4>
              </div>
              <div className="col-6 col-md-3">
                <p className="text-muted mb-1 small">Remaining Balance</p>
                <h4 className="mb-0 text-primary text-break">₹ {fmtMoney(booking.remainingAmount)}</h4>
              </div>
              <div className="col-6 col-md-3">
                <p className="text-muted mb-1 small">Status</p>
                {booking.status === "active" ? (
                  <span className="badge bg-primary">Active</span>
                ) : booking.status === "completed" ? (
                  <span className="badge bg-success">Completed</span>
                ) : (
                  <span className="badge bg-danger">Cancelled</span>
                )}
              </div>
            </div>

            {/* EMI schedule */}
            <h5 className="text-primary mb-3">Installment Schedule (EMIs)</h5>
            <div className="table-responsive">
              <table className="table table-sm table-centered">
                <thead className="table-light">
                  <tr>
                    <th>#</th>
                    <th>Milestone</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Sqft</th>
                    <th>Status</th>
                    <th>Paid Date</th>
                    <th>Reference</th>
                    <th className="d-print-none">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {emis.map((emi) => (
                    <tr key={emi._id}>
                      <td>{emi.emiNumber}</td>
                      <td>
                        {emi.emiNumber === -1
                          ? "Down Payment"
                          : emi.emiNumber === -2
                          ? "Down Payment 2"
                          : emi.emiNumber === 0
                          ? "Booking Token"
                          : emi.emiNumber === 99
                          ? "Registry"
                          : `EMI ${emi.emiNumber}`}
                      </td>
                      <td>{fmtDate(emi.dueDate)}</td>
                      <td>₹ {fmtMoney(emi.amount)}</td>
                      <td>{fmtMoney(emi.sqftPortion)}</td>
                      <td>
                        {emi.status === "paid" ? (
                          <span className="badge bg-success-subtle text-success">Paid</span>
                        ) : emi.status === "pending" ? (
                          <span className="badge bg-warning-subtle text-warning">Pending</span>
                        ) : emi.status === "overdue" ? (
                          <span className="badge bg-danger-subtle text-danger">Overdue</span>
                        ) : (
                          <span className="badge bg-light text-muted">Cancelled</span>
                        )}
                      </td>
                      <td>{emi.paidDate ? fmtDate(emi.paidDate) : "-"}</td>
                      <td>{emi.paymentReference || "-"}</td>
                      <td className="d-print-none">
                        {emi.status !== "paid" && emi.status !== "cancelled" && booking.status === "active" && (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              setPayingEmiId(emi._id);
                              setPaymentMode("cash");
                              setPaymentReference("");
                              setPayError("");
                              setPaidDate(new Date().toISOString().slice(0, 10));
                            }}
                          >
                            Pay
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {payingEmiId && (
              <div className="card border-0 shadow-sm mb-4 border-primary d-print-none">
                <div className="card-body">
                  <form onSubmit={handlePayEmi}>
                    <h6 className="mb-3">
                      Pay{" "}
                      {(() => {
                        const n = emis.find((e) => e._id === payingEmiId)?.emiNumber;
                        return n === -1
                          ? "Down Payment"
                          : n === -2
                          ? "Down Payment 2"
                          : n === 0
                          ? "Booking Token"
                          : n === 99
                          ? "Registry"
                          : `EMI #${n}`;
                      })()}{" "}
                      — ₹{" "}
                      {fmtMoney(emis.find((e) => e._id === payingEmiId)?.amount || 0)}
                    </h6>
                    <div className="row g-3">
                      <div className="col-md-4">
                        <label className="form-label">Payment Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={paidDate}
                          onChange={(e) => setPaidDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Payment Mode</label>
                        <select className="form-select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} required>
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="net_banking">Net Banking</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="cheque">Cheque</option>
                          <option value="card">Card</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label">Reference (Optional)</label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="TXN ID / Receipt Number"
                          value={paymentReference}
                          onChange={(e) => setPaymentReference(e.target.value)}
                        />
                      </div>
                    </div>
                    {payError && <div className="text-danger small mt-2">{payError}</div>}
                    <div className="mt-3 d-flex gap-2">
                      <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                        {actionLoading ? "Processing..." : "Receive Payment"}
                      </button>
                      <button type="button" className="btn btn-outline-secondary" onClick={() => setPayingEmiId(null)}>
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Commission preview */}
            <h5 className="text-primary mt-4 mb-3 d-print-none">Commission Distribution Preview</h5>

            {(() => {
              const paidLines = emis.filter((e) => e.status === "paid");
              const totalLines = emis.length;
              const paidAmount = paidLines.reduce((s, e) => s + (e.amount || 0), 0);
              const totalAmount = emis.reduce((s, e) => s + (e.amount || 0), 0);
              const progressPct = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 1000) / 10 : 0;
              return totalLines > 0 ? (
                <div className="alert alert-light border d-print-none mb-3 py-2 px-3">
                  <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <span className="small">
                      <strong>{paidLines.length} of {totalLines}</strong> payment lines collected —{" "}
                      ₹{fmtMoney(paidAmount)} of ₹{fmtMoney(totalAmount)} ({progressPct}%)
                    </span>
                  </div>
                  <div className="progress mt-2" style={{ height: 6 }}>
                    <div className="progress-bar bg-success" role="progressbar" style={{ width: `${progressPct}%` }}></div>
                  </div>
                  <p className="text-muted fs-12 mb-0 mt-2">
                    The commission numbers below are the FULL projected total across every EMI in this booking —
                    not just what's been collected so far. As more EMIs get paid, more of this commission actually
                    gets credited to each agent's wallet.
                  </p>
                </div>
              ) : null;
            })()}

            {commissionPreview.summary && (
              <div className="row bg-light rounded p-3 mx-0 mb-3 g-3 d-print-none">
                <div className="col-6 col-md-3">
                  <p className="text-muted mb-1 small">Total Booking Amount</p>
                  <h5 className="mb-0 text-break">₹ {fmtMoney(commissionPreview.summary.totalBookingAmount)}</h5>
                </div>
                <div className="col-6 col-md-3">
                  <p className="text-muted mb-1 small">Booking Deposit (Token + DP)</p>
                  <h5 className="mb-0 text-break">₹ {fmtMoney(commissionPreview.summary.bookingDepositAmount)}</h5>
                </div>
                <div className="col-6 col-md-3">
                  <p className="text-muted mb-1 small">Commission from EMIs</p>
                  <h5 className="mb-0 text-break">₹ {fmtMoney(commissionPreview.summary.totalEmiCommission)}</h5>
                </div>
                <div className="col-6 col-md-3">
                  <p className="text-muted mb-1 small">Grand Total Commission</p>
                  <h5 className="mb-0 text-success fw-bold text-break">
                    ₹ {fmtMoney(commissionPreview.summary.grandTotalCommission)}
                  </h5>
                </div>
              </div>
            )}
            <p className="text-muted fs-12 fst-italic mb-2 d-print-none">
              "Deposit Comm" = one-time commission on Booking Token + Down Payment (released together, per processCombinedDepositCommission).
              "EMI Total" = commission across all {""}
              {commissionPreview.rows[0] ? "monthly EMIs" : "EMIs"}. Grand Total = both combined — this is the agent's full earning from this booking.
            </p>

            <div className="table-responsive d-print-none">
              <table className="table table-sm table-centered text-nowrap">
                <thead className="table-light">
                  <tr>
                    <th>Agent Name</th>
                    <th>Rank</th>
                    <th>Role</th>
                    <th>Pts / sqft</th>
                    <th>Comm / EMI</th>
                    <th>Deposit Comm</th>
                    <th>Registry Comm</th>
                    <th>EMI Total (projected)</th>
                    <th>Grand Total (projected)</th>
                    <th>EMIs Paid</th>
                    <th>Actually Credited</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionPreview.rows.map((item, idx) => {
                    const creditedSoFar = item.agent_id ? commissionProgress.actualCreditedByAgent[String(item.agent_id)] || 0 : null;
                    return (
                      <tr key={idx} className={item.role === "Selling Agent" ? "table-primary" : ""}>
                        <td>{item.agent_name}</td>
                        <td>{item.rank}</td>
                        <td>{item.role}</td>
                        <td>{Number(item.points_per_sf).toFixed(2)}</td>
                        <td>₹ {fmtMoney(item.commission_per_emi)}</td>
                        <td>₹ {fmtMoney(item.deposit_commission)}</td>
                        <td>₹ {fmtMoney(item.registry_commission)}</td>
                        <td>₹ {fmtMoney(item.total_commission)}</td>
                        <td className="text-success fw-bold">₹ {fmtMoney(item.grand_total)}</td>
                        <td>
                          {item.isCompany
                            ? "—"
                            : `${commissionProgress.paidEmisCount} / ${commissionProgress.totalEmisCount}`}
                        </td>
                        <td className="fw-bold">
                          {item.isCompany ? (
                            "—"
                          ) : (
                            <>
                              ₹ {fmtMoney(creditedSoFar)} <span className="text-muted fw-normal">of ₹{fmtMoney(item.grand_total)}</span>
                              <div className="text-muted fw-normal fs-12">
                                ({item.grand_total > 0 ? Math.round(((creditedSoFar || 0) / item.grand_total) * 1000) / 10 : 0}% received)
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {commissionPreview.rows.length > 0 && (
                    <tr className="border-top fw-bold table-light">
                      <td colSpan={5}>Total (should match Grand Total Commission above)</td>
                      <td>
                        ₹ {fmtMoney(commissionPreview.rows.reduce((s, r) => s + (r.deposit_commission || 0), 0))}
                      </td>
                      <td>
                        ₹ {fmtMoney(commissionPreview.rows.reduce((s, r) => s + (r.registry_commission || 0), 0))}
                      </td>
                      <td>
                        ₹ {fmtMoney(commissionPreview.rows.reduce((s, r) => s + (r.total_commission || 0), 0))}
                      </td>
                      <td className="text-success">
                        ₹ {fmtMoney(commissionPreview.rows.reduce((s, r) => s + (r.grand_total || 0), 0))}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="col-xl-3 d-print-none">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h4 className="card-title mb-0">Booking Meta</h4>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <label className="text-muted small">Created By</label>
              <p className="mb-0 fw-semibold">{booking.createdBy?.name || "System"}</p>
            </div>
            <div className="mb-3">
              <label className="text-muted small">Created At</label>
              <p className="mb-0 fw-semibold">{fmtDateTime(booking.createdAt)}</p>
            </div>
            <div className="mb-3">
              <label className="text-muted small">Payment Mode</label>
              <p className="mb-0 fw-semibold">
                {
                  {
                    cash: "Cash",
                    upi: "UPI",
                    net_banking: "Net Banking",
                    bank_transfer: "Bank Transfer",
                    cheque: "Cheque",
                    card: "Card",
                  }[booking.paymentMode] || booking.paymentMode
                }
              </p>
            </div>
            {booking.notes && (
              <div className="mb-0">
                <label className="text-muted small">Notes</label>
                <p className="mb-0 small bg-light p-2 rounded">{booking.notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingDetail;