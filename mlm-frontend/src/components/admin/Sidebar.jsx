import { NavLink } from "react-router-dom";
import useAdminCounts from "../../hooks/useAdminCounts.js";

function Sidebar() {
  const counts = useAdminCounts();
  const adminUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = adminUser.role === "super_admin";
  const perms = adminUser.permissions || [];
  const can = (key) => isSuperAdmin || perms.includes(key);

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
          <span className="fw-bold fs-24">MLM Real Estate</span>
        </a>
        <a href="/" className="logo-light">
          <span className="fw-bold fs-24 text-white">MLM Real Estate</span>
        </a>
      </div>

      <button type="button" className="button-sm-hover" aria-label="Show Full Sidebar" onClick={collapseSidebar}>
        <iconify-icon icon="solar:double-alt-arrow-right-bold-duotone" className="button-sm-hover-icon"></iconify-icon>
      </button>

      <div className="scrollbar" data-simplebar>
        <ul className="navbar-nav" id="navbar-nav">
          {/* General */}
          <li className="menu-title">General</li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/admin/dashboard">
              <span className="nav-icon">
                <iconify-icon icon="solar:widget-5-bold-duotone"></iconify-icon>
              </span>
              <span className="nav-text"> Dashboard </span>
            </NavLink>
          </li>

          {/* User Management */}
          <li className="menu-title mt-2">User Management</li>
          {can("kyc") && (
            <li className="nav-item">
              <NavLink className="nav-link" to="/admin/kyc">
                <span className="nav-icon">
                  <iconify-icon icon="solar:document-text-bold-duotone"></iconify-icon>
                </span>
                <span className="nav-text"> KYC Verifications </span>
                {counts.kycPending > 0 && (
                  <span className="badge bg-danger rounded-pill ms-auto">{counts.kycPending}</span>
                )}
              </NavLink>
            </li>
          )}
          {can("agents") && (
            <li className="nav-item">
              <NavLink className="nav-link" to="/admin/agents">
                <span className="nav-icon">
                  <iconify-icon icon="solar:users-group-rounded-bold-duotone"></iconify-icon>
                </span>
                <span className="nav-text"> Agents </span>
              </NavLink>
            </li>
          )}
          {can("referrals") && (
            <li className="nav-item">
              <NavLink className="nav-link" to="/admin/referrals">
                <span className="nav-icon">
                  <iconify-icon icon="solar:share-bold-duotone"></iconify-icon>
                </span>
                <span className="nav-text"> Referral Links </span>
              </NavLink>
            </li>
          )}
          {isSuperAdmin && (
            <li className="nav-item">
              <NavLink className="nav-link" to="/admin/sub-admins">
                <span className="nav-icon">
                  <iconify-icon icon="solar:shield-user-bold-duotone"></iconify-icon>
                </span>
                <span className="nav-text"> Sub Admins </span>
              </NavLink>
            </li>
          )}

          {/* Inventory Management */}
          <li className="menu-title mt-2">Inventory Management</li>
          {can("projects") && (
            <li className="nav-item">
              <NavLink className="nav-link" to="/admin/projects">
                <span className="nav-icon">
                  <iconify-icon icon="solar:home-2-bold-duotone"></iconify-icon>
                </span>
                <span className="nav-text"> Projects </span>
              </NavLink>
            </li>
          )}
          {can("customers") && (
            <li className="nav-item">
              <NavLink className="nav-link" to="/admin/customers">
                <span className="nav-icon">
                  <iconify-icon icon="solar:users-group-two-rounded-bold-duotone"></iconify-icon>
                </span>
                <span className="nav-text"> Customers </span>
              </NavLink>
            </li>
          )}

          {/* Sales & Finance */}
          <li className="menu-title mt-2">Sales &amp; Finance</li>
          {can("bookings") && (
            <li className="nav-item">
              <NavLink className="nav-link" to="/admin/bookings">
                <span className="nav-icon">
                  <iconify-icon icon="solar:bill-list-bold-duotone"></iconify-icon>
                </span>
                <span className="nav-text"> Bookings </span>
                {counts.bookingsPending > 0 && (
                  <span className="badge bg-danger rounded-pill ms-auto">{counts.bookingsPending}</span>
                )}
              </NavLink>
            </li>
          )}
          {can("emis") && (
            <li className="nav-item">
              <NavLink className="nav-link" to="/admin/emis">
                <span className="nav-icon">
                  <iconify-icon icon="solar:calendar-minimalistic-bold-duotone"></iconify-icon>
                </span>
                <span className="nav-text"> Installments (EMI) </span>
              </NavLink>
            </li>
          )}

          {/* Finance */}
          {can("reports") && (
            <>
              <li className="menu-title mt-2">Finance</li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/admin/reports">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:chart-square-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> Reports Overview </span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/admin/reports/emi-collections">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:wallet-2-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> EMI Collections </span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/admin/reports/commissions">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:graph-up-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> Commissions </span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/admin/reports/agent-earnings">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:user-speak-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> Agent Earnings </span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/admin/reports/project-sales">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:city-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> Project Sales </span>
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/admin/reports/payouts">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:cash-out-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> Payouts </span>
                </NavLink>
              </li>
            </>
          )}
          {can("withdrawals") && (
            <li className="nav-item">
              <NavLink className="nav-link" to="/admin/withdrawals">
                <span className="nav-icon">
                  <iconify-icon icon="solar:wallet-money-bold-duotone"></iconify-icon>
                </span>
                <span className="nav-text"> Withdrawals </span>
                {counts.withdrawalsPending > 0 && (
                  <span className="badge bg-danger rounded-pill ms-auto">{counts.withdrawalsPending}</span>
                )}
              </NavLink>
            </li>
          )}
          {isSuperAdmin && (
            <li className="nav-item">
              <NavLink className="nav-link" to="/admin/ranks">
                <span className="nav-icon">
                  <iconify-icon icon="solar:ranking-bold-duotone"></iconify-icon>
                </span>
                <span className="nav-text"> Rank Levels </span>
              </NavLink>
            </li>
          )}

          {/* Settings */}
          {isSuperAdmin && (
            <>
              <li className="menu-title mt-2">Settings</li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/admin/settings">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:settings-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> System Settings </span>
                </NavLink>
              </li>
            </>
          )}

          {/* Security */}
          {isSuperAdmin && (
            <>
              <li className="menu-title mt-2">Security</li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/admin/audit-logs">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:history-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> Audit Logs </span>
                </NavLink>
              </li>
            </>
          )}

          {/* Support */}
          {can("tickets") && (
            <>
              <li className="menu-title mt-2">Support</li>
              <li className="nav-item">
                <NavLink className="nav-link" to="/admin/tickets">
                  <span className="nav-icon">
                    <iconify-icon icon="solar:chat-round-dots-bold-duotone"></iconify-icon>
                  </span>
                  <span className="nav-text"> Support Tickets </span>
                  {counts.ticketsOpen > 0 && (
                    <span className="badge bg-warning rounded-pill ms-auto">{counts.ticketsOpen}</span>
                  )}
                </NavLink>
              </li>
            </>
          )}

          {/* Account */}
          <li className="menu-title mt-2">Account</li>
          <li className="nav-item">
            <NavLink className="nav-link" to="/admin/profile">
              <span className="nav-icon">
                <iconify-icon icon="solar:user-id-bold-duotone"></iconify-icon>
              </span>
              <span className="nav-text"> My Profile </span>
            </NavLink>
          </li>
          <li className="nav-item">
            <a
              className="nav-link text-danger"
              href="#!"
              onClick={(e) => {
                e.preventDefault();
                localStorage.removeItem("token");
                localStorage.removeItem("user");
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