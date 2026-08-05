import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios.js";
import { getStoredUser } from "../../utils/userHelpers.js";

const emptyForm = { name: "", email: "", phone: "", password: "", pan_or_aadhaar: "", referral_code: "" };

function AgentCreate() {
  const navigate = useNavigate();
  const currentUser = getStoredUser({});
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setError(null);

    api
      .post("/admin/agents", form)
      .then((res) => {
        if (currentUser.role === "super_admin") {
          navigate("/admin/referrals");
          return;
        }

        navigate(`/admin/agents/${res.data.data._id}`);
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setFieldErrors(err.response.data.errors);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="row justify-content-center">
      <div className="col-xl-7">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="fw-bold mb-0">Add Executive</h4>
          <Link to="/admin/agents" className="btn btn-outline-secondary fw-bold">Back to Executives</Link>
        </div>

        {error && <div className="alert alert-danger border-0 shadow-sm">{error}</div>}

        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <form onSubmit={handleSubmit} noValidate>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Name *</label>
                  <input
                    type="text"
                    name="name"
                    className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
                    value={form.name}
                    onChange={handleChange}
                  />
                  {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Phone *</label>
                  <input
                    type="text"
                    name="phone"
                    className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`}
                    value={form.phone}
                    onChange={handleChange}
                  />
                  {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Email *</label>
                  <input
                    type="email"
                    name="email"
                    className={`form-control ${fieldErrors.email ? "is-invalid" : ""}`}
                    value={form.email}
                    onChange={handleChange}
                  />
                  {fieldErrors.email && <div className="invalid-feedback">{fieldErrors.email}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Password *</label>
                  <input
                    type="password"
                    name="password"
                    className={`form-control ${fieldErrors.password ? "is-invalid" : ""}`}
                    value={form.password}
                    onChange={handleChange}
                  />
                  {fieldErrors.password && <div className="invalid-feedback">{fieldErrors.password}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">PAN or Aadhaar *</label>
                  <input
                    type="text"
                    name="pan_or_aadhaar"
                    placeholder="PAN (ABCDE1234F) or Aadhaar (12 digits)"
                    className={`form-control ${fieldErrors.pan_or_aadhaar ? "is-invalid" : ""}`}
                    value={form.pan_or_aadhaar}
                    onChange={handleChange}
                  />
                  {fieldErrors.pan_or_aadhaar && <div className="invalid-feedback">{fieldErrors.pan_or_aadhaar}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Upline Referral Code</label>
                  <input
                    type="text"
                    name="referral_code"
                    placeholder="Leave blank for default top agent"
                    className="form-control"
                    value={form.referral_code}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary fw-bold" disabled={submitting}>
                {submitting ? "Creating..." : "Create Executive"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentCreate;