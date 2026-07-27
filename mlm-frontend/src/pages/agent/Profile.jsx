import { useEffect, useState } from "react";
import api from "../../api/axios.js";

function Profile() {
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({ name: "", phone: "" });
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", new_password_confirmation: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [pwErrors, setPwErrors] = useState({});
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [pwSuccessMsg, setPwSuccessMsg] = useState(null);

  const load = () => {
    api
      .get("/auth/profile")
      .then((res) => {
        setUser(res.data.user);
        setForm({ name: res.data.user.name || "", phone: res.data.user.phone || "" });
      })
      .catch((err) => setError(err.response?.data?.message || err.message));
  };

  useEffect(() => {
    load();
  }, []);

  const handleInfoSubmit = (e) => {
    e.preventDefault();
    setSavingInfo(true);
    setFieldErrors({});
    setSuccessMsg(null);

    api
      .patch("/auth/profile", { name: form.name, phone: form.phone })
      .then((res) => {
        setSuccessMsg(res.data.message);
        load();
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setFieldErrors(err.response.data.errors);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setSavingInfo(false));
  };

  const handlePwSubmit = (e) => {
    e.preventDefault();
    setPwErrors({});
    setPwSuccessMsg(null);

    if (pwForm.new_password !== pwForm.new_password_confirmation) {
      setPwErrors({ new_password_confirmation: "Passwords do not match." });
      return;
    }

    setSavingPw(true);
    api
      .patch("/auth/profile", {
        name: user.name,
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      })
      .then((res) => {
        setPwSuccessMsg(res.data.message);
        setPwForm({ current_password: "", new_password: "", new_password_confirmation: "" });
      })
      .catch((err) => {
        if (err.response?.status === 422 && err.response.data.errors) {
          setPwErrors(err.response.data.errors);
        } else {
          setError(err.response?.data?.message || err.message);
        }
      })
      .finally(() => setSavingPw(false));
  };

  if (error) return <div className="alert alert-danger border-0 shadow-sm">{error}</div>;
  if (!user) return <div className="text-center py-5">Loading...</div>;

  return (
    <div className="row justify-content-center">
      <div className="col-xl-8">
        <h4 className="fw-bold mb-1">My Profile</h4>
        <p className="text-muted mb-4 fs-13">Manage your account information.</p>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-4">
            <div className="row mb-3">
              <div className="col-md-4">
                <small className="text-muted d-block">Referral Code</small>
                <span className="fw-semibold">{user.referralCode}</span>
              </div>
              <div className="col-md-4">
                <small className="text-muted d-block">Rank</small>
                <span className="fw-semibold">{user.rank?.name || "Unranked"}</span>
              </div>
              <div className="col-md-4">
                <small className="text-muted d-block">KYC Status</small>
                <span className={`badge bg-${user.isKycVerified ? "success" : "warning"}-subtle text-${user.isKycVerified ? "success" : "warning"}`}>
                  {user.isKycVerified ? "Verified" : "Not Verified"}
                </span>
              </div>
            </div>

            {successMsg && <div className="alert alert-success border-0 py-2">{successMsg}</div>}

            <form onSubmit={handleInfoSubmit}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Name</label>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors.name ? "is-invalid" : ""}`}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  {fieldErrors.name && <div className="invalid-feedback">{fieldErrors.name}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Phone</label>
                  <input
                    type="text"
                    className={`form-control ${fieldErrors.phone ? "is-invalid" : ""}`}
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                  {fieldErrors.phone && <div className="invalid-feedback">{fieldErrors.phone}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-semibold">Email</label>
                  <input type="email" className="form-control" value={user.email} disabled />
                  <small className="text-muted">Email cannot be changed.</small>
                </div>
              </div>
              <button type="submit" className="btn btn-primary fw-bold" disabled={savingInfo}>
                {savingInfo ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </div>
        </div>

        <div className="card border-0 shadow-sm">
          <div className="card-body p-4">
            <h6 className="fw-bold mb-3">Change Password</h6>
            {pwSuccessMsg && <div className="alert alert-success border-0 py-2">{pwSuccessMsg}</div>}
            <form onSubmit={handlePwSubmit}>
              <div className="row">
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">Current Password</label>
                  <input
                    type="password"
                    className={`form-control ${pwErrors.current_password ? "is-invalid" : ""}`}
                    value={pwForm.current_password}
                    onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
                  />
                  {pwErrors.current_password && <div className="invalid-feedback">{pwErrors.current_password}</div>}
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">New Password</label>
                  <input
                    type="password"
                    className={`form-control ${pwErrors.new_password ? "is-invalid" : ""}`}
                    value={pwForm.new_password}
                    onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
                  />
                  {pwErrors.new_password && <div className="invalid-feedback">{pwErrors.new_password}</div>}
                </div>
                <div className="col-md-4 mb-3">
                  <label className="form-label fw-semibold">Confirm New Password</label>
                  <input
                    type="password"
                    className={`form-control ${pwErrors.new_password_confirmation ? "is-invalid" : ""}`}
                    value={pwForm.new_password_confirmation}
                    onChange={(e) => setPwForm({ ...pwForm, new_password_confirmation: e.target.value })}
                  />
                  {pwErrors.new_password_confirmation && (
                    <div className="invalid-feedback">{pwErrors.new_password_confirmation}</div>
                  )}
                </div>
              </div>
              <button type="submit" className="btn btn-primary fw-bold" disabled={savingPw}>
                {savingPw ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;