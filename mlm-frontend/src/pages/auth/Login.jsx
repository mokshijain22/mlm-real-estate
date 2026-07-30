import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios.js";

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
    <div className="d-flex flex-column min-vh-100 p-3" style={{ backgroundColor: "var(--bs-body-bg)" }}>
      <div className="d-flex flex-column flex-grow-1">
        <div className="row h-100">
          <div className="col-xxl-7">
            <div className="row justify-content-center h-100">
              <div className="col-lg-6 py-lg-5">
                <div className="d-flex flex-column h-100 justify-content-center">
                  <div className="auth-logo mb-4">
                    {logo ? (
                      <a href="/">
                        <img src={logo} alt="Logo" style={{ maxHeight: "40px" }} />
                      </a>
                    ) : (
                      <>
                        <a href="/" className="logo-dark">
                          <span className="fw-bold fs-24">MLM Real Estate</span>
                        </a>
                        <a href="/" className="logo-light">
                          <span className="fw-bold fs-24 text-white">MLM Real Estate</span>
                        </a>
                      </>
                    )}
                  </div>

                  <h2 className="fw-bold fs-24">Sign In</h2>

                  <p className="text-muted mt-1 mb-4">Enter your email address and password to access panel.</p>

                  <div className="mb-5">
                    <form className="authentication-form" onSubmit={handleSubmit}>
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
                        <label className="form-label" htmlFor="example-email">
                          Email
                        </label>
                        <input
                          type="email"
                          id="example-email"
                          className="form-control"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label" htmlFor="example-password">
                          Password
                        </label>
                        <input
                          type="password"
                          id="example-password"
                          className="form-control"
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                        />
                      </div>
                      <div className="mb-3">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            id="checkbox-signin"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                          />
                          <label className="form-check-label" htmlFor="checkbox-signin">
                            Remember me
                          </label>
                        </div>
                      </div>

                      <div className="mb-1 text-center d-grid">
                        <button className="btn btn-soft-primary" type="submit" disabled={loading}>
                          {loading ? "Signing In..." : "Sign In"}
                        </button>
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

export default Login;