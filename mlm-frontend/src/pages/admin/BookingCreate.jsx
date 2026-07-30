import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";

const STORAGE_BASE = "http://localhost:5000";

function bookingStatusColor(status) {
  return status === "available" ? "#10b981" : status === "booked" ? "#f59e0b" : "#ef4444";
}

function bookingLatLngsToRect(latlngs, imgW, imgH) {
  const lats = latlngs.map((p) => p[0]);
  const lngs = latlngs.map((p) => p[1]);
  const top = 1000 - Math.max(...lats);
  const bottom = 1000 - Math.min(...lats);
  const left = Math.min(...lngs);
  const right = Math.max(...lngs);
  return {
    x: (left / 1000) * imgW,
    y: (top / 1000) * imgH,
    w: ((right - left) / 1000) * imgW,
    h: ((bottom - top) / 1000) * imgH,
  };
}

function BookingCreate() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});

  const [customers, setCustomers] = useState([]);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "", email: "", phone: "", alternate_phone: "",
    address: "", city: "", state: "", pincode: "", aadhaar_number: "", pan_number: "",
  });
  const [newCustomerErrors, setNewCustomerErrors] = useState({});
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [projects, setProjects] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [customerId, setCustomerId] = useState("");
  const [agentId, setAgentId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [plots, setPlots] = useState([]);
  const [plotsLoading, setPlotsLoading] = useState(false);

  const [mapProject, setMapProject] = useState(null);
  const [mapPlots, setMapPlots] = useState([]);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const imgRef = useRef(null);

  const [selectedPlot, setSelectedPlot] = useState(null); // { area, rate }
  const [bookingAmount, setBookingAmount] = useState(0);
  const [emiMonths, setEmiMonths] = useState(1);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [transactionId, setTransactionId] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeBankName, setChequeBankName] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentTime, setPaymentTime] = useState("");
  const [notes, setNotes] = useState("");

  // Purchase Details (applicant info, mirrors the physical booking form)
  const [fathersOrHusbandName, setFathersOrHusbandName] = useState("");
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [dob, setDob] = useState("");
  const [age, setAge] = useState("");
  const [religion, setReligion] = useState("");
  const [nominationName, setNominationName] = useState("");
  const [nominationRelation, setNominationRelation] = useState("");

  // Plot / PLC
  const [plcAmount, setPlcAmount] = useState(0);

  // Mode of Payment
  const [tokenDate, setTokenDate] = useState("");
  const [tokenAmount, setTokenAmount] = useState(0);
  const [dpDate, setDpDate] = useState("");
  const [dpAmount, setDpAmount] = useState(0);
  const [installmentDate, setInstallmentDate] = useState("");
  const [installmentAmount, setInstallmentAmount] = useState(0);
  const [specificCondition, setSpecificCondition] = useState("");
  const [proposerName, setProposerName] = useState("");

  useEffect(() => {
    api
      .get("/admin/bookings/create")
      .then((res) => {
        setCustomers(res.data.customers);
        setProjects(res.data.projects);
        setAgents(res.data.agents);
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleNewCustomerChange = (e) => setNewCustomer({ ...newCustomer, [e.target.name]: e.target.value });

  const handleAddNewCustomer = () => {
    setCreatingCustomer(true);
    setNewCustomerErrors({});
    api
      .post("/admin/customers", { ...newCustomer, status: "active" })
      .then((res) => {
        const created = res.data.data || res.data;
        setCustomers((prev) => [...prev, created]);
        setCustomerId(created._id);
        setShowNewCustomer(false);
        setNewCustomer({
          name: "", email: "", phone: "", alternate_phone: "",
          address: "", city: "", state: "", pincode: "", aadhaar_number: "", pan_number: "",
        });
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setNewCustomerErrors(err.response.data.errors);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setCreatingCustomer(false));
  };

  const handleProjectChange = (val) => {
    setProjectId(val);
    setPlotId("");
    setSelectedPlot(null);
    setPlots([]);
    setMapProject(null);
    setMapPlots([]);
    if (!val) return;

    setPlotsLoading(true);
    api
      .get(`/admin/projects/${val}/plots/available`)
      .then((res) => setPlots(res.data))
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setPlotsLoading(false));

    api
      .get(`/admin/projects/${val}/map`)
      .then((res) => {
        setMapProject(res.data.project);
        setMapPlots(res.data.plots || []);
      })
      .catch(() => {
        setMapProject(null);
        setMapPlots([]);
      });
  };

  const handlePlotChange = (val) => {
    setPlotId(val);
    const plot = plots.find((p) => p._id === val);
    if (plot) {
      setSelectedPlot({ area: Number(plot.totalArea), rate: Number(plot.pricePerSqft) });
      setPlcAmount(Number(plot.plcAmount) || 0);
    } else {
      setSelectedPlot(null);
      setPlcAmount(0);
    }
  };

  const handleMapPlotClick = (plot) => {
    if (plot.status !== "available") return; // booked/sold not selectable
    handlePlotChange(plot._id);
  };

  const totalAmount = selectedPlot ? selectedPlot.area * selectedPlot.rate : 0;
  const remaining = totalAmount - (Number(bookingAmount) || 0);
  const emi = remaining / (Number(emiMonths) || 1);

  const fmt = (n) =>
    "₹ " + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setErrors({});

    const payload = {
      customer_id: customerId,
      agent_id: agentId,
      plot_id: plotId,
      price_per_sqft: selectedPlot ? selectedPlot.rate : "",
      booking_amount: bookingAmount,
      emi_months: emiMonths,
      payment_mode: paymentMode,
      transaction_id: transactionId,
      cheque_number: chequeNumber,
      cheque_bank_name: chequeBankName,
      payment_date: paymentDate,
      payment_time: paymentTime,
      notes,

      fathers_or_husband_name: fathersOrHusbandName,
      gender,
      marital_status: maritalStatus,
      dob,
      age,
      religion,
      nomination_name: nominationName,
      nomination_relation: nominationRelation,

      plc_amount: plcAmount,

      token_date: tokenDate,
      token_amount: tokenAmount,
      dp_date: dpDate,
      dp_amount: dpAmount,
      installment_date: installmentDate,
      installment_amount: installmentAmount,
      specific_condition: specificCondition,
      proposer_name: proposerName,
    };

    api
      .post("/admin/bookings", payload)
      .then((res) => {
        navigate(`/admin/bookings/${res.data.data._id}`);
      })
      .catch((err) => {
        if (err.response?.status === 422) {
          setErrors(err.response.data.errors || {});
          setError(err.response.data.message || null);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setSaving(false));
  };

  if (loading) return <div className="text-center py-4">Loading...</div>;

  return (
    <div className="row">
      <div className="col-xl-9 mx-auto">
        <div className="card">
          <div className="card-header">
            <h4 className="header-title">Create New Booking</h4>
          </div>
          <div className="card-body">
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleSubmit}>
              {/* Section 1: Customer & Agent */}
              <div className="row mb-4">
                <div className="col-md-6 border-end">
                  <h5 className="mb-3 text-primary">Customer Information</h5>
                  <div className="mb-3">
                    <label className="form-label">Select Customer</label>
                    <select
                      className={`form-control ${errors.customer_id ? "is-invalid" : ""}`}
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      required
                    >
                      <option value="">Choose Customer...</option>
                      {customers.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name} ({c.customerCode})
                        </option>
                      ))}
                    </select>
                    {errors.customer_id && <div className="invalid-feedback">{errors.customer_id}</div>}
                    <button
                      type="button"
                      className="btn btn-sm btn-link px-0"
                      onClick={() => setShowNewCustomer((v) => !v)}
                    >
                      {showNewCustomer ? "Cancel" : "+ Add New Customer here"}
                    </button>
                  </div>
                </div>

                {showNewCustomer && (
                  <div className="col-12 mb-3">
                    <div className="border rounded p-3 bg-light">
                      <h6 className="fw-bold mb-3">New Customer</h6>
                      <div className="row">
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">Name *</label>
                          <input
                            type="text"
                            name="name"
                            className={`form-control ${newCustomerErrors.name ? "is-invalid" : ""}`}
                            value={newCustomer.name}
                            onChange={handleNewCustomerChange}
                          />
                          {newCustomerErrors.name && <div className="invalid-feedback">{newCustomerErrors.name}</div>}
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">Phone *</label>
                          <input
                            type="text"
                            name="phone"
                            className={`form-control ${newCustomerErrors.phone ? "is-invalid" : ""}`}
                            value={newCustomer.phone}
                            onChange={handleNewCustomerChange}
                          />
                          {newCustomerErrors.phone && <div className="invalid-feedback">{newCustomerErrors.phone}</div>}
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">Email</label>
                          <input
                            type="email"
                            name="email"
                            className={`form-control ${newCustomerErrors.email ? "is-invalid" : ""}`}
                            value={newCustomer.email}
                            onChange={handleNewCustomerChange}
                          />
                          {newCustomerErrors.email && <div className="invalid-feedback">{newCustomerErrors.email}</div>}
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">Alternate Phone</label>
                          <input
                            type="text"
                            name="alternate_phone"
                            className="form-control"
                            value={newCustomer.alternate_phone}
                            onChange={handleNewCustomerChange}
                          />
                        </div>
                        <div className="col-md-12 mb-3">
                          <label className="form-label fw-semibold">Address</label>
                          <input
                            type="text"
                            name="address"
                            className="form-control"
                            value={newCustomer.address}
                            onChange={handleNewCustomerChange}
                          />
                        </div>
                        <div className="col-md-4 mb-3">
                          <label className="form-label fw-semibold">City</label>
                          <input
                            type="text"
                            name="city"
                            className="form-control"
                            value={newCustomer.city}
                            onChange={handleNewCustomerChange}
                          />
                        </div>
                        <div className="col-md-4 mb-3">
                          <label className="form-label fw-semibold">State</label>
                          <input
                            type="text"
                            name="state"
                            className="form-control"
                            value={newCustomer.state}
                            onChange={handleNewCustomerChange}
                          />
                        </div>
                        <div className="col-md-4 mb-3">
                          <label className="form-label fw-semibold">Pincode</label>
                          <input
                            type="text"
                            name="pincode"
                            className={`form-control ${newCustomerErrors.pincode ? "is-invalid" : ""}`}
                            value={newCustomer.pincode}
                            onChange={handleNewCustomerChange}
                          />
                          {newCustomerErrors.pincode && <div className="invalid-feedback">{newCustomerErrors.pincode}</div>}
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">Aadhaar Number</label>
                          <input
                            type="text"
                            name="aadhaar_number"
                            className={`form-control ${newCustomerErrors.aadhaar_number ? "is-invalid" : ""}`}
                            value={newCustomer.aadhaar_number}
                            onChange={handleNewCustomerChange}
                          />
                          {newCustomerErrors.aadhaar_number && <div className="invalid-feedback">{newCustomerErrors.aadhaar_number}</div>}
                        </div>
                        <div className="col-md-6 mb-3">
                          <label className="form-label fw-semibold">PAN Number</label>
                          <input
                            type="text"
                            name="pan_number"
                            className={`form-control text-uppercase ${newCustomerErrors.pan_number ? "is-invalid" : ""}`}
                            value={newCustomer.pan_number}
                            onChange={handleNewCustomerChange}
                          />
                          {newCustomerErrors.pan_number && <div className="invalid-feedback">{newCustomerErrors.pan_number}</div>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        disabled={creatingCustomer}
                        onClick={handleAddNewCustomer}
                      >
                        {creatingCustomer ? "Adding..." : "Add & Select Customer"}
                      </button>
                    </div>
                  </div>
                )}
                <div className="col-md-6">
                  <h5 className="mb-3 text-primary">Selling Agent</h5>
                  <div className="mb-3">
                    <label className="form-label">Select Agent</label>
                    <select
                      className={`form-control ${errors.agent_id ? "is-invalid" : ""}`}
                      value={agentId}
                      onChange={(e) => setAgentId(e.target.value)}
                      required
                    >
                      <option value="">Choose Agent...</option>
                      {agents.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.name} ({a.referralCode})
                        </option>
                      ))}
                    </select>
                    {errors.agent_id && <div className="invalid-feedback">{errors.agent_id}</div>}
                  </div>
                </div>
              </div>

              <hr />

              {/* Purchase Details (applicant personal info) */}
              <h5 className="mb-3 text-primary">Purchase Details</h5>
              <div className="row mb-4">
                <div className="col-md-4">
                  <div className="mb-3">
                    <label className="form-label">Father's / Husband's Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={fathersOrHusbandName}
                      onChange={(e) => setFathersOrHusbandName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label className="form-label">Gender</label>
                    <select className="form-select" value={gender} onChange={(e) => setGender(e.target.value)}>
                      <option value="">Select...</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label className="form-label">Marital Status</label>
                    <select
                      className="form-select"
                      value={maritalStatus}
                      onChange={(e) => setMaritalStatus(e.target.value)}
                    >
                      <option value="">Select...</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="mb-3">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-control" value={dob} onChange={(e) => setDob(e.target.value)} />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="mb-3">
                    <label className="form-label">Age</label>
                    <input
                      type="number"
                      className="form-control"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="mb-3">
                    <label className="form-label">Religion</label>
                    <input
                      type="text"
                      className="form-control"
                      value={religion}
                      onChange={(e) => setReligion(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="mb-3">
                    <label className="form-label">Nomination (Name)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={nominationName}
                      onChange={(e) => setNominationName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Nomination Relation</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Spouse, Son, Daughter"
                      value={nominationRelation}
                      onChange={(e) => setNominationRelation(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <hr />

              {/* Section 2: Property Selection */}
              <h5 className="mb-3 text-primary">Property Information</h5>
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Select Project</label>
                    <select
                      className="form-control"
                      value={projectId}
                      onChange={(e) => handleProjectChange(e.target.value)}
                      required
                    >
                      <option value="">Choose Project...</option>
                      {projects.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Select Plot</label>
                    <select
                      className={`form-control ${errors.plot_id ? "is-invalid" : ""}`}
                      value={plotId}
                      onChange={(e) => handlePlotChange(e.target.value)}
                      required
                      disabled={!projectId || plotsLoading}
                    >
                      <option value="">
                        {!projectId ? "Choose Project First..." : plotsLoading ? "Loading..." : "Select Plot..."}
                      </option>
                      {plots.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.plotNumber}
                        </option>
                      ))}
                    </select>
                    {errors.plot_id && <div className="invalid-feedback">{errors.plot_id}</div>}
                  </div>
                </div>
                {projectId && mapProject?.mapData?.imageUrl && (
                  <div className="col-12">
                    <label className="form-label d-block">Digital Map — available plot pe click karke select karo</label>
                    <div className="d-flex gap-3 mb-2 small">
                      <span><span className="d-inline-block me-1" style={{ width: 10, height: 10, background: "#10b981", borderRadius: 2 }}></span>Available</span>
                      <span><span className="d-inline-block me-1" style={{ width: 10, height: 10, background: "#f59e0b", borderRadius: 2 }}></span>Booked</span>
                      <span><span className="d-inline-block me-1" style={{ width: 10, height: 10, background: "#ef4444", borderRadius: 2 }}></span>Sold</span>
                    </div>
                    <div className="card border" style={{ maxHeight: 450, overflow: "auto" }}>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <img
                          ref={imgRef}
                          src={`${STORAGE_BASE}/storage/${mapProject.mapData.imageUrl}`}
                          alt="Project layout"
                          style={{ maxWidth: "100%", display: "block" }}
                          onLoad={(e) => setImgNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                        />
                        {imgNatural.w > 0 &&
                          mapPlots
                            .filter((p) => p.mapCoordinates?.latlngs)
                            .map((p) => {
                              const r = bookingLatLngsToRect(p.mapCoordinates.latlngs, imgNatural.w, imgNatural.h);
                              const scale = imgRef.current ? imgRef.current.clientWidth / imgNatural.w : 1;
                              const selectable = p.status === "available";
                              const isSelected = p._id === plotId;
                              return (
                                <div
                                  key={p._id}
                                  onClick={() => handleMapPlotClick(p)}
                                  title={`Plot #${p.plotNumber} — ${p.status}`}
                                  style={{
                                    position: "absolute",
                                    left: r.x * scale,
                                    top: r.y * scale,
                                    width: r.w * scale,
                                    height: r.h * scale,
                                    border: isSelected ? "2.5px solid #2563eb" : `1.5px solid ${bookingStatusColor(p.status)}`,
                                    background: isSelected ? "#2563eb55" : `${bookingStatusColor(p.status)}33`,
                                    cursor: selectable ? "pointer" : "not-allowed",
                                  }}
                                />
                              );
                            })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="row mb-4 bg-light p-3 rounded mx-0">
                <div className="col-md-3 text-center">
                  <p className="text-muted mb-1">Total Area</p>
                  <h4>{selectedPlot ? selectedPlot.area.toFixed(2) : "0.00"} sqft</h4>
                </div>
                <div className="col-md-3 text-center border-start border-end">
                  <p className="text-muted mb-1">Price per sqft</p>
                  <h4>{fmt(selectedPlot ? selectedPlot.rate : 0)}</h4>
                </div>
                <div className="col-md-3 text-center border-end">
                  <label className="text-muted mb-1 d-block">PLC (if any)</label>
                  <input
                    type="number"
                    className="form-control form-control-sm mx-auto text-center"
                    style={{ maxWidth: "140px" }}
                    value={plcAmount}
                    onChange={(e) => setPlcAmount(e.target.value)}
                  />
                </div>
                <div className="col-md-3 text-center">
                  <p className="text-primary-emphasis mb-1 fw-bold">Total Amount</p>
                  <h4 className="text-primary">{fmt(totalAmount)}</h4>
                </div>
              </div>

              <hr />

              {/* Mode of Payment (Token / DP / Installment breakup) */}
              <h5 className="mb-3 text-primary">Mode of Payment</h5>
              <div className="row mb-4">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Token Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={tokenDate}
                      onChange={(e) => setTokenDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Token Amount (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={tokenAmount}
                      onChange={(e) => setTokenAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">DP Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={dpDate}
                      onChange={(e) => setDpDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">DP Amount (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={dpAmount}
                      onChange={(e) => setDpAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Installment Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={installmentDate}
                      onChange={(e) => setInstallmentDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Installment Amount (₹)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={installmentAmount}
                      onChange={(e) => setInstallmentAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-12">
                  <div className="mb-3">
                    <label className="form-label">Any Specific Condition</label>
                    <input
                      type="text"
                      className="form-control"
                      value={specificCondition}
                      onChange={(e) => setSpecificCondition(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Proposer Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={proposerName}
                      onChange={(e) => setProposerName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <hr />

              {/* Section 3: Booking Details */}
              <h5 className="mb-3 text-primary">Booking &amp; EMI Details</h5>
              <div className="row mb-4">
                <div className="col-md-4">
                  <div className="mb-3">
                    <label className="form-label">Booking Deposit (₹)</label>
                    <input
                      type="number"
                      className={`form-control ${errors.booking_amount ? "is-invalid" : ""}`}
                      value={bookingAmount}
                      onChange={(e) => setBookingAmount(e.target.value)}
                      required
                    />
                    {errors.booking_amount && <div className="invalid-feedback">{errors.booking_amount}</div>}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label className="form-label">EMI Months</label>
                    <input
                      type="number"
                      className={`form-control ${errors.emi_months ? "is-invalid" : ""}`}
                      value={emiMonths}
                      onChange={(e) => setEmiMonths(e.target.value)}
                      required
                    />
                    {errors.emi_months && <div className="invalid-feedback">{errors.emi_months}</div>}
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="mb-3">
                    <label className="form-label">Payment Mode</label>
                    <select
                      className={`form-select ${errors.payment_mode ? "is-invalid" : ""}`}
                      value={paymentMode}
                      onChange={(e) => setPaymentMode(e.target.value)}
                      required
                    >
                      <option value="cash">Cash</option>
                      <option value="online">Online</option>
                      <option value="cheque">Cheque</option>
                    </select>
                    {errors.payment_mode && <div className="invalid-feedback">{errors.payment_mode}</div>}
                  </div>
                </div>

                {paymentMode === "online" && (
                  <div className="col-md-4">
                    <div className="mb-3">
                      <label className="form-label">Transaction ID</label>
                      <input
                        type="text"
                        className="form-control"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {paymentMode === "cheque" && (
                  <>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Cheque Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={chequeNumber}
                          onChange={(e) => setChequeNumber(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Bank Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={chequeBankName}
                          onChange={(e) => setChequeBankName(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {paymentMode === "cash" && (
                  <>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Payment Date</label>
                        <input
                          type="date"
                          className="form-control"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">Payment Time</label>
                        <input
                          type="time"
                          className="form-control"
                          value={paymentTime}
                          onChange={(e) => setPaymentTime(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="row mb-4 bg-info-subtle p-3 rounded mx-0">
                <div className="col-md-6 text-center border-end border-info-subtle">
                  <p className="text-muted mb-1">Remaining Balance</p>
                  <h4>{fmt(remaining)}</h4>
                </div>
                <div className="col-md-6 text-center">
                  <p className="text-info-emphasis mb-1 fw-bold">Monthly EMI</p>
                  <h4 className="text-info">{fmt(emi)}</h4>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Administrative Notes (Optional)</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="text-end border-top pt-3 mt-4">
                <Link to="/admin/bookings" className="btn btn-light me-2">
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                  {saving ? "Creating..." : "Create Booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookingCreate;