import { useEffect, useState } from "react";
import api from "../../api/axios.js";

function emptyPlan(isFirst) {
  return {
    name: "",
    booking_amount: 21000,
    down_payment_percent: 0,
    is_default: isFirst,
    emi_percent: 1,
    emi_count: 12,
  };
}

function money(n) {
  return "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function PlanCard({ plan, index, onChange, onRemove, onMakeDefault }) {
  const emiTotal = (Number(plan.emi_percent) || 0) * (Number(plan.emi_count) || 0);
  const downPaymentPercent = Number(plan.down_payment_percent) || 0;
  const usedTotal = downPaymentPercent + emiTotal;
  const finalTotal = Math.max(100 - usedTotal, 0);
  const over100 = usedTotal > 100;

  function set(field, value) {
    onChange({ ...plan, [field]: value });
  }

  return (
    <div className="card bg-light border-0 mb-4">
      <div className="card-body">
        <div className="row g-3 mb-3">
          <div className="col-md-4">
            <label className="form-label">Plan name</label>
            <input type="text" className="form-control" value={plan.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Booking Amount (₹)</label>
            <input
              type="number"
              className="form-control"
              value={plan.booking_amount}
              onChange={(e) => set("booking_amount", Number(e.target.value) || 0)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Down Payment (% of plot price)</label>
            <div className="input-group">
              <input
                type="number"
                className="form-control"
                value={plan.down_payment_percent}
                onChange={(e) => set("down_payment_percent", Number(e.target.value) || 0)}
              />
              <span className="input-group-text">%</span>
            </div>
            <div className="form-text">Booking amount is already part of this % — don't add it separately.</div>
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
          <button type="button" className="btn btn-outline-danger btn-sm ms-auto" onClick={() => onRemove(index)}>
            Remove plan
          </button>
        </div>

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
            <label className="form-label small">Number of EMIs (months)</label>
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
            <div className="progress mb-2" style={{ height: 8 }}>
              <div className="progress-bar" style={{ width: `${downPaymentPercent}%`, backgroundColor: "#6366f1" }}></div>
              <div className="progress-bar" style={{ width: `${emiTotal}%`, backgroundColor: "#8b5cf6" }}></div>
              <div className="progress-bar bg-success" style={{ width: `${finalTotal}%` }}></div>
            </div>
            <div className="d-flex justify-content-between small flex-wrap gap-2">
              <span>
                <span style={{ color: "#6366f1" }}>●</span> Down payment <strong>{downPaymentPercent}%</strong>{" "}
                <span className="text-muted">(includes booking amount)</span>
              </span>
              <span>
                <span style={{ color: "#8b5cf6" }}>●</span> EMIs <strong>{emiTotal}%</strong>{" "}
                <span className="text-muted">
                  {plan.emi_percent}% × {plan.emi_count}
                </span>
              </span>
              <span>
                <span className="text-success">●</span> Final settlement (Registry) <strong>{finalTotal}%</strong>
              </span>
              <span className="fw-bold">= 100% of plot price</span>
            </div>
            {over100 && (
              <div className="text-danger small mt-2">
                Down payment% + EMI% × EMI count exceeds 100% — reduce one of them before saving.
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

  function mapFromApi(data) {
    return data.map((p) => ({
      name: p.name,
      booking_amount: p.bookingAmount,
      down_payment_percent: p.downPaymentPercent,
      is_default: p.isDefault,
      emi_percent: p.emiPercent,
      emi_count: p.emiCount,
    }));
  }

  useEffect(() => {
    if (!projectId) {
      setPlans([]);
      return;
    }
    setLoading(true);
    api
      .get(`/admin/projects/${projectId}/payment-plans`)
      .then((res) => setPlans(mapFromApi(res.data.data || [])))
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
        setPlans(mapFromApi(res.data.data || []));
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
            Booking amount (flat ₹) + down payment (% of plot price, includes the booking amount) + EMI% × EMI
            count. Registry (final settlement) is whatever's left — calculated automatically at booking time, not
            entered here. Admin can override every value while creating a booking. One plan is the Default
            (pre-selected at booking).
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