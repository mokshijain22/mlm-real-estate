import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import api from "../../api/axios.js";

const STORAGE_BASE = "http://localhost:5000";

function Sidebar({ isKycVerified }) {
  const [siteTitle, setSiteTitle] = useState("MLM Real Estate");
  const [siteLogo, setSiteLogo] = useState("");

  useEffect(() => {
    api
      .get("/auth/settings/public")
      .then((res) => {
        if (res.data?.site_title) setSiteTitle(res.data.site_title);
        if (res.data?.site_logo) setSiteLogo(res.data.site_logo);
      })
      .catch(() => {});
  }, []);
  function collapseSidebar() {
    document.documentElement.removeAttribute("data-menu-size");
  }

  function closeMobileSidebar() {
    document.documentElement.classList.remove("sidebar-enable");
  }

  return (
    <>
      <div
        className="menu-overlay"
        onClick={closeMobileSidebar}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1035,
          display: "none",
        }}
        id="mobile-sidebar-overlay"
      ></div>
    <div className="main-nav">
      <div className="logo-box">
        <a href="/" className="logo-dark">
          <span className="d-flex align-items-center gap-2">
            {siteLogo && (
              <img src={`${STORAGE_BASE}/storage/${siteLogo}`} alt="logo" style={{ height: 32, width: 32, objectFit: "contain" }} />
            )}
            <span className="fw-bold fs-24">{siteTitle}</span>
          </span>
        </a>
        <a href="/" className="logo-light">
          <span className="d-flex align-items-center gap-2">
            {siteLogo && (
              <img src={`${STORAGE_BASE}/storage/${siteLogo}`} alt="logo" style={{ height: 32, width: 32, objectFit: "contain" }} />
            )}
            <span className="fw-bold fs-24 text-white">{siteTitle}</span>
          </span>
        </a>
      </div>

      <button type="button" className="button-sm-hover" aria-label="Show Full Sidebar" onClick={collapseSidebar}>
        <iconify-icon icon="solar:double-alt-arrow-right-bold-duotone" className="button-sm-hover-icon"></iconify-icon>
      </button>

      <div className="scrollbar" data-simplebar>
        <ul className="navbar-nav" id="navbar-nav">
          <li className="menu-title mt-2">Main</li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/agent/dashboard">
              <span className="nav-icon">
                <iconify-icon icon="solar:widget-5-bold-duotone"></iconify-icon>
              </span>
              <span className="nav-text"> Dashboard </span>
            </NavLink>
          </li>

          {isKycVerified && (
            <>
              <li className="nav-item">
                <NavLink className="nav-link" to="/agent/projects">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:home-2-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> Projects </span>
                </NavLink>
              </li>

              <li className="menu-title mt-2">My Business</li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/agent/customers">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:users-group-two-rounded-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> My Customers </span>
                </NavLink>
              </li>
              
              <li className="nav-item">
                <NavLink className="nav-link" to="/agent/site-visits">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:map-point-wave-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> Site Visits </span>
                </NavLink>
              </li>

              <li className="menu-title mt-2">My Team</li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/agent/referrals">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:share-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> Referrals </span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/agent/team">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:chart-square-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> My Team </span>
                </NavLink>
              </li>

              <li className="menu-title mt-2">Earnings</li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/agent/commissions">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:wad-of-money-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> Commissions </span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/agent/wallet">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:wallet-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> My Wallet </span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/agent/rank">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:medal-star-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> My Rank </span>
                </NavLink>
              </li>
            </>
          )}

          <li className="menu-title mt-2">Account</li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/agent/profile">
              <span className="nav-icon">
                <iconify-icon icon="solar:user-id-bold-duotone"></iconify-icon>
              </span>
              <span className="nav-text"> My Profile </span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/agent/kyc">
              <span className="nav-icon">
                <iconify-icon icon="solar:document-text-bold-duotone"></iconify-icon>
              </span>
              <span className="nav-text"> KYC </span>
            </NavLink>
          </li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/agent/tickets">
              <span className="nav-icon">
                <iconify-icon icon="solar:chat-round-dots-bold-duotone"></iconify-icon>
              </span>
              <span className="nav-text"> Support </span>
            </NavLink>
          </li>

          <li className="nav-item">
            <a
                className="nav-link text-danger"
                href="#!"
                onClick={(e) => {
                e.preventDefault();
                localStorage.removeItem("token");
                window.location.href = "/login";
                }}
            >
                <span className="nav-icon">
                <iconify-icon icon="solar:logout-2-bold-duotone"></iconify-icon>
                </span>
                <span className="nav-text"> Logout </span>
            </a>
            </li>
        </ul>
      </div>
    </div>
    </>
  );
}

export default Sidebar;