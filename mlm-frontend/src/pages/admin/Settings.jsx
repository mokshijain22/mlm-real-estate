import { useEffect, useState } from "react";
import api from "../../api/axios.js";

const STORAGE_BASE = "http://localhost:5000";

function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [errors, setErrors] = useState({});

  const [siteTitle, setSiteTitle] = useState("");
  const [siteEmail, setSiteEmail] = useState("");
  const [sitePhone, setSitePhone] = useState("");
  const [siteCopyright, setSiteCopyright] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [siteLogo, setSiteLogo] = useState(null);
  const [existingLogo, setExistingLogo] = useState("");

  const [agentApprovalRequired, setAgentApprovalRequired] = useState(false);
  const [tdsPercentage, setTdsPercentage] = useState("");
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState("");

  const load = () => {
    setLoading(true);
    api
      .get("/admin/settings")
      .then((res) => {
        const s = res.data.settings || {};
        setSiteTitle(s.site_title || "");
        setSiteEmail(s.site_email || "");
        setSitePhone(s.site_phone || "");
        setSiteCopyright(s.site_copyright || "");
        setSiteAddress(s.site_address || "");
        setExistingLogo(s.site_logo || "");
        setAgentApprovalRequired(s.agent_approval_required == 1 || s.agent_approval_required === true);
        setTdsPercentage(s.tds_percentage ?? "");
        setMinWithdrawalAmount(s.min_withdrawal_amount ?? "");
      })
      .catch((err) => setError(err.response?.data?.message || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    setErrors({});

    const formData = new FormData();
    formData.append("agent_approval_required", agentApprovalRequired ? "1" : "0");
    formData.append("tds_percentage", tdsPercentage);
    formData.append("min_withdrawal_amount", minWithdrawalAmount);
    formData.append("site_title", siteTitle);
    formData.append("site_phone", sitePhone);
    formData.append("site_email", siteEmail);
    formData.append("site_address", siteAddress);
    formData.append("site_copyright", siteCopyright);
    if (siteLogo) formData.append("site_logo", siteLogo);

    api
      .patch("/admin/settings", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((res) => {
        setSuccess(res.data.message || "Settings updated successfully.");
        setSiteLogo(null);
        const s = res.data.settings || {};
        setExistingLogo(s.site_logo || "");
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

  if (loading) return <div className="text-center py-5">Loading...</div>;

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Section 0 - Business Settings */}
      <div className="card mb-4">
        <div className="card-header">
          <h4 className="card-title">Section 0 - Business Settings</h4>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="site_title" className="form-label">
                Site Title <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                id="site_title"
                className={`form-control ${errors.site_title ? "is-invalid" : ""}`}
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                required
              />
              {errors.site_title && <div className="invalid-feedback">{errors.site_title}</div>}
            </div>
            <div className="col-md-6">
              <label htmlFor="site_email" className="form-label">
                Site Email
              </label>
              <input
                type="email"
                id="site_email"
                className={`form-control ${errors.site_email ? "is-invalid" : ""}`}
                value={siteEmail}
                onChange={(e) => setSiteEmail(e.target.value)}
              />
              {errors.site_email && <div className="invalid-feedback">{errors.site_email}</div>}
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-md-6">
              <label htmlFor="site_phone" className="form-label">
                Site Phone
              </label>
              <input
                type="text"
                id="site_phone"
                className={`form-control ${errors.site_phone ? "is-invalid" : ""}`}
                value={sitePhone}
                onChange={(e) => setSitePhone(e.target.value)}
              />
              {errors.site_phone && <div className="invalid-feedback">{errors.site_phone}</div>}
            </div>
            <div className="col-md-6">
              <label htmlFor="site_copyright" className="form-label">
                Copyright Text
              </label>
              <input
                type="text"
                id="site_copyright"
                className={`form-control ${errors.site_copyright ? "is-invalid" : ""}`}
                value={siteCopyright}
                onChange={(e) => setSiteCopyright(e.target.value)}
              />
              {errors.site_copyright && <div className="invalid-feedback">{errors.site_copyright}</div>}
            </div>
          </div>

          <div className="row mb-3">
            <div className="col-12">
              <label htmlFor="site_address" className="form-label">
                Site Address
              </label>
              <textarea
                id="site_address"
                className={`form-control ${errors.site_address ? "is-invalid" : ""}`}
                rows="2"
                value={siteAddress}
                onChange={(e) => setSiteAddress(e.target.value)}
              />
              {errors.site_address && <div className="invalid-feedback">{errors.site_address}</div>}
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <label htmlFor="site_logo" className="form-label">
                Site Logo
              </label>
              {existingLogo && (
                <div className="mb-2">
                  <img
                    src={`${STORAGE_BASE}/storage/${existingLogo}`}
                    alt="Logo"
                    height="60"
                    className="border p-1 bg-light"
                  />
                </div>
              )}
              <input
                type="file"
                id="site_logo"
                className={`form-control ${errors.site_logo ? "is-invalid" : ""}`}
                onChange={(e) => setSiteLogo(e.target.files[0])}
              />
              <small className="text-muted">Accepted: JPG, PNG (max 2MB). Click "Save All Settings" after choosing a file.</small>
              {errors.site_logo && <div className="invalid-feedback">{errors.site_logo}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Section 1 - Agent Settings */}
      <div className="card mb-4">
        <div className="card-header">
          <h4 className="card-title">Section 1 - Agent Settings</h4>
        </div>
        <div className="card-body">
          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="agent_approval_required"
              checked={agentApprovalRequired}
              onChange={(e) => setAgentApprovalRequired(e.target.checked)}
            />
            <label className="form-check-label fw-bold" htmlFor="agent_approval_required">
              Agent Approval Required
            </label>
          </div>
          <p className="text-muted">When enabled, new agent registrations require admin approval before they can login</p>
        </div>
      </div>

      {/* Section 2 - Financial Settings */}
      <div className="card mb-4">
        <div className="card-header">
          <h4 className="card-title">Section 2 - Financial Settings</h4>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="tds_percentage" className="form-label">
                TDS Percentage (%) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                id="tds_percentage"
                step="0.01"
                className={`form-control ${errors.tds_percentage ? "is-invalid" : ""}`}
                value={tdsPercentage}
                onChange={(e) => setTdsPercentage(e.target.value)}
                required
              />
              <small className="text-muted">Deducted from withdrawal amount</small>
              {errors.tds_percentage && <div className="invalid-feedback">{errors.tds_percentage}</div>}
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="min_withdrawal_amount" className="form-label">
                Minimum Withdrawal Amount <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                id="min_withdrawal_amount"
                step="0.01"
                className={`form-control ${errors.min_withdrawal_amount ? "is-invalid" : ""}`}
                value={minWithdrawalAmount}
                onChange={(e) => setMinWithdrawalAmount(e.target.value)}
                required
              />
              <small className="text-muted">Minimum amount agent can withdraw</small>
              {errors.min_withdrawal_amount && <div className="invalid-feedback">{errors.min_withdrawal_amount}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <button type="submit" className="btn btn-primary w-100 py-2 fs-16 fw-bold" disabled={saving}>
          {saving ? "Saving..." : "Save All Settings"}
        </button>
      </div>
    </form>
  );
}

export default Settings;