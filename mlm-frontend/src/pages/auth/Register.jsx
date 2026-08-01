import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios.js";
import "./new-login.css";

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("referral_code") || searchParams.get("ref") || "";
  const group = searchParams.get("rank") || searchParams.get("group") || "";

  const [referrerName, setReferrerName] = useState(null);
  const [refValid, setRefValid] = useState(null); // null = not checked, true = valid, false = invalid
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    pan_or_aadhaar: "",
    password: "",
    password_confirmation: "",
    terms: false,
  });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    if (!referralCode) return;
    api
      .get(`/auth/validate-referral/${referralCode}`)
      .then((res) => {
        if (res.data.valid) {
          setReferrerName(res.data.agent_name);
          setRefValid(true);
        } else {
          setRefValid(false);
        }
      })
      .catch(() => setRefValid(false));
  }, [referralCode]);

  useEffect(() => {
    api
      .get("/auth/settings/public")
      .then((res) => {
        if (res.data.site_logo) {
          setLogo(`http://localhost:5000/storage/${res.data.site_logo}`);
        }
      })
      .catch(() => {});
  }, []);

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
    <div className="new-login-page">
      {/* LEFT SIDE — video background */}
      <div className="new-login-left d-none d-lg-flex">
        <video
          className="new-login-video"
          src="/videos/login-bg.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="new-login-overlay"></div>

        <div className="new-login-left-content">
          <div className="new-login-logo">
            {logo ? (
              <img src={logo} alt="Logo" style={{ maxHeight: "40px" }} />
            ) : (
              <>
                <div className="new-login-logo-icon">
                  <iconify-icon icon="solar:buildings-2-bold"></iconify-icon>
                </div>
                <div>
                  <div className="new-login-logo-text">MLM REAL ESTATE</div>
                  <div className="new-login-logo-tagline">FIND • INVEST • GROW</div>
                </div>
              </>
            )}
          </div>

          <div className="new-login-hero">
            <h1 className="new-login-hero-greeting">Join Us Today</h1>
            <h1 className="new-login-hero-title">
              Start Your <span className="text-accent">Real Estate</span> Journey
            </h1>
            <p className="new-login-hero-sub">
              {referrerName
                ? `You're joining via ${referrerName}'s referral link.`
                : "Create your agent account and grow with us."}
            </p>

            <div className="new-login-features">
              <div className="new-login-feature">
                <div className="new-login-feature-icon">
                  <iconify-icon icon="solar:home-2-bold"></iconify-icon>
                </div>
                <div>
                  <div className="new-login-feature-title">Verified Properties</div>
                  <div className="new-login-feature-sub">100% verified &amp; trusted listings</div>
                </div>
              </div>
              <div className="new-login-feature">
                <div className="new-login-feature-icon">
                  <iconify-icon icon="solar:hand-shake-bold"></iconify-icon>
                </div>
                <div>
                  <div className="new-login-feature-title">Best Deals</div>
                  <div className="new-login-feature-sub">Exclusive offers for you</div>
                </div>
              </div>
              <div className="new-login-feature">
                <div className="new-login-feature-icon">
                  <iconify-icon icon="solar:shield-check-bold"></iconify-icon>
                </div>
                <div>
                  <div className="new-login-feature-title">Secure &amp; Private</div>
                  <div className="new-login-feature-sub">Your data is safe with us</div>
                </div>
              </div>
            </div>
          </div>

          <div className="new-login-trust">
            <iconify-icon icon="solar:shield-check-bold"></iconify-icon>
            <span>Trusted by 10,000+ users across India</span>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE — form */}
      <div className="new-login-right">
        <div className="new-login-card new-register-card">
          <div className="new-login-card-header">
            <div>
              <h2 className="new-login-card-title">Create Account</h2>
              <p className="new-login-card-sub">
                {referrerName
                  ? `Joining via ${referrerName}'s referral link`
                  : "Register as an agent to get started"}
              </p>
            </div>
            <div className="new-login-card-icon">
              <iconify-icon icon="solar:buildings-3-bold-duotone"></iconify-icon>
            </div>
          </div>

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

          <form onSubmit={handleSubmit}>
            <div className="new-login-field">
              <label className="new-login-label">Full Name</label>
              <div className="new-login-input-wrap">
                <iconify-icon icon="solar:user-linear" className="new-login-input-icon"></iconify-icon>
                <input
                  type="text"
                  name="name"
                  className="new-login-input"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="new-login-field">
              <label className="new-login-label">Email Address</label>
              <div className="new-login-input-wrap">
                <iconify-icon icon="solar:letter-linear" className="new-login-input-icon"></iconify-icon>
                <input
                  type="email"
                  name="email"
                  className="new-login-input"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="new-login-field">
              <label className="new-login-label">Phone</label>
              <div className="new-login-input-wrap">
                <iconify-icon icon="solar:phone-linear" className="new-login-input-icon"></iconify-icon>
                <input
                  type="text"
                  name="phone"
                  className="new-login-input"
                  placeholder="10-15 digit phone number"
                  value={form.phone}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

           <div className="new-login-field">
              <label className="new-login-label">PAN or Aadhaar Number</label>
              <div className="new-login-input-wrap">
                <iconify-icon icon="solar:document-text-linear" className="new-login-input-icon"></iconify-icon>
                <input
                  type="text"
                  name="pan_or_aadhaar"
                  className="new-login-input text-uppercase"
                  placeholder="PAN (ABCDE1234F) or Aadhaar (12 digits)"
                  value={form.pan_or_aadhaar}
                  onChange={handleChange}
                  maxLength={12}
                  required
                />
              </div>
            </div>

            <div className="new-login-field">
              <label className="new-login-label">Password</label>
              <div className="new-login-input-wrap">
                <iconify-icon icon="solar:lock-password-linear" className="new-login-input-icon"></iconify-icon>
                <input
                  type="password"
                  name="password"
                  className="new-login-input"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="new-login-field">
              <label className="new-login-label">Confirm Password</label>
              <div className="new-login-input-wrap">
                <iconify-icon icon="solar:lock-password-linear" className="new-login-input-icon"></iconify-icon>
                <input
                  type="password"
                  name="password_confirmation"
                  className="new-login-input"
                  placeholder="Re-enter your password"
                  value={form.password_confirmation}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            {referralCode && (
              <div className="new-login-field">
                <label className="new-login-label">Referral Code</label>
                <div className="new-login-input-wrap">
                  <iconify-icon icon="solar:link-linear" className="new-login-input-icon"></iconify-icon>
                  <input
                    type="text"
                    className="new-login-input"
                    value={referralCode}
                    readOnly
                  />
                </div>
                {refValid === true && (
                  <div className="mt-1 small" style={{ color: "#16a34a", fontWeight: 600 }}>
                    ✓ Valid Referral: {referrerName}
                  </div>
                )}
                {refValid === false && (
                  <div className="mt-1 small" style={{ color: "#dc2626", fontWeight: 600 }}>
                    ✗ Invalid or inactive referral code.
                  </div>
                )}
              </div>
            )}

            {group && (
              <div
                className="alert alert-info py-2 px-3 small mb-3"
                style={{ borderRadius: 8 }}
              >
                You're joining the <strong>{group}</strong> group.
              </div>
            )}

            <div className="new-login-row">
              <div className="new-login-remember">
                <input
                  type="checkbox"
                  id="reg-terms"
                  name="terms"
                  checked={form.terms}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="reg-terms">I agree to the Terms &amp; Conditions</label>
              </div>
            </div>

            <button className="new-login-submit" type="submit" disabled={loading || refValid === false}>
              {loading ? "Creating Account..." : "Create Account"}
              <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>
            </button>
          </form>

          <p className="new-login-signup">
            Already have an account? <a href="/login">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;