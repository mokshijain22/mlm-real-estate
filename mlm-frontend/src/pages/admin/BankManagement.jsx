import { useEffect, useState } from "react";
import api from "../../api/axios.js";

const emptyForm = {
  name: "",
  account_holder_name: "",
  account_number: "",
  ifsc_code: "",
  branch: "",
  sort_order: 0,
  is_active: true,
};

function BankManagement() {
  const [banks, setBanks] = useState(null);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [actionLoading, setActionLoading] = useState(null);

  const load = () => {
    api
      .get("/admin/banks")
      .then((res) => setBanks(res.data.data))
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setErrors({});
  };

  const handleEdit = (bank) => {
    setEditingId(bank._id);
    setForm({
      name: bank.name || "",
      account_holder_name: bank.accountHolderName || "",
      account_number: bank.accountNumber || "",
      ifsc_code: bank.ifscCode || "",
      branch: bank.branch || "",
      sort_order: bank.sortOrder ?? 0,
      is_active: bank.isActive !== false,
    });
    setErrors({});
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  };

  const handleRemove = (bank) => {
    if (!window.confirm(`Remove ${bank.name}?`)) return;
    setActionLoading(bank._id);
    api
      .delete(`/admin/banks/${bank._id}`)
      .then(() => load())
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
      account_holder_name: form.account_holder_name,
      account_number: form.account_number,
      ifsc_code: form.ifsc_code,
      branch: form.branch,
      sort_order: form.sort_order,
      is_active: form.is_active,
    };

    const req = editingId
      ? api.put(`/admin/banks/${editingId}`, payload)
      : api.post("/admin/banks", payload);

    req
      .then(() => {
        resetForm();
        load();
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

  return (
    <div>
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white py-3">
          <h4 className="card-title mb-0">Company banks ({banks ? banks.length : 0})</h4>
        </div>
        <div className="card-body">
          {!banks ? (
            <div className="text-center py-4">Loading...</div>
          ) : banks.length === 0 ? (
            <div className="text-center text-muted py-4">No banks added yet.</div>
          ) : (
            banks.map((bank) => (
              <div
                key={bank._id}
                className="d-flex justify-content-between align-items-center border-start border-4 border-primary rounded p-3 mb-2 bg-light"
              >
                <div>
                  <div className="fw-bold">{bank.name}</div>
                  <div className="text-muted small">
                    {bank.accountHolderName || "—"}
                    {bank.accountNumber ? ` · A/c ${bank.accountNumber}` : ""}
                    {bank.ifscCode ? ` · ${bank.ifscCode}` : ""}
                    {bank.branch ? ` · ${bank.branch}` : ""}
                  </div>
                  {!bank.isActive && (
                    <span className="badge bg-danger-subtle text-danger mt-1">Inactive</span>
                  )}
                </div>
                <div>
                  <button className="btn btn-sm btn-soft-primary" onClick={() => handleEdit(bank)}>
                    <iconify-icon icon="solar:pen-bold"></iconify-icon> Edit
                  </button>{" "}
                  <button
                    className="btn btn-sm btn-soft-danger ms-1"
                    disabled={actionLoading === bank._id}
                    onClick={() => handleRemove(bank)}
                  >
                    <iconify-icon icon="solar:trash-bin-trash-bold"></iconify-icon> Remove
                  </button>
                </div>
              </div>
            ))
          )}
          {banks && banks.length > 0 && (
            <div className="text-muted small mt-2">Showing 1–{banks.length} of {banks.length} banks</div>
          )}
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white py-3">
          <h4 className="card-title mb-0">
            <iconify-icon icon="solar:add-circle-bold-duotone" className="align-middle me-1"></iconify-icon>
            {editingId ? "Edit bank" : "Add bank"}
          </h4>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">BANK NAME *</label>
                <input
                  type="text"
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  placeholder="e.g. HDFC — Crown City Collections"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>
              <div className="col-md-6">
                <label className="form-label">ACCOUNT HOLDER NAME</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Crown City Developers Pvt Ltd"
                  value={form.account_holder_name}
                  onChange={(e) => setForm({ ...form, account_holder_name: e.target.value })}
                />
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">ACCOUNT NUMBER</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional"
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">IFSC</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional"
                  value={form.ifsc_code}
                  onChange={(e) => setForm({ ...form, ifsc_code: e.target.value })}
                />
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">BRANCH</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional"
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">SORT ORDER</label>
                <input
                  type="number"
                  className="form-control"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
            </div>

            <div className="form-check mb-4">
              <input
                type="checkbox"
                className="form-check-input"
                id="is_active"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <label className="form-check-label" htmlFor="is_active">
                Active (show in payment forms)
              </label>
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update bank" : "Add bank"}
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

export default BankManagement;