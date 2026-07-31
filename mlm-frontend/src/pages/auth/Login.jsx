import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios.js";
import "./new-login.css";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logo, setLogo] = useState(null);

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

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate(res.data.redirect || "/");
    } catch (err) {
      const errData = err.response?.data?.errors;
      if (errData) {
        setErrors(Object.values(errData));
      } else {
        setErrors([err.response?.data?.message || "Login failed."]);
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
            <h1 className="new-login-hero-greeting">Welcome Back</h1>
            <h1 className="new-login-hero-title">
              Let&apos;s Find Your <span className="text-accent">Dream</span> Property
            </h1>
            <p className="new-login-hero-sub">
              Premium properties. Trusted deals. Seamless experience.
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
        <div className="new-login-card">
          <div className="new-login-card-header">
            <div>
              <h2 className="new-login-card-title">Sign In</h2>
              <p className="new-login-card-sub">Welcome back! Please sign in to continue</p>
            </div>
            <div className="new-login-card-icon">
              <iconify-icon icon="solar:buildings-3-bold-duotone"></iconify-icon>
            </div>
          </div>

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
              <label className="new-login-label">Email Address</label>
              <div className="new-login-input-wrap">
                <iconify-icon icon="solar:letter-linear" className="new-login-input-icon"></iconify-icon>
                <input
                  type="email"
                  className="new-login-input"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  className="new-login-input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="new-login-row">
              <div className="new-login-remember">
                <input
                  type="checkbox"
                  id="checkbox-signin"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <label htmlFor="checkbox-signin">Remember me</label>
              </div>
              <a href="/forgot-password" className="new-login-forgot">
                Forgot Password?
              </a>
            </div>

            <button className="new-login-submit" type="submit" disabled={loading}>
              {loading ? "Signing In..." : "Sign In"}
              <iconify-icon icon="solar:arrow-right-linear"></iconify-icon>
            </button>
          </form>

          <div className="new-login-divider">
            <span>or continue with</span>
          </div>

          <button type="button" className="new-login-social">
            <iconify-icon icon="flat-color-icons:google"></iconify-icon>
            Continue with Google
          </button>
          <button type="button" className="new-login-social">
            <iconify-icon icon="ic:baseline-apple"></iconify-icon>
            Continue with Apple
          </button>

          <p className="new-login-signup">
            Don&apos;t have an account? <a href="/register">Sign up here</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;