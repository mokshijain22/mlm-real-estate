import { useEffect, useState } from "react";
import api from "../../api/axios.js";

function money(n) {
  const num = Number(n) || 0;
  return "₹" + num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

const emptyForm = {
  name: "",
  rate: "",
  owner_minimum: "",
  status: "draft",
  sort_order: 0,
  date_range_enabled: false,
  date_from: "",
  date_to: "",
  plots_enabled: false,
  plots: [],
  sold_area_enabled: false,
  sold_area_sqft: "",
  first_n_enabled: false,
  first_n_count: "",
};

function PricingRules() {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [plots, setPlots] = useState([]);
  const [rules, setRules] = useState(null);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [actionLoading, setActionLoading] = useState(null);

  const [checkPlotId, setCheckPlotId] = useState("");
  const [checkDate, setCheckDate] = useState("");
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api
      .get("/admin/projects")
      .then((res) => {
        const list = res.data.projects || res.data.data || res.data || [];
        setProjects(list);
        if (list.length && !projectId) setProjectId(list[0]._id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadRules = () => {
    if (!projectId) return;
    api
      .get(`/admin/projects/${projectId}/pricing-rules`)
      .then((res) => setRules(res.data.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    if (!projectId) return;
    setRules(null);
    setCheckResult(null);
    loadRules();
    api
      .get(`/admin/projects/${projectId}/plots/available`)
      .then((res) => setPlots(res.data.data || res.data.plots || []))
      .catch(() => setPlots([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
  };

  const handleEdit = (rule) => {
    setEditingId(rule._id);
    setForm({
      name: rule.name || "",
      rate: rule.rate ?? "",
      owner_minimum: rule.ownerMinimum ?? "",
      status: rule.status || "draft",
      sort_order: rule.sortOrder ?? 0,
      date_range_enabled: !!rule.conditions?.dateRange?.enabled,
      date_from: rule.conditions?.dateRange?.from ? rule.conditions.dateRange.from.slice(0, 10) : "",
      date_to: rule.conditions?.dateRange?.to ? rule.conditions.dateRange.to.slice(0, 10) : "",
      plots_enabled: !!rule.conditions?.selectedPlots?.enabled,
      plots: rule.conditions?.selectedPlots?.plots || [],
      sold_area_enabled: !!rule.conditions?.soldAreaThreshold?.enabled,
      sold_area_sqft: rule.conditions?.soldAreaThreshold?.sqft ?? "",
      first_n_enabled: !!rule.conditions?.firstN?.enabled,
      first_n_count: rule.conditions?.firstN?.count ?? "",
    });
    setErrors({});
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const handleRemove = (rule) => {
    if (!window.confirm(`Remove rule "${rule.name}"?`)) return;
    setActionLoading(rule._id);
    api
      .delete(`/admin/projects/${projectId}/pricing-rules/${rule._id}`)
      .then(() => loadRules())
      .catch((err) => alert(err.response?.data?.message || err.message))
      .finally(() => setActionLoading(null));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setErrors({});

    const payload = {
      name: form.name,
      rate: form.rate,
      owner_minimum: form.owner_minimum,
      status: form.status,
      sort_order: form.sort_order,
      conditions: {
        date_range: { enabled: form.date_range_enabled, from: form.date_from || null, to: form.date_to || null },
        selected_plots: { enabled: form.plots_enabled, plots: form.plots },
        sold_area_threshold: { enabled: form.sold_area_enabled, sqft: form.sold_area_sqft },
        first_n: { enabled: form.first_n_enabled, count: form.first_n_count },
      },
    };

    const req = editingId
      ? api.put(`/admin/projects/${projectId}/pricing-rules/${editingId}`, payload)
      : api.post(`/admin/projects/${projectId}/pricing-rules`, payload);

    req
      .then(() => {
        resetForm();
        loadRules();
      })
      .catch((err) => {
        if (err.response?.status === 422) {
          setErrors(err.response.data.errors || {});
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setSaving(false));
  };

  const handleCheckPrice = () => {
    if (!projectId) return;
    setChecking(true);
    setCheckResult(null);
    api
      .get(`/admin/projects/${projectId}/pricing-rules/check-price`, {
        params: { plot_id: checkPlotId || undefined, date: checkDate || undefined },
      })
      .then((res) => setCheckResult(res.data.data))
      .catch((err) => alert(err.response?.data?.message || err.message))
      .finally(() => setChecking(false));
  };

  const togglePlotSelection = (plotId) => {
    setForm((f) => ({
      ...f,
      plots: f.plots.includes(plotId) ? f.plots.filter((id) => id !== plotId) : [...f.plots, plotId],
    }));
  };

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label">Project</label>
              <select className="form-select" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-8 text-md-end">
              <button type="button" className="btn btn-warning" onClick={handleCheckPrice} disabled={checking || !projectId}>
                <iconify-icon icon="solar:calculator-bold-duotone" className="align-middle me-1"></iconify-icon>
                {checking ? "Checking..." : "Check price"}
              </button>
            </div>
          </div>

          <div className="row g-3 mt-1">
            <div className="col-md-4">
              <label className="form-label small text-muted">Test plot (optional)</label>
              <select className="form-select form-select-sm" value={checkPlotId} onChange={(e) => setCheckPlotId(e.target.value)}>
                <option value="">— any plot —</option>
                {plots.map((pl) => (
                  <option key={pl._id} value={pl._id}>
                    {pl.plotNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small text-muted">Test date (optional)</label>
              <input type="date" className="form-control form-control-sm" value={checkDate} onChange={(e) => setCheckDate(e.target.value)} />
            </div>
          </div>

          {checkResult && (
            <div className="alert alert-info mt-3 mb-0">
              {checkResult.matchedRule ? (
                <>Matched rule: <strong>{checkResult.matchedRule}</strong> — </>
              ) : (
                <>No rule matched, using project default — </>
              )}
              Rate: <strong>{money(checkResult.rate)}/sqft</strong>, Owner min:{" "}
              <strong>{money(checkResult.ownerMinimum)}/sqft</strong>, Pool: <strong>{money(checkResult.pool)}/sqft</strong>
            </div>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <h4 className="card-title mb-0">Rules ({rules ? rules.length : 0})</h4>
        </div>
        <div className="card-body">
          {!rules ? (
            <div className="text-center py-4">Loading...</div>
          ) : rules.length === 0 ? (
            <div className="text-center text-muted py-4">No pricing rules for this project yet.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-centered table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Name</th>
                    <th>Rate</th>
                    <th>Owner Min</th>
                    <th>Pool</th>
                    <th>Conditions</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((r) => (
                    <tr key={r._id}>
                      <td>{r.name}</td>
                      <td>{money(r.rate)}</td>
                      <td>{money(r.ownerMinimum)}</td>
                      <td>{money(r.rate - r.ownerMinimum)}</td>
                      <td className="small text-muted">
                        {[
                          r.conditions?.dateRange?.enabled && "Date range",
                          r.conditions?.selectedPlots?.enabled && "Selected plots",
                          r.conditions?.soldAreaThreshold?.enabled && "Sold area",
                          r.conditions?.firstN?.enabled && "Early-bird",
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </td>
                      <td>
                        {r.status === "active" ? (
                          <span className="badge bg-success-subtle text-success">Active</span>
                        ) : (
                          <span className="badge bg-secondary-subtle text-secondary">Draft</span>
                        )}
                      </td>
                      <td>
                        <button className="btn btn-sm btn-soft-primary" onClick={() => handleEdit(r)}>
                          <iconify-icon icon="solar:pen-bold"></iconify-icon> Edit
                        </button>{" "}
                        <button
                          className="btn btn-sm btn-soft-danger ms-1"
                          disabled={actionLoading === r._id}
                          onClick={() => handleRemove(r)}
                        >
                          <iconify-icon icon="solar:trash-bin-trash-bold"></iconify-icon> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3">
          <h4 className="card-title mb-0">
            <iconify-icon icon="solar:add-circle-bold-duotone" className="align-middle me-1"></iconify-icon>
            {editingId ? "Edit rule" : "Create rule"}
          </h4>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Rule name *</label>
                <input
                  type="text"
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  placeholder="e.g. Festive Offer 2027"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label">Rule rate (₹/sq ft)</label>
                <input
                  type="number"
                  className={`form-control ${errors.rate ? "is-invalid" : ""}`}
                  placeholder="e.g. 2600"
                  value={form.rate}
                  onChange={(e) => setForm({ ...form, rate: e.target.value })}
                />
                {errors.rate && <div className="invalid-feedback">{errors.rate}</div>}
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label small text-uppercase text-muted">Conditions (optional — all enabled must match)</label>
              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="date_range_enabled"
                  checked={form.date_range_enabled}
                  onChange={(e) => setForm({ ...form, date_range_enabled: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="date_range_enabled">
                  Apply by date range
                </label>
              </div>
              {form.date_range_enabled && (
                <div className="row mt-2 mb-2 ms-4">
                  <div className="col-md-4">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={form.date_from}
                      onChange={(e) => setForm({ ...form, date_from: e.target.value })}
                    />
                  </div>
                  <div className="col-md-4">
                    <input
                      type="date"
                      className="form-control form-control-sm"
                      value={form.date_to}
                      onChange={(e) => setForm({ ...form, date_to: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="plots_enabled"
                  checked={form.plots_enabled}
                  onChange={(e) => setForm({ ...form, plots_enabled: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="plots_enabled">
                  Apply to selected plots (per-group owner min)
                </label>
              </div>
              {form.plots_enabled && (
                <div className="ms-4 mt-2 mb-2" style={{ maxHeight: 140, overflowY: "auto" }}>
                  {plots.length === 0 ? (
                    <div className="text-muted small">No available plots for this project.</div>
                  ) : (
                    plots.map((pl) => (
                      <div className="form-check" key={pl._id}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`plot_${pl._id}`}
                          checked={form.plots.includes(pl._id)}
                          onChange={() => togglePlotSelection(pl._id)}
                        />
                        <label className="form-check-label" htmlFor={`plot_${pl._id}`}>
                          {pl.plotNumber}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="sold_area_enabled"
                  checked={form.sold_area_enabled}
                  onChange={(e) => setForm({ ...form, sold_area_enabled: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="sold_area_enabled">
                  Apply after sold area reached
                </label>
              </div>
              {form.sold_area_enabled && (
                <div className="ms-4 mt-2 mb-2" style={{ maxWidth: 220 }}>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="Sqft threshold"
                    value={form.sold_area_sqft}
                    onChange={(e) => setForm({ ...form, sold_area_sqft: e.target.value })}
                  />
                </div>
              )}

              <div className="form-check">
                <input
                  type="checkbox"
                  className="form-check-input"
                  id="first_n_enabled"
                  checked={form.first_n_enabled}
                  onChange={(e) => setForm({ ...form, first_n_enabled: e.target.checked })}
                />
                <label className="form-check-label" htmlFor="first_n_enabled">
                  Apply to first N plots/units (early-bird)
                </label>
              </div>
              {form.first_n_enabled && (
                <div className="ms-4 mt-2 mb-2" style={{ maxWidth: 220 }}>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    placeholder="N"
                    value={form.first_n_count}
                    onChange={(e) => setForm({ ...form, first_n_count: e.target.value })}
                  />
                </div>
              )}
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">Owner Minimum Cap (₹/sq ft) *</label>
                <input
                  type="number"
                  className={`form-control ${errors.owner_minimum ? "is-invalid" : ""}`}
                  placeholder="e.g. 1800"
                  value={form.owner_minimum}
                  onChange={(e) => setForm({ ...form, owner_minimum: e.target.value })}
                  required
                />
                {errors.owner_minimum && <div className="invalid-feedback">{errors.owner_minimum}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label">Pool (rate − owner min)</label>
                <input
                  type="text"
                  className="form-control"
                  disabled
                  value={
                    form.rate !== "" && form.owner_minimum !== ""
                      ? money(Number(form.rate) - Number(form.owner_minimum)) + "/sqft"
                      : "—/sqft"
                  }
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label d-block">Status</label>
              <div className="btn-group" role="group">
                <button
                  type="button"
                  className={`btn ${form.status === "draft" ? "btn-secondary" : "btn-outline-secondary"}`}
                  onClick={() => setForm({ ...form, status: "draft" })}
                >
                  Draft
                </button>
                <button
                  type="button"
                  className={`btn ${form.status === "active" ? "btn-success" : "btn-outline-success"}`}
                  onClick={() => setForm({ ...form, status: "active" })}
                >
                  Active
                </button>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update rule" : "Create rule"}
              </button>
              {editingId && (
                <button type="button" className="btn btn-outline-secondary" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PricingRules;