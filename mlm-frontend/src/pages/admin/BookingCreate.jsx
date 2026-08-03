import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";

const STEPS = [
  { key: 1, label: "Customer & property" },
  { key: 2, label: "Payment & documents" },
  { key: 3, label: "Commission" },
];

function money(n) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function BookingCreate() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Reference data
  const [projects, setProjects] = useState([]);
  const [agents, setAgents] = useState([]);

  // Step 1 — customer mode
  const [customerMode] = useState("walk-in"); // "from-lead" disabled until Lead Engine exists

  // Step 1 — walk-in customer fields
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  // Step 1 — property
  const [projectId, setProjectId] = useState("");
  const [plots, setPlots] = useState([]);
  const [plotsLoading, setPlotsLoading] = useState(false);
  const [plotId, setPlotId] = useState("");
  const [selectedPlot, setSelectedPlot] = useState(null);

  // Step 1 — executive (mandatory)
  const [agentId, setAgentId] = useState("");

  const [step1Errors, setStep1Errors] = useState({});

  // Step 2 — payment plan
  const [paymentPlan, setPaymentPlan] = useState("standard");
  const [scheduleRule, setScheduleRule] = useState("standard");
  const emiMonths = 6; // fixed by the Standard plan (20% deposit · 6 × 10% EMI)

  // Step 2 — payment
  const [banks, setBanks] = useState([]);
  const [bookingAmount, setBookingAmount] = useState("");
  const [scheduleDates, setScheduleDates] = useState([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [bankId, setBankId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [amountInWords, setAmountInWords] = useState("");
  const [collectedBy, setCollectedBy] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null")?.name || "";
    } catch {
      return "";
    }
  });
  const [remarks, setRemarks] = useState("");
  const [tokenCollected, setTokenCollected] = useState(true);
  const [step2Errors, setStep2Errors] = useState({});

  // Documents — each holds the uploaded relative path once selected
  const [documents, setDocuments] = useState({
    id_proof: "",
    pan_card: "",
    noc_certificate: "",
    agreement_copy: "",
    site_plan: "",
  });
  const [uploadingDoc, setUploadingDoc] = useState(null);

  async function handleDocUpload(key, file) {
    if (!file) return;
    setUploadingDoc(key);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/admin/bookings/upload-document", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocuments((d) => ({ ...d, [key]: res.data.path }));
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setUploadingDoc(null);
    }
  }

  // Step 3 — commission
  const [commissionCap, setCommissionCap] = useState(0);
  const [execGaveDiscount, setExecGaveDiscount] = useState(false);
  const [commissionPreview, setCommissionPreview] = useState([]);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionError, setCommissionError] = useState(null);
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createdBookingId, setCreatedBookingId] = useState(null);

  useEffect(() => {
    api
      .get("/admin/bookings/create")
      .then((res) => {
        setProjects(res.data.projects || []);
        setAgents(res.data.agents || []);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!projectId) {
      setPlots([]);
      setPlotId("");
      setSelectedPlot(null);
      return;
    }
    setPlotsLoading(true);
    setPlotId("");
    setSelectedPlot(null);
    api
      .get(`/admin/projects/${projectId}/plots/available`)
      .then((res) => setPlots(res.data.data || res.data || []))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setPlotsLoading(false));
  }, [projectId]);

  useEffect(() => {
    const plot = plots.find((p) => p._id === plotId) || null;
    setSelectedPlot(plot);
  }, [plotId, plots]);

  useEffect(() => {
    api
      .get("/admin/banks")
      .then((res) => setBanks((res.data.data || []).filter((b) => b.isActive !== false)))
      .catch(() => {});
  }, []);

  // ---- derived values (declared once, used everywhere below) ----
  const sellingPrice = selectedPlot
    ? Number(selectedPlot.totalArea || 0) * Number(selectedPlot.pricePerSqft || 0) + Number(selectedPlot.plcAmount || 0)
    : 0;

  function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }

  function buildStandardSchedule(total, token, date) {
    const dp1Nominal = total * 0.15;
    const dp2 = Math.round(total * 0.05);
    const emi = Math.round(total * 0.1);
    const registry = Math.round(total - token - Math.max(dp1Nominal - token, 0) - dp2 - emi * 6);
    const dp1 = Math.round(Math.max(dp1Nominal - token, 0));

    const rows = [
      { key: "token", label: "Booking amount (token)", amount: token, date },
      { key: "dp1", label: "Down payment 1", amount: dp1, date },
      { key: "dp2", label: "Down payment 2", amount: dp2, date: addMonths(date, 1) },
    ];
    for (let i = 1; i <= 6; i++) {
      rows.push({ key: `emi${i}`, label: `EMI ${i}`, amount: emi, date: addMonths(date, i + 1) });
    }
    rows.push({ key: "registry", label: "Registry", amount: registry, date: addMonths(date, 8) });
    return rows;
  }

  useEffect(() => {
    if (!sellingPrice) {
      setScheduleDates([]);
      return;
    }
    setScheduleDates(buildStandardSchedule(sellingPrice, Number(bookingAmount) || 0, bookingDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellingPrice, bookingAmount, bookingDate, paymentPlan]);

  function updateScheduleRow(key, field, value) {
    setScheduleDates((rows) =>
      rows.map((r) => (r.key === key ? { ...r, [field]: field === "amount" ? Number(value) || 0 : value } : r))
    );
  }

  const downPaymentAmount = scheduleDates.find((r) => r.key === "dp1")?.amount || 0;
  const downPayment2Amount = scheduleDates.find((r) => r.key === "dp2")?.amount || 0;
  const registryAmount = scheduleDates.find((r) => r.key === "registry")?.amount || 0;
  const emiAmount = scheduleDates.find((r) => r.key === "emi1")?.amount || 0;
  const remainingAmount = Math.max(
    sellingPrice - (Number(bookingAmount) || 0) - downPaymentAmount - downPayment2Amount - registryAmount,
    0
  );
  const scheduleRows = scheduleDates;

  useEffect(() => {
    if (step !== 3 || !agentId || !emiMonths) return;
    setCommissionLoading(true);
    setCommissionError(null);
    api
      .post("/admin/bookings/commission-preview", {
        agent_id: agentId || undefined,
        price_per_sqft: selectedPlot?.pricePerSqft || 0,
        emi_amount: emiAmount,
        emi_months: emiMonths,
        payment_mode: paymentMode,
      })
      .then((res) => setCommissionPreview(res.data.preview || []))
      .catch((err) => setCommissionError(err.response?.data?.message || err.message))
      .finally(() => setCommissionLoading(false));
  }, [step]);

  const totalCommission = commissionPreview.reduce((sum, row) => sum + row.total_commission, 0);
  const totalSqft = Number(selectedPlot?.totalArea) || 0;
  const commissionPerSqft = totalSqft > 0 ? totalCommission / totalSqft : 0;

  // ---- validation ----
  function validateStep1() {
    const errs = {};
    if (!name.trim()) errs.name = "Full name is required.";
    if (!email.trim() && !phone.trim()) errs.contact = "Email or phone is required.";
    if (!projectId) errs.projectId = "Project is required.";
    if (!plotId) errs.plotId = "Plot is required.";
    // executive is optional — a booking can go direct with no assigned executive
    setStep1Errors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2() {
    const errs = {};
    if (bookingAmount === "" || Number(bookingAmount) < 0) errs.bookingAmount = "Enter a valid booking amount.";
    if (!paymentMode) errs.paymentMode = "Payment mode is required.";
    if (paymentMode !== "cash" && !bankId) errs.bankId = "Select which bank received this payment.";
    if (tokenCollected && !receiptId.trim()) errs.receiptId = "Receipt number is required.";
    setStep2Errors(errs);
    return Object.keys(errs).length === 0;
  }

  function generatePaymentReference() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `TXN-${today}-${rand}`;
  }

  function handleContinue() {
    if (!validateStep1()) return;
    if (!paymentReference) setPaymentReference(generatePaymentReference());
    setStep(2);
  }

  async function handleCreateBooking() {
    if (!confirmAccurate) return;
    setCreating(true);
    setCreateError(null);
    try {
      const customerRes = await api.post("/admin/customers", {
        name,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        status: "active",
      });
      const customerId = customerRes.data.data?._id || customerRes.data._id;

      const payload = {
        customer_id: customerId,
        plot_id: plotId,
        agent_id: agentId || undefined,
        price_per_sqft: selectedPlot?.pricePerSqft || 0,
        booking_amount: Number(bookingAmount) || 0,
        down_payment_amount: downPaymentAmount,
        down_payment_due_date: scheduleDates.find((r) => r.key === "dp1")?.date,
        down_payment2_amount: downPayment2Amount,
        down_payment2_due_date: scheduleDates.find((r) => r.key === "dp2")?.date,
        registry_amount: registryAmount,
        registry_due_date: scheduleDates.find((r) => r.key === "registry")?.date,
        emi_due_dates: scheduleDates.filter((r) => r.key.startsWith("emi")).map((r) => r.date),
        emi_months: emiMonths,
        payment_plan_key: paymentPlan,
        payment_mode: paymentMode,
        bank_id: bankId || undefined,
        payment_reference: paymentReference || undefined,
        receipt_id: receiptId || undefined,
        amount_in_words: amountInWords || undefined,
        collected_by: collectedBy || undefined,
        remarks: remarks || undefined,
        token_collected: tokenCollected,
        notes: remarks || undefined,
        documents,
        commission_cap_per_sqft: commissionCap || undefined,
        executive_gave_discount: execGaveDiscount,
      };

      const res = await api.post("/admin/bookings", payload);
      setCreating(false);
      setCreatedBookingId(res.data.data._id);
    } catch (err) {
      setCreateError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[Object.keys(err.response?.data?.errors || {})[0]] ||
          err.message
      );
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <h4 className="card-title mb-0">Create booking</h4>
        <Link to="/admin/bookings" className="btn btn-light btn-sm">
          <iconify-icon icon="solar:arrow-left-linear" className="align-middle me-1"></iconify-icon>
          Back to bookings
        </Link>
      </div>

      <div className="card-body border-bottom pb-3">
        <ul className="nav nav-pills gap-2">
          {STEPS.map((s) => (
            <li key={s.key} className="nav-item">
              <span
                className={`nav-link ${step === s.key ? "active" : ""} ${step > s.key ? "text-success" : ""}`}
                style={{ cursor: "default" }}
              >
                {s.key}. {s.label}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="card-body pb-0">
          <div className="alert alert-danger mb-0">{error}</div>
        </div>
      )}

      {step === 1 && (
        <div className="card-body">
          <ul className="nav nav-pills mb-4 gap-2">
            <li className="nav-item">
              <button type="button" className={`nav-link ${customerMode === "walk-in" ? "active" : ""}`}>
                Walk-in customer
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className="nav-link disabled text-muted"
                title="Lead Engine module not set up yet"
                disabled
              >
                From lead
              </button>
            </li>
          </ul>

          <p className="text-muted small mb-4">
            Enter customer details, then select project and an available plot. Payment and documents are on the
            next page.
          </p>

          <div className="row g-3 mb-4">
            <div className="col-md-4">
              <label className="form-label">Booking date</label>
              <input
                type="date"
                className="form-control"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
            </div>
          </div>

          <h6 className="text-uppercase text-muted small fw-bold mb-3 border-start border-3 border-primary ps-2">
            Customer details
          </h6>

          <div className="row g-3 mb-2">
            <div className="col-md-12">
              <label className="form-label">
                Full name <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className={`form-control ${step1Errors.name ? "is-invalid" : ""}`}
                placeholder="Customer name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              {step1Errors.name && <div className="invalid-feedback">{step1Errors.name}</div>}
            </div>
          </div>

          <div className="row g-3 mb-2">
            <div className="col-md-6">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Phone</label>
              <div className="input-group">
                <span className="input-group-text">+91</span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="10-digit mobile"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  maxLength={10}
                />
              </div>
            </div>
          </div>

          <div className="row g-3 mb-2">
            <div className="col-md-12">
              <label className="form-label">Address</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="House / Flat no., Street, City, State, PIN"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              ></textarea>
            </div>
          </div>

          {step1Errors.contact && (
            <div className="text-danger small mb-3">
              <iconify-icon icon="solar:info-circle-bold" className="align-middle me-1"></iconify-icon>
              {step1Errors.contact}
            </div>
          )}
          {!step1Errors.contact && (
            <div className="text-muted small mb-3">
              <iconify-icon icon="solar:info-circle-linear" className="align-middle me-1"></iconify-icon>
              Email or phone is required.
            </div>
          )}

          <h6 className="text-uppercase text-muted small fw-bold mb-3 mt-4 border-start border-3 border-primary ps-2">
            Property
          </h6>

          <div className="row g-3 mb-2">
            <div className="col-md-6">
              <label className="form-label">
                Project <span className="text-danger">*</span>
              </label>
              <select
                className={`form-select ${step1Errors.projectId ? "is-invalid" : ""}`}
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {step1Errors.projectId && <div className="invalid-feedback">{step1Errors.projectId}</div>}
            </div>
            <div className="col-md-6">
              <label className="form-label">
                Plot <span className="text-danger">*</span>
              </label>
              <select
                className={`form-select ${step1Errors.plotId ? "is-invalid" : ""}`}
                value={plotId}
                onChange={(e) => setPlotId(e.target.value)}
                disabled={!projectId || plotsLoading}
              >
                <option value="">{!projectId ? "Select project first" : plotsLoading ? "Loading..." : "Select plot"}</option>
                {plots.map((p) => (
                  <option key={p._id} value={p._id}>
                    Plot {p.plotNumber}
                  </option>
                ))}
              </select>
              {step1Errors.plotId && <div className="invalid-feedback">{step1Errors.plotId}</div>}
            </div>
          </div>

          {selectedPlot && (
            <div className="card bg-light border-0 mt-2 mb-3">
              <div className="card-body py-3">
                <h6 className="mb-3">Plot {selectedPlot.plotNumber}</h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Area (sqft)</label>
                    <input type="text" className="form-control" value={selectedPlot.totalArea} disabled />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Rate (₹/sqft)</label>
                    <input type="text" className="form-control" value={selectedPlot.pricePerSqft} disabled />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small text-muted">Selling price</label>
                    <input type="text" className="form-control fw-bold" value={money(sellingPrice)} disabled />
                  </div>
                </div>
                <p className="text-muted small mb-0 mt-2">
                  <iconify-icon icon="solar:info-circle-linear" className="align-middle me-1"></iconify-icon>
                  Selling price = Rate × Area{Number(selectedPlot.plcAmount) > 0 ? " + PLC" : ""}. Final price is
                  confirmed on the next step.
                </p>
              </div>
            </div>
          )}

          <h6 className="text-uppercase text-muted small fw-bold mb-3 mt-4 border-start border-3 border-primary ps-2">
            Assign to executive (optional)
          </h6>
          <div className="row g-3 mb-2">
            <div className="col-md-6">
              <select className="form-select" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                <option value="">None — direct (no executive)</option>
                {agents.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <p className="text-muted small mb-0 mt-2">
                Optional. Unassigned means a direct walk-in booking with no sales executive.
              </p>
            </div>
          </div>

          <div className="d-flex justify-content-end gap-2 mt-4 pt-3 border-top">
            <Link to="/admin/bookings" className="btn btn-light">
              Cancel
            </Link>
            <button type="button" className="btn btn-primary" onClick={handleContinue}>
              Continue to booking details
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card-body">
          <p className="text-muted mb-4">
            {name} · {projects.find((p) => p._id === projectId)?.name} · Plot{" "}
            {selectedPlot?.plotNumber} · {money(sellingPrice)}
          </p>

          <h6 className="text-uppercase text-muted small fw-bold mb-3 border-start border-3 border-primary ps-2">
            Payment information
          </h6>

          <div className="row g-3 mb-2">
            <div className="col-md-4">
              <label className="form-label">Booking token ₹</label>
              <input
                type="number"
                className={`form-control ${step2Errors.bookingAmount ? "is-invalid" : ""}`}
                value={bookingAmount}
                onChange={(e) => setBookingAmount(e.target.value)}
              />
              {step2Errors.bookingAmount && <div className="invalid-feedback">{step2Errors.bookingAmount}</div>}
              <p className="text-muted small mb-0 mt-1">
                Token {money(bookingAmount)} · Selling price {money(sellingPrice)}
              </p>
              <p className="text-success small mb-0">
                Remaining after token: {money(Math.max(sellingPrice - (Number(bookingAmount) || 0), 0))}
              </p>
            </div>
            <div className="col-md-4">
              <label className="form-label">Payment plan</label>
              <select className="form-select" value={paymentPlan} onChange={(e) => setPaymentPlan(e.target.value)}>
                <option value="standard">Standard (Default) — 20% deposit · 6 × 10% EMI</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Schedule rule</label>
              <select className="form-select" value={scheduleRule} onChange={(e) => setScheduleRule(e.target.value)}>
                <option value="standard">Standard — fixed monthly schedule from booking month</option>
              </select>
            </div>
          </div>
          <p className="text-muted small mb-3">
            Token, down payment and EMIs fall on fixed monthly dates from the booking month. You can adjust any due
            date below.
          </p>

          <div className="card bg-light border-0 mb-4">
            <div className="card-body py-3">
              <h6 className="mb-3">Schedule dates ({scheduleRows.length})</h6>
              {scheduleRows.map((row) => (
                <div key={row.key} className="row align-items-center border-bottom py-2 g-2">
                  <div className="col-md-5 small">{row.label}</div>
                  <div className="col-md-3">
                    {row.key === "token" ? (
                      <span className="fw-semibold">{money(row.amount)}</span>
                    ) : (
                      <input
                        type="number"
                        className="form-control form-control-sm"
                        value={row.amount}
                        onChange={(e) => updateScheduleRow(row.key, "amount", e.target.value)}
                      />
                    )}
                  </div>
                  <div className="col-md-4">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={row.date}
                      onChange={(e) => updateScheduleRow(row.key, "date", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="row g-3 mb-2">
            <div className="col-md-4">
              <label className="form-label">Payment mode</label>
              <select className="form-select" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="net_banking">Net Banking</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="card">Card</option>
              </select>
            </div>
            {paymentMode !== "cash" && (
              <div className="col-md-4">
                <label className="form-label">
                  Receiving bank <span className="text-danger">*</span>
                </label>
                <select
                  className={`form-select ${step2Errors.bankId ? "is-invalid" : ""}`}
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                >
                  <option value="">Select bank</option>
                  {banks.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                {step2Errors.bankId && <div className="invalid-feedback">{step2Errors.bankId}</div>}
              </div>
            )}
            <div className="col-md-4">
              <label className="form-label">Payment reference</label>
              <input
                type="text"
                className="form-control"
                placeholder="TXN-... (optional)"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>

          <div className="row g-3 mb-2">
            <div className="col-md-4">
              <label className="form-label">
                Receipt ID {tokenCollected && <span className="text-danger">*</span>}
              </label>
              <input
                type="text"
                className={`form-control ${step2Errors.receiptId ? "is-invalid" : ""}`}
                placeholder="Enter receipt book number"
                value={receiptId}
                onChange={(e) => setReceiptId(e.target.value)}
              />
              {step2Errors.receiptId && <div className="invalid-feedback">{step2Errors.receiptId}</div>}
            </div>
            <div className="col-md-8">
              <label className="form-label">Remarks (optional)</label>
              <textarea
                className="form-control"
                rows={1}
                placeholder="Optional notes for the receipt"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="row g-3 mb-2">
            <div className="col-md-6">
              <label className="form-label">Amount in words</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Twenty one thousand rupees only"
                value={amountInWords}
                onChange={(e) => setAmountInWords(e.target.value)}
              />
            </div>
            <div className="col-md-6">
              <label className="form-label">Collected by</label>
              <input
                type="text"
                className="form-control"
                value={collectedBy}
                onChange={(e) => setCollectedBy(e.target.value)}
              />
            </div>
          </div>

          <div className="form-check mb-4">
            <input
              className="form-check-input"
              type="checkbox"
              id="tokenCollected"
              checked={tokenCollected}
              onChange={(e) => setTokenCollected(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="tokenCollected">
              Mark the token amount as collected now (otherwise it stays pending)
            </label>
          </div>

          <div className="card border-dashed mb-4">
            <div className="card-body">
              <h6 className="mb-3">
                <iconify-icon icon="solar:shield-check-bold-duotone" className="align-middle me-1"></iconify-icon>
                Document upload (optional)
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label small text-uppercase text-muted">Customer ID proof</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="form-control"
                    disabled={uploadingDoc === "id_proof"}
                    onChange={(e) => handleDocUpload("id_proof", e.target.files[0])}
                  />
                  <p className="text-muted small mb-0 mt-1">
                    {documents.id_proof ? "Uploaded ✓" : "Aadhaar, PAN, driving licence, or passport (JPG, PNG, PDF)"}
                  </p>
                </div>
                <div className="col-md-6">
                  <label className="form-label small text-uppercase text-muted">PAN card</label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="form-control"
                    disabled={uploadingDoc === "pan_card"}
                    onChange={(e) => handleDocUpload("pan_card", e.target.files[0])}
                  />
                  <p className="text-muted small mb-0 mt-1">
                    {documents.pan_card ? "Uploaded ✓" : "PAN card (JPG, PNG, or PDF, max 3MB)"}
                  </p>
                </div>
              </div>

              <label className="form-label small text-uppercase text-muted mt-3">Additional documents</label>
              <div className="row g-2">
                {[
                  ["noc_certificate", "NOC certificate"],
                  ["agreement_copy", "Agreement copy"],
                  ["site_plan", "Site plan"],
                ].map(([key, label]) => (
                  <div className="col-md-4" key={key}>
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={key}
                        checked={!!documents[key]}
                        onChange={() => {
                          if (documents[key]) {
                            setDocuments((d) => ({ ...d, [key]: "" }));
                          } else {
                            document.getElementById(`${key}-file`).click();
                          }
                        }}
                      />
                      <label className="form-check-label" htmlFor={key}>
                        {label}
                      </label>
                    </div>
                    <input
                      id={`${key}-file`}
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      className="d-none"
                      onChange={(e) => handleDocUpload(key, e.target.files[0])}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="d-flex justify-content-between pt-3 border-top">
            <button type="button" className="btn btn-light" onClick={() => setStep(1)}>
              ← Back to step 1
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (validateStep2()) setStep(3);
              }}
            >
              Continue to commission
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card-body">
          <p className="text-muted mb-4">
            {name} · {projects.find((p) => p._id === projectId)?.name} · Plot{" "}
            {selectedPlot?.plotNumber} · {money(sellingPrice)}
          </p>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="text-uppercase text-muted small fw-bold mb-0 border-start border-3 border-primary ps-2">
              Commission
            </h6>
            <span className="text-muted small">
              Pool {money(totalCommission)} · {money(commissionPerSqft)}/sq.ft
            </span>
          </div>

          {commissionLoading && <div className="text-muted small mb-3">Calculating…</div>}
          {commissionError && <div className="alert alert-danger">{commissionError}</div>}

          {!agentId && (
            <div className="alert alert-light border small mb-3">
              No executive assigned — this is a direct booking with no commission payout.
            </div>
          )}
          {!commissionLoading && !commissionError && agentId && (
            <div className="table-responsive mb-4">
              <table className="table align-middle">
                <thead>
                  <tr className="text-muted small text-uppercase">
                    <th>Level / Executive</th>
                    <th>Cap ₹/sq.ft</th>
                    <th className="text-end">Earns</th>
                  </tr>
                </thead>
                <tbody>
                  {commissionPreview.map((row, i) => {
                    const cappedTotal =
                      i === 0 && commissionCap > 0
                        ? Math.min(row.total_commission, commissionCap * totalSqft)
                        : row.total_commission;
                    return (
                      <tr key={i}>
                        <td>
                          L{i + 1} {row.agent_name}{" "}
                          {i === 0 && <span className="badge bg-light text-dark border">seller</span>}
                          <div className="text-muted small">{row.rank}</div>
                        </td>
                        <td>
                          {i === 0 ? (
                            <>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                style={{ width: 100 }}
                                value={commissionCap}
                                onChange={(e) => setCommissionCap(Number(e.target.value) || 0)}
                              />
                              <div className="text-muted small">default ₹0</div>
                            </>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-end fw-semibold">{money(cappedTotal)}</td>
                      </tr>
                    );
                  })}
                  <tr className="border-top">
                    <td className="fw-bold">Total commission</td>
                    <td></td>
                    <td className="text-end fw-bold">{money(totalCommission)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="form-check mb-4">
            <input
              className="form-check-input"
              type="checkbox"
              id="execDiscount"
              checked={execGaveDiscount}
              onChange={(e) => setExecGaveDiscount(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="execDiscount">
              Executive gave a discount from his own commission
            </label>
          </div>

          <div className="card bg-light border-0 mb-4">
            <div className="card-body">
              <h6 className="mb-3">Review &amp; confirm</h6>
              <div className="row g-3 small">
                <div className="col-md-2">
                  <div className="text-muted">Owner minimum</div>
                  <div className="fw-semibold">{money(selectedPlot?.pricePerSqft)}/sq.ft</div>
                </div>
                <div className="col-md-2">
                  <div className="text-muted">Owner total (min + PLC)</div>
                  <div className="fw-semibold">
                    {money(Number(selectedPlot?.pricePerSqft || 0) * Number(selectedPlot?.totalArea || 0) + Number(selectedPlot?.plcAmount || 0))}
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="text-muted">Customer</div>
                  <div className="fw-semibold">{name}</div>
                </div>
                <div className="col-md-2">
                  <div className="text-muted">Project</div>
                  <div className="fw-semibold">{projects.find((p) => p._id === projectId)?.name}</div>
                </div>
                <div className="col-md-2">
                  <div className="text-muted">Plot</div>
                  <div className="fw-semibold">{selectedPlot?.plotNumber}</div>
                </div>
                <div className="col-md-2">
                  <div className="text-muted">Area</div>
                  <div className="fw-semibold">{selectedPlot?.totalArea} sq.ft</div>
                </div>
                <div className="col-md-2">
                  <div className="text-muted">Selling price</div>
                  <div className="fw-semibold">{money(sellingPrice)}</div>
                </div>
                <div className="col-md-2">
                  <div className="text-muted">Rate</div>
                  <div className="fw-semibold">
                    {money(totalSqft > 0 ? sellingPrice / totalSqft : 0)}/sq.ft
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="text-muted">Commission amount</div>
                  <div className="fw-semibold">
                    {money(commissionCap > 0 ? Math.min(totalCommission, commissionCap * totalSqft) : totalCommission)}
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="text-muted">Booking token</div>
                  <div className="fw-semibold">{money(bookingAmount)}</div>
                </div>
              </div>
            </div>
          </div>

          {createError && <div className="alert alert-danger">{createError}</div>}

          <div className="form-check border rounded p-3 mb-4">
            <input
              className="form-check-input"
              type="checkbox"
              id="confirmAccurate"
              checked={confirmAccurate}
              onChange={(e) => setConfirmAccurate(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="confirmAccurate">
              I confirm all information provided is accurate — required to create the booking
              <div className="text-muted small">By submitting, you agree to our terms and conditions</div>
            </label>
          </div>

          <div className="d-flex justify-content-between pt-3 border-top">
            <button type="button" className="btn btn-light" onClick={() => setStep(2)} disabled={creating}>
              ← Back to step 2
            </button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!confirmAccurate || creating}
              onClick={handleCreateBooking}
            >
              {creating ? "Creating…" : "Create booking"}
            </button>
          </div>
        </div>
      )}
    {createdBookingId && (
        <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content text-center p-4">
              <div className="mb-3">
                <iconify-icon icon="solar:check-circle-bold" style={{ fontSize: 48, color: "#28a745" }}></iconify-icon>
              </div>
              <h4>Booking Created</h4>
              <p className="text-muted">
                The booking has been successfully created. Would you like to generate and print the booking receipt?
              </p>
              <div className="d-flex justify-content-center gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => navigate(`/admin/bookings/${createdBookingId}?print=1`)}
                >
                  Print Receipt
                </button>
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={() => navigate(`/admin/bookings/${createdBookingId}`)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingCreate;