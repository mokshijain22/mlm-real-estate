import { useEffect, useState } from "react";
import api from "../../api/axios.js";

function emptyPlan(isFirst) {
  return {
    name: "",
    booking_amount: 21000,
    editable_at_booking: false,
    is_default: isFirst,
    plc_enabled: false,
    plc_options: [],
    down_payment_stages: [],
    emi_percent: 1,
    emi_count: 12,
  };
}

function money(n) {
  return "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function PlanCard({ plan, index, onChange, onRemove, onMakeDefault }) {
  const dpTotal = plan.down_payment_stages.reduce((s, st) => s + (Number(st.percent) || 0), 0);
  const emiTotal = (Number(plan.emi_percent) || 0) * (Number(plan.emi_count) || 0);
  const finalTotal = Math.max(100 - dpTotal - emiTotal, 0);
  const over100 = dpTotal + emiTotal > 100;

  function set(field, value) {
    onChange({ ...plan, [field]: value });
  }
  function setPlcOption(i, field, value) {
    const opts = plan.plc_options.map((o, idx) => (idx === i ? { ...o, [field]: value } : o));
    set("plc_options", opts);
  }
  function addPlcOption() {
    set("plc_options", [...plan.plc_options, { label: "", percent: 0 }]);
  }
  function removePlcOption(i) {
    set("plc_options", plan.plc_options.filter((_, idx) => idx !== i));
  }
  function setStage(i, field, value) {
    const stages = plan.down_payment_stages.map((s, idx) => (idx === i ? { ...s, [field]: value } : s));
    set("down_payment_stages", stages);
  }
  function addStage() {
    set("down_payment_stages", [...plan.down_payment_stages, { label: "", percent: 0 }]);
  }
  function removeStage(i) {
    set("down_payment_stages", plan.down_payment_stages.filter((_, idx) => idx !== i));
  }

  return (
    <div className="card bg-light border-0 mb-4">
      <div className="card-body">
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label">Plan name</label>
            <input type="text" className="form-control" value={plan.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="col-md-6">
            <label className="form-label">Booking Amount (₹)</label>
            <input
              type="number"
              className="form-control"
              value={plan.booking_amount}
              onChange={(e) => set("booking_amount", Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="d-flex align-items-center gap-4 mb-3 flex-wrap">
          <div className="form-check">
            <input
              className="form-check-input"
              type="radio"
              name="defaultPlan"
              checked={plan.is_default}
              onChange={() => onMakeDefault(index)}
              id={`default-${index}`}
            />
            <label className="form-check-label" htmlFor={`default-${index}`}>
              Default plan
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={plan.editable_at_booking}
              onChange={(e) => set("editable_at_booking", e.target.checked)}
              id={`editable-${index}`}
            />
            <label className="form-check-label" htmlFor={`editable-${index}`}>
              Booking amount editable at booking
            </label>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              checked={plan.plc_enabled}
              onChange={(e) => set("plc_enabled", e.target.checked)}
              id={`plc-${index}`}
            />
            <label className="form-check-label" htmlFor={`plc-${index}`}>
              PLC enabled
            </label>
          </div>
          <button type="button" className="btn btn-outline-danger btn-sm ms-auto" onClick={() => onRemove(index)}>
            Remove plan
          </button>
        </div>

        {plan.plc_enabled && (
          <>
            <label className="form-label small text-uppercase text-muted">
              PLC Options — % added to the ₹/sqft rate → raises selling price
            </label>
            <div className="row g-2 text-muted small mb-1">
              <div className="col-md-9">LABEL</div>
              <div className="col-md-3">PERCENT (%)</div>
            </div>
            {plan.plc_options.map((o, i) => (
              <div key={i} className="row g-2 mb-2 align-items-center">
                <div className="col-md-9">
                  <input
                    type="text"
                    className="form-control"
                    value={o.label}
                    onChange={(e) => setPlcOption(i, "label", e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-control"
                      value={o.percent}
                      onChange={(e) => setPlcOption(i, "percent", Number(e.target.value) || 0)}
                    />
                    <span className="input-group-text">%</span>
                  </div>
                </div>
                <div className="col-md-1">
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removePlcOption(i)}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
            <button type="button" className="btn btn-light btn-sm mb-3" onClick={addPlcOption}>
              + Add PLC option
            </button>
          </>
        )}

        <label className="form-label small text-uppercase text-muted">Down Payment Stages — % of selling price</label>
        <div className="row g-2 text-muted small mb-1">
          <div className="col-md-9">LABEL</div>
          <div className="col-md-3">PERCENT (%)</div>
        </div>
        {plan.down_payment_stages.map((s, i) => (
          <div key={i} className="row g-2 mb-2 align-items-center">
            <div className="col-md-9">
              <input type="text" className="form-control" value={s.label} onChange={(e) => setStage(i, "label", e.target.value)} />
            </div>
            <div className="col-md-2">
              <div className="input-group">
                <input
                  type="number"
                  className="form-control"
                  value={s.percent}
                  onChange={(e) => setStage(i, "percent", Number(e.target.value) || 0)}
                />
                <span className="input-group-text">%</span>
              </div>
            </div>
            <div className="col-md-1">
              <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeStage(i)}>
                ✕
              </button>
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-light btn-sm mb-3" onClick={addStage}>
          + Add stage
        </button>

        <label className="form-label small text-uppercase text-muted">EMIs — each = % of plot price, repeated N times</label>
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <label className="form-label small">EMI % (each, of plot price)</label>
            <div className="input-group">
              <input
                type="number"
                className="form-control"
                value={plan.emi_percent}
                onChange={(e) => set("emi_percent", Number(e.target.value) || 0)}
              />
              <span className="input-group-text">%</span>
            </div>
          </div>
          <div className="col-md-4">
            <label className="form-label small">Number of EMIs</label>
            <input
              type="number"
              className="form-control"
              value={plan.emi_count}
              onChange={(e) => set("emi_count", parseInt(e.target.value, 10) || 0)}
            />
          </div>
        </div>

        <div className="card border-0 bg-white">
          <div className="card-body py-3">
            {plan.plc_enabled && plan.plc_options.length > 0 && (
              <p className="small mb-2">
                Final token:{" "}
                {plan.plc_options
                  .filter((o) => o.label)
                  .map((o) => `${o.label} ${money(plan.booking_amount * (1 + (Number(o.percent) || 0) / 100))}`)
                  .join(" · ")}
                {plan.plc_options.some((o) => Number(o.percent) === 0) ? "" : ` · ${money(plan.booking_amount)}`}
              </p>
            )}
            <div className="progress mb-2" style={{ height: 8 }}>
              <div className="progress-bar bg-primary" style={{ width: `${dpTotal}%` }}></div>
              <div className="progress-bar bg-purple" style={{ width: `${emiTotal}%`, backgroundColor: "#8b5cf6" }}></div>
              <div className="progress-bar bg-success" style={{ width: `${finalTotal}%` }}></div>
            </div>
            <div className="d-flex justify-content-between small flex-wrap gap-2">
              <span>
                <span className="text-primary">●</span> Down payment <strong>{dpTotal}%</strong>{" "}
                <span className="text-muted">incl. booking + PLC</span>
              </span>
              <span>
                <span style={{ color: "#8b5cf6" }}>●</span> EMIs <strong>{emiTotal}%</strong>{" "}
                <span className="text-muted">
                  {plan.emi_percent}% × {plan.emi_count}
                </span>
              </span>
              <span>
                <span className="text-success">●</span> Final settlement <strong>{finalTotal}%</strong>{" "}
                <span className="text-muted">at registry</span>
              </span>
              <span className="fw-bold">= 100% of plot price</span>
            </div>
            {over100 && (
              <div className="text-danger small mt-2">
                Down payment + EMIs exceed 100% — reduce a stage or EMI count before saving.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InstallmentSchedules() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get("/admin/projects")
      .then((res) => setProjects(res.data.projects || res.data.data || res.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!projectId) {
      setPlans([]);
      return;
    }
    setLoading(true);
    api
      .get(`/admin/projects/${projectId}/payment-plans`)
      .then((res) => {
        const data = res.data.data || [];
        setPlans(
          data.map((p) => ({
            name: p.name,
            booking_amount: p.bookingAmount,
            editable_at_booking: p.editableAtBooking,
            is_default: p.isDefault,
            plc_enabled: p.plcEnabled,
            plc_options: p.plcOptions || [],
            down_payment_stages: p.downPaymentStages || [],
            emi_percent: p.emiPercent,
            emi_count: p.emiCount,
          }))
        );
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  function updatePlan(i, updated) {
    setPlans((ps) => ps.map((p, idx) => (idx === i ? updated : p)));
  }
  function removePlan(i) {
    setPlans((ps) => ps.filter((_, idx) => idx !== i));
  }
  function makeDefault(i) {
    setPlans((ps) => ps.map((p, idx) => ({ ...p, is_default: idx === i })));
  }
  function addPlan() {
    setPlans((ps) => [...ps, emptyPlan(ps.length === 0)]);
  }

  function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);
    api
      .put(`/admin/projects/${projectId}/payment-plans`, { plans })
      .then((res) => {
        setMessage(res.data.message || "Saved.");
        const data = res.data.data || [];
        setPlans(
          data.map((p) => ({
            name: p.name,
            booking_amount: p.bookingAmount,
            editable_at_booking: p.editableAtBooking,
            is_default: p.isDefault,
            plc_enabled: p.plcEnabled,
            plc_options: p.plcOptions || [],
            down_payment_stages: p.downPaymentStages || [],
            emi_percent: p.emiPercent,
            emi_count: p.emiCount,
          }))
        );
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setSaving(false));
  }

  return (
    <div className="card border-0 shadow-sm">
      <div className="card-header bg-white py-3">
        <h4 className="card-title mb-0">Payment Plans</h4>
      </div>

      <div className="card-body border-bottom">
        <label className="form-label">Project</label>
        <select className="form-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Select a project</option>
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {projectId && (
        <div className="card-body">
          <p className="text-muted small mb-4">
            Named Deposit/EMI plans for this project. One is the Default (pre-selected at booking). Removing all
            plans reverts this project to the legacy installment templates.
          </p>

          {message && <div className="alert alert-success">{message}</div>}
          {error && <div className="alert alert-danger">{error}</div>}

          {loading ? (
            <div className="text-muted">Loading…</div>
          ) : (
            <>
              {plans.map((plan, i) => (
                <PlanCard
                  key={i}
                  plan={plan}
                  index={i}
                  onChange={(updated) => updatePlan(i, updated)}
                  onRemove={removePlan}
                  onMakeDefault={makeDefault}
                />
              ))}

              <button type="button" className="btn btn-light mb-3" onClick={addPlan}>
                + Add payment plan
              </button>
              <div>
                <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Save payment plans"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default InstallmentSchedules;