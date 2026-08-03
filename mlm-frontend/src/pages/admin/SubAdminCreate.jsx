import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../api/axios.js";

const PERMISSION_OPTIONS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "kyc", label: "KYC Verifications" },
  { key: "agents", label: "Agents" },
  { key: "referrals", label: "Referral Links" },
  { key: "projects", label: "Projects" },
  { key: "customers", label: "Customers" },
  { key: "leads", label: "Lead Engine" },
  { key: "bookings", label: "Bookings" },
  { key: "site_visits", label: "Site Visits" },
  { key: "installment_schedules", label: "Installment Schedules" },
  { key: "installment_dues", label: "Installment Dues" },
  { key: "emis", label: "Installments (EMI)" },
  { key: "reports", label: "Reports (Overview)" },
  { key: "reports_emi", label: "Reports — EMI Collections" },
  { key: "reports_commissions", label: "Reports — Commissions" },
  { key: "reports_agent_earnings", label: "Reports — Agent Earnings" },
  { key: "reports_project_sales", label: "Reports — Project Sales" },
  { key: "reports_payouts", label: "Reports — Payouts" },
  { key: "reports_date_range", label: "Reports — Date Range" },
  { key: "reports_month_end", label: "Reports — Month End" },
  { key: "reports_single_unit", label: "Reports — Single Unit" },
  { key: "reports_cancelled_bookings", label: "Reports — Cancelled Bookings" },
  { key: "reports_executive_tds", label: "Reports — Executive TDS" },
  { key: "withdrawals", label: "Withdrawals" },
  { key: "tickets", label: "Support Tickets" },
];

function SubAdminCreate() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const togglePermission = (key) => {
    setPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    api
      .post("/admin/sub-admins", {
        name,
        email,
        phone,
        password,
        password_confirmation: passwordConfirmation,
        permissions,
      })
      .then(() => navigate("/admin/sub-admins"))
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setErrors(err.response.data.errors);
        } else {
          alert(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="row">
      <div className="col-xl-6 col-lg-8 mx-auto">
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3">
            <h4 className="card-title mb-0">Create Sub Admin</h4>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className={`form-control ${errors.name ? "is-invalid" : ""}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className={`form-control ${errors.email ? "is-invalid" : ""}`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                {errors.email && <div className="invalid-feedback">{errors.email}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className={`form-control ${errors.phone ? "is-invalid" : ""}`}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  className={`form-control ${errors.password ? "is-invalid" : ""}`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {errors.password && <div className="invalid-feedback">{errors.password}</div>}
              </div>

              <div className="mb-3">
                <label className="form-label">Confirm Password</label>
                <input
                  type="password"
                  className={`form-control ${errors.password_confirmation ? "is-invalid" : ""}`}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                />
                {errors.password_confirmation && <div className="invalid-feedback">{errors.password_confirmation}</div>}
              </div>

              <div className="mb-3 border-top pt-3 mt-3">
                <label className="form-label">Module Access</label>
                <p className="text-muted small mb-2">
                  Select the panels this sub admin should be able to see and use. Unselected panels stay hidden and blocked.
                </p>
                <div className="row">
                  {PERMISSION_OPTIONS.map((opt) => (
                    <div className="col-md-6" key={opt.key}>
                      <div className="form-check mb-2">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={`perm-${opt.key}`}
                          checked={permissions.includes(opt.key)}
                          onChange={() => togglePermission(opt.key)}
                        />
                        <label className="form-check-label" htmlFor={`perm-${opt.key}`}>
                          {opt.label}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-end">
                <Link to="/admin/sub-admins" className="btn btn-light me-1">
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SubAdminCreate;
