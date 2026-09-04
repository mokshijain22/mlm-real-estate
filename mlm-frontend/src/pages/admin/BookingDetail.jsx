import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import api from "../../api/axios.js";
import { getStoredUser } from "../../utils/userHelpers.js";
import { today, toLocalDateStr } from "../../utils/dateHelpers.js";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(d) {
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtMoney(n) {
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function emiStepLabel(emiNumber) {
  if (emiNumber === -1) return "Down Payment";
  if (emiNumber < -1) return `Down Payment ${Math.abs(emiNumber)}`;
  if (emiNumber === 0) return "Booking amount (token)";
  if (emiNumber === 99) return "Registry";
  return `EMI ${emiNumber}`;
}

function numberToWordsIndian(num) {
  num = Math.round(Number(num) || 0);
  if (num === 0) return "Zero Rupees Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const twoDigits = (n) => (n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : ""));
  const threeDigits = (n) =>
    n >= 100 ? ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigits(n % 100) : "") : twoDigits(n);

  let n = num;
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  const parts = [];
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(threeDigits(lakh) + " Lakh");
  if (thousand) parts.push(threeDigits(thousand) + " Thousand");
  if (hundred) parts.push(threeDigits(hundred));

  return parts.join(" ") + " Rupees Only";
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
  const [paidDate, setPaidDate] = useState(today());
  const [paymentMode, setPaymentMode] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [amountReceived, setAmountReceived] = useState("");
  const [payBankId, setPayBankId] = useState("");
  const [payBanks, setPayBanks] = useState([]);
  const [payError, setPayError] = useState("");

  const [siteSettings, setSiteSettings] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState("");
  const [editingEmiId, setEditingEmiId] = useState(null);
  const [emiEditForm, setEmiEditForm] = useState({ dueDate: "", amount: "" });
  const [emiEditError, setEmiEditError] = useState("");
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [printMode, setPrintMode] = useState("receipt"); // "receipt" | "statement"

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

  const startEdit = () => {
    setEditForm({
      paymentMode: booking.paymentMode || "cash",
      transactionId: booking.transactionId || "",
      chequeNumber: booking.chequeNumber || "",
      chequeBankName: booking.chequeBankName || "",
      collectedBy: booking.collectedBy || "",
      proposerName: booking.proposerName || "",
    });
    setEditError("");
    setEditMode(true);
  };

  const saveEdit = async () => {
    setActionLoading(true);
    setEditError("");
    try {
      await api.put(`/admin/bookings/${id}`, editForm);
      setEditMode(false);
      load();
    } catch (err) {
      setEditError(err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const startEmiEdit = (emi) => {
    setEditingEmiId(emi._id);
    setEmiEditForm({ dueDate: toLocalDateStr(new Date(emi.dueDate)), amount: emi.amount });
    setEmiEditError("");
  };

  const saveEmiEdit = async (emiId) => {
    setActionLoading(true);
    setEmiEditError("");
    try {
      const res = await api.put(`/admin/emis/${emiId}`, emiEditForm);
      setEditingEmiId(null);
      if (res.data?.pendingApproval) {
        setEmiEditError(""); // not an error — just informational, shown via the pending badge after reload
      }
      load();
    } catch (err) {
      setEmiEditError(err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const currentRole = getStoredUser()?.role;
  const isSuperAdminUser = currentRole === "super_admin";
  const [editApprovalActionId, setEditApprovalActionId] = useState(null);
  const [editApprovalError, setEditApprovalError] = useState("");

  const approveEmiEdit = async (emiId) => {
    setEditApprovalActionId(emiId);
    setEditApprovalError("");
    try {
      await api.post(`/admin/emis/${emiId}/approve-edit`);
      load();
    } catch (err) {
      setEditApprovalError(err.response?.data?.message || err.message);
    } finally {
      setEditApprovalActionId(null);
    }
  };

  const rejectEmiEdit = async (emiId) => {
    const reason = window.prompt("Reason for rejecting this edit (optional):") || "";
    setEditApprovalActionId(emiId);
    setEditApprovalError("");
    try {
      await api.post(`/admin/emis/${emiId}/reject-edit`, { rejection_reason: reason });
      load();
    } catch (err) {
      setEditApprovalError(err.response?.data?.message || err.message);
    } finally {
      setEditApprovalActionId(null);
    }
  };

  const [showAddDp, setShowAddDp] = useState(false);
  const [addDpForm, setAddDpForm] = useState({ amount: "", due_date: today(), remarks: "" });
  const [addDpError, setAddDpError] = useState("");

  const openAddDp = () => {
    setAddDpForm({ amount: "", due_date: today(), remarks: "" });
    setAddDpError("");
    setShowAddDp(true);
  };

  const saveAddDp = async () => {
    setActionLoading(true);
    setAddDpError("");
    try {
      await api.post(`/admin/bookings/${id}/dp-installments`, addDpForm);
      setShowAddDp(false);
      load();
    } catch (err) {
      setAddDpError(err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    load();
    api
      .get("/admin/settings")
      .then((res) => setSiteSettings(res.data.settings || {}))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!booking?.project?._id) return;
    api
      .get(`/admin/projects/${booking.project._id}/banks`)
      .then((res) => setPayBanks((res.data.data || []).filter((b) => b.isActive !== false)))
      .catch(() => setPayBanks([]));
  }, [booking?.project?._id]);

  // Every payment already received — booking token/deposit + each paid EMI —
  // shown as its own printable receipt, newest first.
  const buildReceipts = () => {
    if (!booking) return [];
    const list = [];
    if (booking.approvalStatus === "approved" && booking.bookingAmount) {
      list.push({
        receiptNo: `${booking.bookingNumber}-BK`,
        stepLabel: "Booking amount (token)",
        date: booking.bookingDate,
        amount: booking.bookingAmount,
        mode: booking.paymentMode,
        reference: "-",
      });
    }
    emis
      .filter((e) => e.status === "paid")
      .forEach((e) => {
        list.push({
          receiptNo: `${booking.bookingNumber}-${e.emiNumber}`,
          stepLabel: emiStepLabel(e.emiNumber),
          date: e.paidDate,
          amount: e.amount,
          mode: e.paymentMode,
          reference: e.paymentReference || "-",
        });
      });
    return list.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const openPrintModal = () => setPrintModalOpen(true);

  const printReceipt = (receipt) => {
    setSelectedReceipt(receipt);
    setPrintMode("receipt");
    setPrintModalOpen(false);
    setTimeout(() => window.print(), 150);
  };

  const printFullStatement = () => {
    setPrintMode("statement");
    setTimeout(() => window.print(), 150);
  };

  useEffect(() => {
    if (booking && searchParams.get("print") === "1") {
      const receipts = buildReceipts();
      if (receipts.length) printReceipt(receipts[receipts.length - 1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        amount_received: amountReceived,
        bank_id: paymentMode !== "cash" ? payBankId : undefined,
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
          html, body, #root {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          * {
            overflow: visible !important;
            max-height: none !important;
          }
          .wrapper, .content-page, .content, .main-content,
          .simplebar-wrapper, .simplebar-mask, .simplebar-offset,
          .simplebar-content-wrapper, .simplebar-content {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            transform: none !important;
            position: static !important;
          }
          .simplebar-placeholder {
            display: none !important;
          }
          .page-content {
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            height: auto !important;
          }
          .container-fluid {
            padding: 0 !important;
            max-width: 100% !important;
            overflow: visible !important;
          }
          .row {
            display: block !important;
          }
          .card {
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
            height: auto !important;
          }
          .card-body {
            overflow: visible !important;
            height: auto !important;
          }
          .col-xl-9 {
            width: 100% !important;
            max-width: 100% !important;
            flex: 0 0 100% !important;
          }
          table {
            page-break-inside: auto !important;
          }
          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          .table-responsive {
            overflow: visible !important;
          }
          .receipt-print {
            display: block !important;
            max-width: 480px;
            margin: 0 auto;
            border: 1px solid #e8c9a0;
            background: #fdf3e7;
            font-family: Georgia, 'Times New Roman', serif;
            color: #4a2c1a;
            height: auto !important;
            overflow: visible !important;
            page-break-inside: avoid;
          }
          .receipt-banner {
            position: relative;
            height: 90px;
            background: linear-gradient(115deg, #5c1010 0%, #7a1414 35%, #c9932f 65%, #f0cd7a 100%);
            clip-path: polygon(0 0, 100% 0, 100% 55%, 0 100%);
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 14px;
          }
          .receipt-banner-title {
            color: #ffffff;
            font-size: 20px;
            font-weight: bold;
            text-shadow: 0 1px 2px rgba(0,0,0,0.4);
          }
          .receipt-body {
            padding: 18px 24px 24px;
          }
          .receipt-row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 14px;
          }
          .receipt-box {
            flex: 1;
            border: 1px solid #d9a86a;
            border-radius: 4px;
            padding: 4px 10px;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
          }
          .receipt-fields {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
          }
          .receipt-fields td, .receipt-fields th {
            border: 1px solid #d9a86a;
            padding: 5px 8px;
            font-size: 12px;
          }
          .receipt-fields-3col th {
            background: #f6e3c8;
            font-weight: bold;
            text-align: left;
          }
          .receipt-label {
            color: #8a5a2a;
            font-weight: bold;
          }
          .receipt-line {
            font-size: 12px;
            margin: 6px 0;
            display: flex;
            align-items: baseline;
          }
          .receipt-dots {
            flex: 1;
            border-bottom: 1px dotted #b9895a;
            margin: 0 6px;
            height: 1px;
          }
          .receipt-line-italic {
            font-style: italic;
            color: #6b6b6b;
          }
          .receipt-company-footer {
            margin-top: 24px;
            padding-top: 10px;
            border-top: 1px solid #d9a86a;
            text-align: center;
            font-size: 10px;
            color: #8a5a2a;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }
          .receipt-payment-title {
            color: #7a1414;
            font-weight: bold;
            text-decoration: underline;
            margin: 14px 0 8px;
            font-size: 13px;
          }
          .receipt-amount-box {
            border: 1px solid #d9a86a;
            border-radius: 6px;
            padding: 10px 14px;
            font-size: 18px;
            font-weight: bold;
            width: 160px;
            margin-top: 10px;
          }
          .receipt-footer {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 40px;
            font-size: 11px;
            color: #8a5a2a;
          }
          .receipt-signatory {
            border-top: 1px solid #8a5a2a;
            padding-top: 4px;
            white-space: nowrap;
          }
        }
      `}</style>
      <div className="col-xl-9">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white d-flex justify-content-between align-items-center flex-wrap gap-2 py-3 d-print-none">
            <h4 className="card-title mb-0">Booking Details: {booking.bookingNumber}</h4>
            <div className="d-flex flex-wrap gap-2">
              {booking.status === "active" && (
                <button className="btn btn-soft-danger btn-sm" onClick={handleCancel} disabled={actionLoading}>
                  Cancel Booking
                </button>
              )}
              <Link to="/admin/bookings" className="btn btn-light btn-sm">
                Back to List
              </Link>
              {!editMode && (
                <button className="btn btn-outline-secondary btn-sm" onClick={startEdit}>
                  <iconify-icon icon="solar:pen-bold" className="align-middle me-1"></iconify-icon>
                  Edit
                </button>
              )}
              <button className="btn btn-outline-primary btn-sm" onClick={printFullStatement}>
                <iconify-icon icon="solar:document-text-bold" className="align-middle me-1"></iconify-icon>
                Print Full Statement
              </button>
              <button className="btn btn-primary btn-sm" onClick={openPrintModal}>
                <iconify-icon icon="solar:printer-bold" className="align-middle me-1"></iconify-icon>
                Print Receipt
              </button>
            </div>
          </div>
          {printModalOpen && (
            <div
              className="d-print-none"
              style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1050,
              }}
              onClick={() => setPrintModalOpen(false)}
            >
              <div
                className="bg-white rounded shadow-lg p-4"
                style={{ width: "480px", maxWidth: "92vw", maxHeight: "80vh", overflowY: "auto" }}
                onClick={(e) => e.stopPropagation()}
              >
                <h4 className="text-center mb-4">Select Receipt to Print</h4>
                {buildReceipts().length === 0 ? (
                  <p className="text-muted text-center">No payments received yet for this booking.</p>
                ) : (
                  buildReceipts().map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      className="btn btn-light w-100 d-flex justify-content-between align-items-center mb-2 text-start"
                      onClick={() => printReceipt(r)}
                    >
                      <span>
                        <span className="fw-bold d-block">{r.stepLabel}</span>
                        <span className="text-muted small">Date: {fmtDate(r.date)}</span>
                      </span>
                      <span className="fw-bold">₹ {fmtMoney(r.amount)}</span>
                    </button>
                  ))
                )}
                <button className="btn btn-secondary w-100 mt-2" onClick={() => setPrintModalOpen(false)}>
                  Close
                </button>
              </div>
            </div>
          )}

          {selectedReceipt && printMode === "receipt" && (
            <div className="d-none d-print-block receipt-print">
              <div className="receipt-banner">
                <div className="receipt-banner-title">Payment Receipt</div>
              </div>
              <div className="receipt-body">
                <div className="receipt-row">
                  <div className="receipt-box">
                    <span className="receipt-label">Receipt No.</span>
                    <span className="receipt-value">{selectedReceipt.receiptNo}</span>
                  </div>
                  <div className="receipt-box">
                    <span className="receipt-label">Date -</span>
                    <span className="receipt-value">{fmtDate(selectedReceipt.date)}</span>
                  </div>
                </div>

                <table className="receipt-fields">
                  <tbody>
                    <tr>
                      <td className="receipt-label" style={{ width: "110px" }}>Name</td>
                      <td className="receipt-value">{booking.customer?.name}</td>
                    </tr>
                    <tr>
                      <td className="receipt-label">Address</td>
                      <td className="receipt-value">{booking.customer?.address || "-"}</td>
                    </tr>
                    <tr>
                      <td className="receipt-label">Contact No.</td>
                      <td className="receipt-value">{booking.customer?.phone || "-"}</td>
                    </tr>
                    <tr>
                      <td className="receipt-label">Installment Step</td>
                      <td className="receipt-value">{selectedReceipt.stepLabel}</td>
                    </tr>
                  </tbody>
                </table>

                <table className="receipt-fields receipt-fields-3col">
                  <thead>
                    <tr>
                      <th>Plot No.</th>
                      <th>Area</th>
                      <th>Rate Per Sq. Ft.</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{booking.plot?.plotNumber}</td>
                      <td>{fmtMoney(booking.totalArea)} sqft</td>
                      <td>Rs. {fmtMoney(booking.pricePerSqft)}</td>
                    </tr>
                  </tbody>
                </table>

                <p className="receipt-line">
                  Total Amount<span className="receipt-dots"></span> Rs. {fmtMoney(booking.totalAmount)}
                </p>
                <p className="receipt-line receipt-line-italic">
                  Amount in Words<span className="receipt-dots"></span> {numberToWordsIndian(booking.totalAmount)}
                </p>
                <p className="receipt-line">
                  Sum of Received Amount<span className="receipt-dots"></span> Rs. {fmtMoney(selectedReceipt.amount)}
                </p>
                <p className="receipt-line receipt-line-italic">
                  Sum in Words<span className="receipt-dots"></span> {numberToWordsIndian(selectedReceipt.amount)}
                </p>
                <p className="receipt-line">
                  PLC Charges<span className="receipt-dots"></span>
                </p>

                <div className="receipt-payment-title">Payment Details</div>
                <table className="receipt-fields">
                  <tbody>
                    <tr>
                      <td className="receipt-label" style={{ width: "140px" }}>Mode of Payment</td>
                      <td className="receipt-value text-capitalize">
                        {{ cash: "Cash", bank: "Bank Transfer", cheque: "Cheque" }[selectedReceipt.mode] || selectedReceipt.mode}
                      </td>
                    </tr>
                    {selectedReceipt.reference !== "-" && (
                      <tr>
                        <td className="receipt-label">Reference</td>
                        <td className="receipt-value">{selectedReceipt.reference}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="receipt-amount-box">Rs. {fmtMoney(selectedReceipt.amount)}</div>

                <div className="receipt-footer">
                  <span>Thank You For Your Payment ...!<br />Condition Apply****</span>
                  <span className="receipt-signatory">Authorized Signatory</span>
                </div>

                
              </div>
            </div>
          )}
          <div className={`card-body ${printMode === "statement" ? "" : "d-print-none"}`}>
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
                <p className="text-muted mb-1 small">PLC</p>
                <h4 className="mb-0 text-break">
                  {Number(booking.plcAmount) > 0 ? (
                    <>
                      {booking.plcPercent}% <span className="text-muted fs-6">(₹{fmtMoney(booking.plcAmount)})</span>
                    </>
                  ) : (
                    <span className="text-muted fs-6">None</span>
                  )}
                </h4>
              </div>
              <div className="col-6 col-md-3">
                <p className="text-muted mb-1 small">Booking Deposit (Token + DP)</p>
                <h4 className="mb-0 text-break">₹ {fmtMoney((booking.bookingAmount || 0) + (booking.downPaymentAmount || 0))}</h4>
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

            {editMode && (
              <div className="card border-0 shadow-sm mb-4 border-primary d-print-none">
                <div className="card-body">
                  <h6 className="mb-3">Edit Booking Details</h6>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Payment Mode</label>
                      <select className="form-select" value={editForm.paymentMode} onChange={(e) => setEditForm({ ...editForm, paymentMode: e.target.value })}>
                        <option value="cash">Cash</option>
                        <option value="upi">UPI</option>
                        <option value="net_banking">Net Banking</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="cheque">Cheque</option>
                        <option value="card">Card</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Transaction ID</label>
                      <input className="form-control" value={editForm.transactionId} onChange={(e) => setEditForm({ ...editForm, transactionId: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Collected By</label>
                      <input className="form-control" value={editForm.collectedBy} onChange={(e) => setEditForm({ ...editForm, collectedBy: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Cheque Number</label>
                      <input className="form-control" value={editForm.chequeNumber} onChange={(e) => setEditForm({ ...editForm, chequeNumber: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Cheque Bank Name</label>
                      <input className="form-control" value={editForm.chequeBankName} onChange={(e) => setEditForm({ ...editForm, chequeBankName: e.target.value })} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Proposer Name</label>
                      <input className="form-control" value={editForm.proposerName} onChange={(e) => setEditForm({ ...editForm, proposerName: e.target.value })} />
                    </div>
                  </div>
                  {editError && <div className="text-danger small mt-2">{editError}</div>}
                  <div className="mt-3 d-flex gap-2">
                    <button className="btn btn-primary" disabled={actionLoading} onClick={saveEdit}>
                      {actionLoading ? "Saving..." : "Save Changes"}
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => setEditMode(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* EMI schedule */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="text-primary mb-0">Installment Schedule (EMIs)</h5>
              {booking.status === "active" && (
                <button className="btn btn-sm btn-outline-primary d-print-none" onClick={openAddDp}>
                  + Add DP Installment
                </button>
              )}
            </div>

            {showAddDp && (
              <div className="card border mb-3 d-print-none">
                <div className="card-body">
                  <h6 className="mb-3">Add New Down Payment Installment</h6>
                  <p className="text-muted small mb-3">
                    Use this when the customer pays a new part of the 30% DP that wasn't already on the schedule — it will appear in the EMI list immediately and count toward commission and the grand total. The amount you enter here will automatically be subtracted from the remaining DP balance shown below.
                  </p>
                  <p className="text-muted small mb-3">
                    Remaining DP balance: ₹{" "}
                    {fmtMoney(
                      emis
                        .filter((e) => e.emiNumber < 0 && e.status === "pending")
                        .reduce((sum, e) => sum + (e.amount || 0), 0)
                    )}
                  </p>
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label">Amount</label>
                      <input
                        type="number"
                        className="form-control"
                        value={addDpForm.amount}
                        onChange={(e) => setAddDpForm({ ...addDpForm, amount: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Date Received</label>
                      <input
                        type="date"
                        className="form-control"
                        value={addDpForm.due_date}
                        onChange={(e) => setAddDpForm({ ...addDpForm, due_date: e.target.value })}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Remarks (optional)</label>
                      <input
                        className="form-control"
                        value={addDpForm.remarks}
                        onChange={(e) => setAddDpForm({ ...addDpForm, remarks: e.target.value })}
                      />
                    </div>
                  </div>
                  {addDpError && <div className="text-danger small mt-2">{addDpError}</div>}
                  <div className="mt-3 d-flex gap-2">
                    <button className="btn btn-primary" disabled={actionLoading} onClick={saveAddDp}>
                      {actionLoading ? "Saving..." : "Add Installment"}
                    </button>
                    <button className="btn btn-outline-secondary" onClick={() => setShowAddDp(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                          : emi.emiNumber < -1
                          ? `Down Payment ${Math.abs(emi.emiNumber)}`
                          : emi.emiNumber === 0
                          ? "Booking Token"
                          : emi.emiNumber === 99
                          ? "Registry"
                          : `EMI ${emi.emiNumber}`}
                      </td>
                      <td>
                        {editingEmiId === emi._id ? (
                          <input type="date" className="form-control form-control-sm" value={emiEditForm.dueDate} onChange={(e) => setEmiEditForm({ ...emiEditForm, dueDate: e.target.value })} />
                        ) : (
                          fmtDate(emi.dueDate)
                        )}
                      </td>
                                    <td>
                        {editingEmiId === emi._id ? (
                          <input type="number" className="form-control form-control-sm" value={emiEditForm.amount} onChange={(e) => setEmiEditForm({ ...emiEditForm, amount: e.target.value })} />
                        ) : emi.status === "paid" && emi.amountReceived != null ? (
                          <>
                            ₹ {fmtMoney(emi.amountReceived)}
                            {emi.amountReceived !== emi.amount && (
                              <div className="small text-muted text-decoration-line-through">₹ {fmtMoney(emi.amount)}</div>
                            )}
                          </>
                        ) : (
                          <>₹ {fmtMoney(emi.amount)}</>
                        )}
                      </td>
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
                        {emi.editRequest?.status === "pending" && (
                          <div className="mt-1">
                            <span className="badge bg-info-subtle text-info d-block">
                              Edit pending approval: ₹{fmtMoney(emi.editRequest.proposedAmount)} on{" "}
                              {emi.editRequest.proposedDueDate ? fmtDate(emi.editRequest.proposedDueDate) : "-"}
                            </span>
                          </div>
                        )}
                      </td>
                      <td>{emi.paidDate ? fmtDate(emi.paidDate) : "-"}</td>
                      <td>{emi.paymentReference || "-"}</td>
                      <td className="d-print-none">
                        {emi.editRequest?.status === "pending" && isSuperAdminUser && (
                          <div className="d-flex gap-1 mb-1">
                            <button
                              className="btn btn-success btn-sm"
                              disabled={editApprovalActionId === emi._id}
                              onClick={() => approveEmiEdit(emi._id)}
                            >
                              {editApprovalActionId === emi._id ? "..." : "Approve Edit"}
                            </button>
                            <button
                              className="btn btn-outline-danger btn-sm"
                              disabled={editApprovalActionId === emi._id}
                              onClick={() => rejectEmiEdit(emi._id)}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {emi.editRequest?.status === "pending" && !isSuperAdminUser && (
                          <div className="text-muted small mb-1">Awaiting Super Admin approval</div>
                        )}
                        {editApprovalError && <div className="text-danger small mb-1">{editApprovalError}</div>}
                        {emi.status !== "paid" && emi.status !== "cancelled" && booking.status === "active" && (
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setPayingEmiId(emi._id);
                                setPaymentMode("cash");
                                setPaymentReference("");
                                setPayError("");
                                setPaidDate(today());
                                setAmountReceived(String(emi.amount));
                                setPayBankId("");
                              }}
                            >
                              Pay
                            </button>
                            {editingEmiId === emi._id ? (
                              <>
                                <button className="btn btn-success btn-sm" disabled={actionLoading} onClick={() => saveEmiEdit(emi._id)}>
                                  Save
                                </button>
                                <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditingEmiId(null)}>
                                  X
                                </button>
                              </>
                            ) : emi.editRequest?.status === "pending" ? null : (
                              <button className="btn btn-outline-secondary btn-sm" onClick={() => startEmiEdit(emi)}>
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                        {emiEditError && editingEmiId === emi._id && <div className="text-danger small mt-1">{emiEditError}</div>}
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
                          : n < -1
                          ? `Down Payment ${Math.abs(n)}`
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
                      <div className="col-md-3">
                        <label className="form-label">Payment Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={paidDate}
                          onChange={(e) => setPaidDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="col-md-3">
                        <label className="form-label">Payment Mode</label>
                        <select
                          className="form-select"
                          value={paymentMode}
                          onChange={(e) => {
                            setPaymentMode(e.target.value);
                            if (e.target.value === "cash") setPayBankId("");
                          }}
                          required
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="net_banking">Net Banking</option>
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="cheque">Cheque</option>
                          <option value="card">Card</option>
                        </select>
                      </div>
                      {paymentMode !== "cash" && (
                        <div className="col-md-3">
                          <label className="form-label">
                            Receiving Bank <span className="text-danger">*</span>
                          </label>
                          <select className="form-select" value={payBankId} onChange={(e) => setPayBankId(e.target.value)} required>
                            <option value="">Select bank</option>
                            {payBanks.map((b) => (
                              <option key={b._id} value={b._id}>
                                {b.name}{b.accountHolderName ? ` — ${b.accountHolderName}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="col-md-3">
                        <label className="form-label">Amount Received</label>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          value={amountReceived}
                          onChange={(e) => setAmountReceived(e.target.value)}
                          required
                        />
                        {(() => {
                          const scheduled = Number(emis.find((e) => e._id === payingEmiId)?.amount || 0);
                          const diff = Number(amountReceived || 0) - scheduled;
                          if (!amountReceived || diff === 0) return null;
                          return (
                            <div className={`small mt-1 ${diff > 0 ? "text-success" : "text-danger"}`}>
                              {diff > 0
                                ? `Overpaid by ₹${fmtMoney(diff)} — Registry amount will reduce by ₹${fmtMoney(diff)}`
                                : `Short by ₹${fmtMoney(Math.abs(diff))} — Registry amount will increase by ₹${fmtMoney(Math.abs(diff))}`}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="col-md-3">
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