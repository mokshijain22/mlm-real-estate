import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import Topbar from "../components/agent/Topbar.jsx";
import Sidebar from "../components/agent/Sidebar.jsx";
import ThemeSettingsOffcanvas from "../components/admin/ThemeSettingsOffcanvas.jsx";
import api from "../api/axios.js";

// Only these routes are reachable until KYC is verified — mirrors Laravel's
// KycVerifiedMiddleware allowed-routes list.
const ALLOWED_BEFORE_KYC = ["/agent/dashboard", "/agent/kyc", "/agent/profile"];

function AgentLayout() {
  const [isKycVerified, setIsKycVerified] = useState(null); // null = loading
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api
      .get("/auth/profile")
      .then((res) => {
        const verified = !!res.data.user?.isKycVerified;
        setIsKycVerified(verified);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      })
      .catch(() => setIsKycVerified(false));
  }, []);

  useEffect(() => {
    if (isKycVerified === null) return; // still loading, don't redirect yet
    if (!isKycVerified && !ALLOWED_BEFORE_KYC.includes(location.pathname)) {
      navigate("/agent/dashboard", { replace: true });
    }
  }, [isKycVerified, location.pathname, navigate]);

  return (
    <div className="wrapper">
      <Topbar />
      <Sidebar isKycVerified={isKycVerified} />
      <div className="page-content" style={{ backgroundColor: "var(--bs-body-bg)" }}>
        <div className="container-fluid">
          <Outlet />
        </div>
      </div>
      <ThemeSettingsOffcanvas />
    </div>
  );
}

export default AgentLayout;