import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios.js";
import BookingPlotMap from "./BookingPlotMap.jsx";
import { getStoredUser } from "../../utils/userHelpers.js";

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
  const [customers, setCustomers] = useState([]);
  const [existingCustomerId, setExistingCustomerId] = useState("");

  const [searchParams] = useSearchParams();

  // Step 1 — customer mode
  const [customerMode, setCustomerMode] = useState("walk-in");
  const [leadId, setLeadId] = useState(null);
  const [leadSearchInput, setLeadSearchInput] = useState("");
  const [leadSuggestions, setLeadSuggestions] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);

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
  const [plotArea, setPlotArea] = useState(0);
  const [plotRate, setPlotRate] = useState(0);
  const [plotPlcPercent, setPlotPlcPercent] = useState(0);

  // Step 1 — executive (mandatory)
  const [agentId, setAgentId] = useState("");

  const [step1Errors, setStep1Errors] = useState({});

  // Step 2 — payment plan
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [downPaymentAmount, setDownPaymentAmount] = useState(0);
  const [additionalDownPayments, setAdditionalDownPayments] = useState([]); // [{ amount, date }]

  function addExtraDownPayment() {
    setAdditionalDownPayments((prev) => [...prev, { amount: 0, date: "" }]);
  }
  function removeExtraDownPayment(index) {
    setAdditionalDownPayments((prev) => prev.filter((_, i) => i !== index));
  }
  function updateExtraDownPayment(index, field, value) {
    setAdditionalDownPayments((prev) =>
      prev.map((dp, i) => (i === index ? { ...dp, [field]: value } : dp))
    );
  }
  const [emiAmountEach, setEmiAmountEach] = useState(0); // ₹ per EMI — the real source of truth
  const [emiCount, setEmiCount] = useState(0);
  const emiMonths = emiCount;
  const [downPaymentMode, setDownPaymentMode] = useState("percent"); // "percent" | "per_sqft"
  const [emiMode, setEmiMode] = useState("percent");

  useEffect(() => {
    if (!projectId) {
      setPlans([]);
      return;
    }
    api
      .get(`/admin/projects/${projectId}/payment-plans`)
      .then((res) => {
        const data = res.data.data || [];
        setPlans(data);
        const def = data.find((p) => p.isDefault) || data[0];
        if (def) applyPlan(def._id, data);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  function applyPlan(id, sourcePlans) {
    setSelectedPlanId(id);
    const list = sourcePlans || plans;
    const p = list.find((pl) => pl._id === id);
    if (p) {
      // Only set what does NOT depend on sellingPrice here. sellingPrice is
      // still 0 at this point (this runs on project select, before a plot —
      // and therefore a price — has been chosen), so any ₹ amount computed
      // from it right now would be wrong. The % fields get converted into
      // real ₹ amounts by the recalcPlanAmounts effect below, which re-runs
      // once sellingPrice is actually known.
      setBookingAmount(p.bookingAmount || "");
      setEmiCount(p.emiCount || 0);
    }
  }

  // Step 2 — payment
  const [banks, setBanks] = useState([]);
  const [bookingAmount, setBookingAmount] = useState("");
  const [scheduleDates, setScheduleDates] = useState([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [bankId, setBankId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [receiptId, setReceiptId] = useState("");
  const [amountInWords, setAmountInWords] = useState("");
  const [collectedBy, setCollectedBy] = useState(() => getStoredUser()?.name || "");
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
  const sellerDefaultCap = agents.find((a) => a._id === agentId)?.slabPerSqft ?? 0;

  useEffect(() => {
    setCommissionCap(sellerDefaultCap);
  }, [agentId, sellerDefaultCap]);
  const [execGaveDiscount, setExecGaveDiscount] = useState(false);
  const [execDiscountRemarks, setExecDiscountRemarks] = useState("");
  const [uplineCaps, setUplineCaps] = useState([]);
  const [commissionPoolPerSqft, setCommissionPoolPerSqft] = useState(0);
  const [commissionPreview, setCommissionPreview] = useState([]);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionError, setCommissionError] = useState(null);
  const [confirmAccurate, setConfirmAccurate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [createdBookingId, setCreatedBookingId] = useState(null);

  useEffect(() => {
    const leadIdFromUrl = searchParams.get("lead_id");
    if (leadIdFromUrl) {
      api
        .get(`/admin/leads/${leadIdFromUrl}`)
        .then((res) => applyLead(res.data.data))
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyLead(lead) {
    setSelectedLead(lead);
    setLeadId(lead._id);
    setCustomerMode("from-lead");
    setName(lead.name || "");
    setEmail(lead.email || "");
    setPhone(lead.mobile || "");
    if (lead.project?._id) setProjectId(lead.project._id);
    if (lead.assignedAgent?._id) setAgentId(lead.assignedAgent._id);
    setLeadSearchInput(`${lead.name} — ${lead.mobile}`);
    setLeadSuggestions([]);
  }

  function handleLeadSearch(val) {
    setLeadSearchInput(val);
    setSelectedLead(null);
    setLeadId(null);
    if (!val.trim()) {
      setLeadSuggestions([]);
      return;
    }
    api
      .get("/admin/leads", { params: { search: val, status: "all", limit: 8 } })
      .then((res) => setLeadSuggestions((res.data.data || []).filter((l) => l.status !== "converted")))
      .catch(() => {});
  }

  useEffect(() => {
    api
      .get("/admin/bookings/create")
      .then((res) => {
        setProjects(res.data.projects || []);
        setAgents(res.data.agents || []);
        setCustomers(res.data.customers || []);
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
    setPlotArea(plot?.totalArea || 0);
    setPlotRate(plot?.pricePerSqft || 0);
    setPlotPlcPercent(plot?.plcPercent || 0);
  }, [plotId, plots]);

  useEffect(() => {
    if (!projectId) {
      setBanks([]);
      setBankId("");
      return;
    }
    api
      .get(`/admin/projects/${projectId}/banks`)
      .then((res) => setBanks((res.data.data || []).filter((b) => b.isActive !== false)))
      .catch(() => {});
  }, [projectId]);

  // ---- derived values (declared once, used everywhere below) ----
  const baseAmount = selectedPlot ? Number(plotArea || 0) * Number(plotRate || 0) : 0;
  const plcAmount = selectedPlot ? Math.round((baseAmount * Number(plotPlcPercent || 0)) / 100) : 0;
  const sellingPrice = baseAmount + plcAmount;

  // Re-derive ₹ amounts from the selected plan's percentages every time
  // sellingPrice changes (e.g. once a plot is picked in step 1, or its rate
  // loads) — not just once at plan-selection time when sellingPrice may
  // still be 0. Placed here (after sellingPrice is declared) deliberately —
  // referencing it any earlier in this component throws a
  // "Cannot access 'sellingPrice' before initialization" error, since it's
  // a const declared further down in the same function.
  useEffect(() => {
    if (!selectedPlanId || !sellingPrice) return;
    const p = plans.find((pl) => pl._id === selectedPlanId);
    if (!p) return;
    const token = Number(p.bookingAmount) || 0;
    if (Number(p.downPaymentPercent) > 0) {
      const totalDp = Math.round((sellingPrice * Number(p.downPaymentPercent)) / 100);
      setDownPaymentAmount(Math.max(totalDp - token, 0));
    } else {
      setDownPaymentAmount(p.downPaymentAmount || 0);
    }
    setEmiAmountEach(Math.round((sellingPrice * (Number(p.emiPercent) || 0)) / 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlanId, plans, sellingPrice]);

  const emiPercent = sellingPrice > 0 ? Math.round(((emiAmountEach / sellingPrice) * 100) * 100) / 100 : 0; // display-only
  const totalSqftForToggle = Number(selectedPlot?.totalArea) || 0;

  const dpBase = sellingPrice;

  const downPaymentDisplayValue =
    downPaymentMode === "percent"
      ? dpBase > 0
        ? Math.round(((downPaymentAmount + (Number(bookingAmount) || 0)) / dpBase) * 10000) / 100
        : 0
      : totalSqftForToggle > 0
      ? Math.round((downPaymentAmount / totalSqftForToggle) * 100) / 100
      : 0;

  const emiDisplayValue =
    emiMode === "percent"
      ? sellingPrice > 0
        ? Math.round((emiAmountEach / sellingPrice) * 10000) / 100
        : 0
      : totalSqftForToggle > 0
      ? Math.round((emiAmountEach / totalSqftForToggle) * 100) / 100
      : 0;

  function handleDownPaymentInput(value) {
    const v = Number(value) || 0;
    setDownPaymentAmount(
      downPaymentMode === "percent"
        ? Math.max(Math.round((dpBase * v) / 100) - (Number(bookingAmount) || 0), 0)
        : Math.round(v * totalSqftForToggle)
    );
  }

  function handleEmiInput(value) {
    const v = Number(value) || 0;
    setEmiAmountEach(
      emiMode === "percent" ? Math.round((sellingPrice * v) / 100) : Math.round(v * totalSqftForToggle)
    );
  };

  function addMonths(date, months) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().slice(0, 10);
  }

  function buildPlanSchedule(total, token, downPayment, emiEach, emiN, date, extraDownPayments = []) {
    const n = Number(emiN) || 0;
    const extraTotal = extraDownPayments.reduce((sum, dp) => sum + (Number(dp.amount) || 0), 0);
    let registry = Math.round(total - token - downPayment - extraTotal - (Number(emiEach) || 0) * n);
    if (registry < 0) registry = 0;

    const rows = [
      { key: "token", label: "Booking amount (token)", amount: token, date },
      { key: "dp1", label: "Down payment", amount: downPayment, date },
    ];
    extraDownPayments.forEach((dp, idx) => {
      rows.push({
        key: `dp${idx + 2}`,
        label: `Down payment ${idx + 2}`,
        amount: Number(dp.amount) || 0,
        date: dp.date || date,
      });
    });
    for (let i = 1; i <= n; i++) {
      rows.push({ key: `emi${i}`, label: `EMI ${i}`, amount: Number(emiEach) || 0, date: addMonths(date, i) });
    }
    rows.push({ key: "registry", label: "Registry", amount: registry, date: addMonths(date, n + 1) });
    return rows;
  }

  // Rebuilds the whole schedule from the template controls (down payment,
  // EMI amount, EMI count). This intentionally resets any manual per-row
  // edits — that's expected when you change a template control. Individual
  // row edits (via updateScheduleRow below) don't touch these dependencies,
  // so they won't get wiped by unrelated re-renders.
  useEffect(() => {
    if (!sellingPrice) {
      setScheduleDates([]);
      return;
    }
    setScheduleDates(
      buildPlanSchedule(
        sellingPrice,
        Number(bookingAmount) || 0,
        Number(downPaymentAmount) || 0,
        emiAmountEach,
        emiCount,
        bookingDate,
        additionalDownPayments
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellingPrice, bookingAmount, downPaymentAmount, emiAmountEach, emiCount, bookingDate, additionalDownPayments]);

  function updateScheduleRow(key, field, value) {
    setScheduleDates((rows) => {
      if (field !== "amount") {
        return rows.map((r) => (r.key === key ? { ...r, [field]: value } : r));
      }

      const newAmount = Number(value) || 0;
      const oldRow = rows.find((r) => r.key === key);
      const oldAmount = oldRow ? oldRow.amount : 0;
      const delta = newAmount - oldAmount;

      // Any manual edit to token / down payment / an individual EMI shifts the
      // difference to/from Registry, so the schedule always still totals to
      // the selling price. Editing Registry itself just sets it directly.
      return rows.map((r) => {
        if (r.key === key) return { ...r, amount: newAmount };
        if (key !== "registry" && r.key === "registry") {
          return { ...r, amount: Math.max(r.amount - delta, 0) };
        }
        return r;
      });
    });
  }

  const registryAmount = scheduleDates.find((r) => r.key === "registry")?.amount || 0;
  const emiAmount = scheduleDates.find((r) => r.key === "emi1")?.amount || 0;
  const additionalDownPaymentsTotal = additionalDownPayments.reduce(
    (sum, dp) => sum + (Number(dp.amount) || 0),
    0
  );
  const remainingAmount = Math.max(
    sellingPrice -
      (Number(bookingAmount) || 0) -
      (Number(downPaymentAmount) || 0) -
      additionalDownPaymentsTotal -
      registryAmount,
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
        project_id: projectId || undefined,
        price_per_sqft: Number(plotRate) || 0,
        emi_amount: emiAmount,
        emi_months: emiMonths,
        payment_mode: paymentMode,
        // PLC is a premium on top of base price and should not count toward
        // commission — this tells the backend what fraction of each ₹ is
        // actual base price vs PLC, so it can strip PLC out before computing.
        commission_ratio: sellingPrice > 0 ? Math.max(sellingPrice - plcAmount, 0) / sellingPrice : 1,
      })
      .then((res) => {
        const rows = res.data.preview || [];
        setCommissionPreview(rows);
        setCommissionPoolPerSqft(Number(res.data.commission_pool_per_sqft) || 0);
        setUplineCaps(
          rows.slice(1).filter((r) => !r.isCompany).map((r) => r.default_cap_per_sqft ?? 0)
        );
      })
      .catch((err) => setCommissionError(err.response?.data?.message || err.message))
      .finally(() => setCommissionLoading(false));
  }, [step, projectId, agentId, emiMonths]);

  // Commission is calculated on the plot's actual physical area only — PLC
  // (a location premium on top of base price) is excluded from commission
  // entirely, even though the customer still pays it and it's still part of
  // sellingPrice/totalAmount. This matches generateEmis()'s commissionRatio
  // logic on the backend, and the commission-preview call above sends that
  // same ratio so this preview and the saved booking always agree.
  const totalSqft = Number(selectedPlot?.totalArea) || 0;
  let uplineRunningIndex = 0;
  let previousCap = 0;
  const commissionRows = commissionPreview.map((row, i) => {
    if (i === 0) {
      const cap = commissionCap || 0;
      const fallbackRate = totalSqft > 0 ? row.total_commission / totalSqft : 0;
      const rate = cap > 0 ? cap : fallbackRate;
      // Upline diff must use the seller's DEFAULT slab, not any discounted
      // cap for this booking — otherwise a discount inflates upline earnings
      // instead of falling to Company. Mirrors the backend fix.
      const defaultCap = Number(sellerDefaultCap) || rate;
      previousCap = cap > 0 ? Math.max(cap, defaultCap) : rate;
      return {
        ...row,
        cappedTotal: rate * totalSqft,
        capEditable: true,
        capValue: cap,
        uplineIndex: null,
      };
    }
    if (row.isCompany) {
      return { ...row, cappedTotal: row.total_commission, capEditable: false, capValue: null, uplineIndex: null, isCompanyPlaceholder: true };
    }
    const uplineIndex = uplineRunningIndex;
    uplineRunningIndex += 1;
    const cap = Number(uplineCaps[uplineIndex]) || 0;
    const fallbackRate = totalSqft > 0 ? row.total_commission / totalSqft : 0;
    const rate = cap > 0 ? Math.max(cap - previousCap, 0) : fallbackRate;
    previousCap = cap > 0 ? Math.max(cap, previousCap) : previousCap;
    return {
      ...row,
      cappedTotal: rate * totalSqft,
      capEditable: true,
      capValue: cap,
      uplineIndex,
    };
  });
  const paidRatePerSqft = commissionRows
    .filter((row) => !row.isCompanyPlaceholder)
    .reduce((sum, row) => sum + (totalSqft > 0 ? row.cappedTotal / totalSqft : 0), 0);
  const hasCompanyRow = commissionRows.some((row) => row.isCompanyPlaceholder);
  // If the initial fetch had no Company row (defaults consumed the whole
  // pool), a discount typed afterward still needs somewhere to show the
  // leftover — synthesize a placeholder row here instead of only updating
  // one that may not exist yet.
  const companyDisplayName = commissionPreview.find((r) => r.isCompany)?.agent_name || "Company";
  const rowsWithCompany = hasCompanyRow
    ? commissionRows
    : [
        ...commissionRows,
        {
          agent_name: companyDisplayName,
          role: companyDisplayName,
          isCompany: true,
          isCompanyPlaceholder: true,
          capEditable: false,
          capValue: null,
          uplineIndex: null,
          cappedTotal: 0,
        },
      ];
  const liveCommissionRows = rowsWithCompany.map((row) =>
    row.isCompanyPlaceholder
      ? {
          ...row,
          cappedTotal: Math.max((commissionPoolPerSqft - paidRatePerSqft) * totalSqft, 0),
        }
      : row
  );
  const totalCommission = liveCommissionRows.reduce((sum, row) => sum + row.cappedTotal, 0);
  const commissionPerSqft = totalSqft > 0 ? totalCommission / totalSqft : 0;

  // ---- validation ----
  function validateStep1() {
    const errs = {};
    if (customerMode === "existing") {
      if (!existingCustomerId) errs.existingCustomerId = "Please select a customer.";
    } else {
      if (!name.trim()) errs.name = "Full name is required.";
      if (!email.trim() && !phone.trim()) errs.contact = "Email or phone is required.";
    }
    if (!projectId) errs.projectId = "Project is required.";
    if (!plotId) errs.plotId = "Plot is required.";
    // executive is optional — a booking can go direct with no assigned executive
    setStep1Errors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleExistingCustomerSelect(id) {
    setExistingCustomerId(id);
    const c = customers.find((cu) => cu._id === id);
    if (c) {
      setName(c.name || "");
      setEmail(c.email || "");
      setPhone(c.phone || "");
      setAddress(c.address || "");
    }
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
      let customerId = existingCustomerId;
      if (customerMode !== "existing" || !customerId) {
        const customerRes = await api.post("/admin/customers", {
          name,
          email: email || undefined,
          phone: phone || undefined,
          address: address || undefined,
          status: "active",
        });
        customerId = customerRes.data.data?._id || customerRes.data._id;
      }

      const payload = {
        customer_id: customerId,
        lead_id: leadId || undefined,
        plot_id: plotId,
        agent_id: agentId || undefined,
        price_per_sqft: Number(plotRate) || 0,
        plot_area: Number(plotArea) || 0,
        plc_percent: Number(plotPlcPercent) || 0,
        booking_amount: Number(bookingAmount) || 0,
        down_payment_amount: Number(downPaymentAmount) || 0,
        down_payment_due_date: scheduleDates.find((r) => r.key === "dp1")?.date,
        additional_down_payments: additionalDownPayments
          .filter((dp) => Number(dp.amount) > 0)
          .map((dp) => ({ amount: Number(dp.amount) || 0, due_date: dp.date || undefined })),
        registry_amount: registryAmount,
        registry_due_date: scheduleDates.find((r) => r.key === "registry")?.date,
        emi_due_dates: scheduleDates.filter((r) => r.key.startsWith("emi")).map((r) => r.date),
        emi_months: emiCount,
        payment_plan_key: plans.find((p) => p._id === selectedPlanId)?.name || "custom",
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
        upline_commission_caps_per_sqft: uplineCaps,
        executive_gave_discount: execGaveDiscount,
        executive_discount_remarks: execGaveDiscount ? execDiscountRemarks || undefined : undefined,
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
              <button
                type="button"
                className={`nav-link ${customerMode === "walk-in" ? "active" : ""}`}
                onClick={() => {
                  setCustomerMode("walk-in");
                  setLeadId(null);
                  setSelectedLead(null);
                }}
              >
                Walk-in customer
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${customerMode === "from-lead" ? "active" : ""}`}
                onClick={() => setCustomerMode("from-lead")}
              >
                From lead
              </button>
            </li>
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link ${customerMode === "existing" ? "active" : ""}`}
                onClick={() => {
                  setCustomerMode("existing");
                  setLeadId(null);
                  setSelectedLead(null);
                }}
              >
                Existing customer
              </button>
            </li>
          </ul>

          <p className="text-muted small mb-4">
            Enter customer details, then select project and an available plot. Payment and documents are on the
            next page.
          </p>

          {customerMode === "existing" && (
            <div className="mb-4">
              <label className="form-label">Select Customer</label>
              <select
                className={`form-select ${step1Errors.existingCustomerId ? "is-invalid" : ""}`}
                value={existingCustomerId}
                onChange={(e) => handleExistingCustomerSelect(e.target.value)}
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name} {c.phone ? `(${c.phone})` : c.email ? `(${c.email})` : ""}
                  </option>
                ))}
              </select>
              {step1Errors.existingCustomerId && (
                <div className="invalid-feedback">{step1Errors.existingCustomerId}</div>
              )}
              {existingCustomerId && (
                <div className="text-success small mt-1">
                  <iconify-icon icon="solar:check-circle-bold" className="align-middle me-1"></iconify-icon>
                  Customer selected — details prefilled below.
                </div>
              )}
            </div>
          )}

          {customerMode === "from-lead" && (
            <div className="mb-4 position-relative">
              <label className="form-label">Search Lead by Name / Mobile</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search leads..."
                value={leadSearchInput}
                onChange={(e) => handleLeadSearch(e.target.value)}
              />
              {leadSuggestions.length > 0 && (
                <div className="list-group position-absolute w-100" style={{ zIndex: 10 }}>
                  {leadSuggestions.map((l) => (
                    <button
                      key={l._id}
                      type="button"
                      className="list-group-item list-group-item-action"
                      onClick={() => applyLead(l)}
                    >
                      {l.name} — {l.mobile} {l.plotNumber ? `(Plot ${l.plotNumber})` : ""}
                    </button>
                  ))}
                </div>
              )}
              {selectedLead && (
                <div className="text-success small mt-1">
                  <iconify-icon icon="solar:check-circle-bold" className="align-middle me-1"></iconify-icon>
                  Lead selected — customer details prefilled below.
                </div>
              )}
            </div>
          )}

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
                readOnly={customerMode === "existing"}
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

          <BookingPlotMap projectId={projectId} plotId={plotId} onSelectPlot={setPlotId} />

          {selectedPlot && (
            <div className="card bg-light border-0 mt-2 mb-3">
              <div className="card-body py-3">
                <h6 className="mb-3">Plot {selectedPlot.plotNumber}</h6>
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label small text-muted">Area (sqft)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={plotArea}
                      onChange={(e) => setPlotArea(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small text-muted">Rate (₹/sqft)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={plotRate}
                      onChange={(e) => setPlotRate(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small text-muted">PLC (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={plotPlcPercent}
                      onChange={(e) => setPlotPlcPercent(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small text-muted">Selling price</label>
                    <input type="text" className="form-control fw-bold" value={money(sellingPrice)} disabled />
                  </div>
                </div>
                <p className="text-muted small mb-0 mt-2">
                  <iconify-icon icon="solar:info-circle-linear" className="align-middle me-1"></iconify-icon>
                  Selling price = Rate × Area{Number(plotPlcPercent) > 0 ? " + PLC" : ""}. Editing these updates the
                  plot's saved values once the booking is created.
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
            <div className="col-md-3">
              <label className="form-label">Payment plan</label>
              <select
                className="form-select"
                value={selectedPlanId}
                onChange={(e) => applyPlan(e.target.value)}
              >
                <option value="">— Custom —</option>
                {plans.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                    {p.isDefault ? " (Default)" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label mb-0">Down payment</label>
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${downPaymentMode === "percent" ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => setDownPaymentMode("percent")}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    className={`btn ${downPaymentMode === "per_sqft" ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => setDownPaymentMode("per_sqft")}
                  >
                    ₹/sqft
                  </button>
                </div>
              </div>
              <input
                type="number"
                className="form-control"
                value={downPaymentDisplayValue}
                onChange={(e) => handleDownPaymentInput(e.target.value)}
              />
              <p className="text-muted small mb-0 mt-1">
                = {money(downPaymentAmount)}
                {downPaymentMode === "percent" ? ` (${downPaymentDisplayValue}% of ${money(dpBase)} total, minus token)` : ""}
              </p>
            </div>
            <div className="col-md-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label mb-0">EMI amount, each</label>
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${emiMode === "percent" ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => setEmiMode("percent")}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    className={`btn ${emiMode === "per_sqft" ? "btn-primary" : "btn-outline-secondary"}`}
                    onClick={() => setEmiMode("per_sqft")}
                  >
                    ₹/sqft
                  </button>
                </div>
              </div>
              <input
                type="number"
                className="form-control"
                value={emiDisplayValue}
                onChange={(e) => handleEmiInput(e.target.value)}
              />
              <p className="text-muted small mb-0 mt-1">
                = {money(emiAmountEach)} ({emiPercent}% of selling price)
              </p>
            </div>
            <div className="col-md-3">
              <label className="form-label">EMI months</label>
              <input
                type="number"
                className="form-control"
                value={emiCount}
                onChange={(e) => setEmiCount(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Total EMI (all months)</label>
              <div className="form-control bg-white fw-semibold" style={{ cursor: "default" }}>
                {money((Number(emiAmountEach) || 0) * (Number(emiCount) || 0))}
              </div>
              <p className="text-muted small mb-0 mt-1">
                {money(emiAmountEach)} × {emiCount || 0} months — auto-calculated, not editable directly
              </p>
            </div>
          </div>

          {(additionalDownPayments.length > 0 || true) && (
            <div className="mb-3">
              {additionalDownPayments.map((dp, idx) => (
                <div key={idx} className="row g-2 align-items-center mb-2">
                  <div className="col-md-3">
                    <label className="form-label small text-muted mb-1">Down payment {idx + 2} amount</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Amount"
                      value={dp.amount}
                      onChange={(e) => updateExtraDownPayment(idx, "amount", e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small text-muted mb-1">Due date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={dp.date}
                      onChange={(e) => updateExtraDownPayment(idx, "date", e.target.value)}
                    />
                  </div>
                  <div className="col-md-2 pt-4">
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => removeExtraDownPayment(idx)}
                      title="Remove"
                    >
                      <iconify-icon icon="solar:trash-bin-trash-bold" className="align-middle me-1"></iconify-icon>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-outline-primary"
                onClick={addExtraDownPayment}
              >
                <iconify-icon icon="solar:add-circle-bold" className="align-middle me-1"></iconify-icon>
                Add another down payment
              </button>
            </div>
          )}

          <p className="text-muted small mb-3">
            Booking amount, down payment, EMI amount and EMI months are all editable — Registry (final amount) is
            whatever's left. Token, down payment and EMIs fall on monthly dates from the booking month; you can
            adjust any due date below.
          </p>
          {Number(bookingAmount || 0) + Number(downPaymentAmount || 0) + (Number(emiAmountEach) || 0) * (Number(emiCount) || 0) > sellingPrice && (
            <div className="alert alert-danger py-2 small mb-3">
              <iconify-icon icon="solar:danger-triangle-bold" className="align-middle me-1"></iconify-icon>
              Token + Down payment + Total EMI ({money(Number(bookingAmount || 0) + Number(downPaymentAmount || 0) + (Number(emiAmountEach) || 0) * (Number(emiCount) || 0))}) exceeds the selling price ({money(sellingPrice)}) by{" "}
              {money(Number(bookingAmount || 0) + Number(downPaymentAmount || 0) + (Number(emiAmountEach) || 0) * (Number(emiCount) || 0) - sellingPrice)}.
              Reduce the EMI amount, EMI months, or down payment — Registry can't go negative.
            </div>
          )}

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

          <div className="card bg-light border-0 mb-4">
            <div className="card-body">
              <h6 className="mb-3">Review before continuing</h6>
              <div className="row g-3 small">
                <div className="col-md-3">
                  <div className="text-muted">Customer</div>
                  <div className="fw-semibold">{name}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted">Plot</div>
                  <div className="fw-semibold">
                    {selectedPlot?.plotNumber} · {selectedPlot?.totalArea} sq.ft
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted">Selling price (incl. PLC)</div>
                  <div className="fw-semibold">{money(sellingPrice)}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted">Payment mode</div>
                  <div className="fw-semibold text-capitalize">{paymentMode.replace("_", " ")}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted">Booking token</div>
                  <div className="fw-semibold">{money(bookingAmount)}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted">Down payment</div>
                  <div className="fw-semibold">{money(downPaymentAmount)}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted">EMI</div>
                  <div className="fw-semibold">
                    {money(emiAmountEach)} × {emiCount} = {money(emiAmountEach * emiCount)}
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted">Registry</div>
                  <div className="fw-semibold">{money(registryAmount)}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted">Total scheduled</div>
                  <div
                    className={`fw-semibold ${
                      Math.round(
                        Number(bookingAmount || 0) + downPaymentAmount + emiAmountEach * emiCount + registryAmount
                      ) !== Math.round(sellingPrice)
                        ? "text-danger"
                        : "text-success"
                    }`}
                  >
                    {money(Number(bookingAmount || 0) + downPaymentAmount + emiAmountEach * emiCount + registryAmount)}
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted">Receipt ID</div>
                  <div className="fw-semibold">{receiptId || "—"}</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted">Documents uploaded</div>
                  <div className="fw-semibold">{Object.values(documents).filter(Boolean).length} / 5</div>
                </div>
                <div className="col-md-3">
                  <div className="text-muted">Executive</div>
                  <div className="fw-semibold">
                    {agents.find((a) => a._id === agentId)?.name || "— (direct booking)"}
                  </div>
                </div>
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
              Pool {money(commissionPoolPerSqft * totalSqft)} · {money(commissionPoolPerSqft)}/sq.ft
            </span>
          </div>
          {Number(plotPlcPercent) > 0 && (
            <div className="alert alert-light border small mb-3">
              <iconify-icon icon="solar:info-circle-bold" className="align-middle me-1"></iconify-icon>
              PLC of {plotPlcPercent}% (₹{money(plcAmount)}) is added to the customer's selling price but does{" "}
              <strong>not</strong> count toward commission — commission below is calculated on the plot's base area
              only ({selectedPlot?.totalArea} sq.ft).
            </div>
          )}

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
                  {liveCommissionRows.map((row, i) => {
                    return (
                      <tr key={i}>
                        <td>
                          L{i + 1} {row.agent_name}{" "}
                          {i === 0 && <span className="badge bg-light text-dark border">seller</span>}
                          <div className="text-muted small">{row.rank}</div>
                        </td>
                        <td>
                          {row.capEditable ? (
                            <>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                style={{ width: 100 }}
                                value={i === 0 ? commissionCap : uplineCaps[row.uplineIndex] ?? 0}
                                onChange={(e) => {
                                  const v = Number(e.target.value) || 0;
                                  if (i === 0) {
                                    setCommissionCap(v);
                                  } else {
                                    setUplineCaps((prev) => {
                                      const next = [...prev];
                                      next[row.uplineIndex] = v;
                                      return next;
                                    });
                                  }
                                }}
                              />
                              <div className="text-muted small">
                                default ₹{i === 0 ? sellerDefaultCap : row.default_cap_per_sqft ?? 0}
                              </div>
                            </>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="text-end fw-semibold">{money(row.cappedTotal)}</td>
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

          <div className="mb-4">
            <div className="form-check">
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
            {execGaveDiscount && (
              <textarea
                className="form-control form-control-sm mt-2"
                rows={2}
                placeholder="Add remarks — e.g. reason for the discount, amount given up, approval note"
                value={execDiscountRemarks}
                onChange={(e) => setExecDiscountRemarks(e.target.value)}
              />
            )}
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
                  <div className="text-muted">PLC %</div>
                  <div className="fw-semibold">{plotPlcPercent || 0}%</div>
                </div>
                <div className="col-md-2">
                  <div className="text-muted">Owner total (min + PLC)</div>
                  <div className="fw-semibold">{money(sellingPrice)}</div>
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
                    {money(totalCommission)}
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