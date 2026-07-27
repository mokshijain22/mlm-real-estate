import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios.js";

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("referral_code") || searchParams.get("ref") || "";
  const group = searchParams.get("rank") || searchParams.get("group") || "";

  const [referrerName, setReferrerName] = useState(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    pan_number: "",
    password: "",
    password_confirmation: "",
    terms: false,
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (!referralCode) return;
    api
      .get(`/auth/validate-referral/${referralCode}`)
      .then((res) => {
        if (res.data.valid) setReferrerName(res.data.agent_name);
      })
      .catch(() => {});
  }, [referralCode]);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", {
        ...form,
        referral_code: referralCode || undefined,
        group: group || undefined,
      });

      if (res.data.status === "pending") {
        setSuccessMsg(res.data.message);
        setTimeout(() => navigate("/login"), 2000);
        return;
      }

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/agent/kyc");
    } catch (err) {
      const errData = err.response?.data?.errors;
      if (errData) {
        setErrors(Object.values(errData));
      } else {
        setErrors([err.response?.data?.message || "Registration failed."]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="d-flex flex-column min-vh-100 p-3" style={{ backgroundColor: "var(--bs-body-bg)" }}>
      <div className="d-flex flex-column flex-grow-1">
        <div className="row h-100">
          <div className="col-xxl-7">
            <div className="row justify-content-center h-100">
              <div className="col-lg-7 py-lg-5">
                <div className="d-flex flex-column h-100 justify-content-center">
                  <div className="auth-logo mb-4">
                    <a href="/" className="logo-dark">
                      <span className="fw-bold fs-24">MLM Real Estate</span>
                    </a>
                    <a href="/" className="logo-light">
                      <span className="fw-bold fs-24 text-white">MLM Real Estate</span>
                    </a>
                  </div>

                  <h2 className="fw-bold fs-24">Create Account</h2>

                  <p className="text-muted mt-1 mb-4">
                    {referrerName
                      ? `You're joining via ${referrerName}'s referral link.`
                      : "Fill in your details to register as an agent."}
                  </p>

                  <div className="mb-5">
                    <form className="authentication-form" onSubmit={handleSubmit}>
                      {successMsg && <div className="alert alert-success mb-3">{successMsg}</div>}
                      {errors.length > 0 && (
                        <div className="alert alert-danger mb-3">
                          <ul className="mb-0">
                            {errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mb-3">
                        <label className="form-label" htmlFor="reg-name">
                          Full Name
                        </label>
                        <input
                          type="text"
                          id="reg-name"
                          name="name"
                          className="form-control"
                          placeholder="Enter your full name"
                          value={form.name}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label" htmlFor="reg-email">
                          Email
                        </label>
                        <input
                          type="email"
                          id="reg-email"
                          name="email"
                          className="form-control"
                          placeholder="Enter your email"
                          value={form.email}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label" htmlFor="reg-phone">
                          Phone
                        </label>
                        <input
                          type="text"
                          id="reg-phone"
                          name="phone"
                          className="form-control"
                          placeholder="10-15 digit phone number"
                          value={form.phone}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label" htmlFor="reg-pan">
                          PAN Number
                        </label>
                        <input
                          type="text"
                          id="reg-pan"
                          name="pan_number"
                          className="form-control text-uppercase"
                          placeholder="ABCDE1234F"
                          value={form.pan_number}
                          onChange={handleChange}
                          maxLength={10}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label" htmlFor="reg-password">
                          Password
                        </label>
                        <input
                          type="password"
                          id="reg-password"
                          name="password"
                          className="form-control"
                          placeholder="Minimum 8 characters"
                          value={form.password}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <label className="form-label" htmlFor="reg-password-confirm">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          id="reg-password-confirm"
                          name="password_confirmation"
                          className="form-control"
                          placeholder="Re-enter your password"
                          value={form.password_confirmation}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="mb-3">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="reg-terms"
                            name="terms"
                            checked={form.terms}
                            onChange={handleChange}
                            required
                          />
                          <label className="form-check-label" htmlFor="reg-terms">
                            I agree to the Terms &amp; Conditions
                          </label>
                        </div>
                      </div>

                      <div className="mb-1 text-center d-grid">
                        <button className="btn btn-soft-primary" type="submit" disabled={loading}>
                          {loading ? "Creating Account..." : "Create Account"}
                        </button>
                      </div>

                      <div className="text-center mt-3">
                        <p className="text-muted mb-0">
                          Already have an account? <a href="/login">Sign In</a>
                        </p>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xxl-5 d-none d-xxl-flex">
            <div className="card h-100 mb-0 overflow-hidden">
              <div className="d-flex flex-column h-100">
                <img src="/images/small/img-10.jpg" alt="" className="w-100 h-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;