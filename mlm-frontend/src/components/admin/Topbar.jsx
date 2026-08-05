import { useNavigate } from "react-router-dom";
import { getStoredUser } from "../../utils/userHelpers.js";

function Topbar() {
  const navigate = useNavigate();

  let userName = "Admin";
  const stored = getStoredUser();
  if (stored?.name) userName = stored.name;

  function toggleSidebar() {
    const html = document.documentElement;
    if (window.innerWidth > 1140) {
      const currentSize = html.getAttribute("data-menu-size");
      if (currentSize === "hidden") {
        html.removeAttribute("data-menu-size");
      } else {
        html.setAttribute("data-menu-size", "hidden");
      }
    } else {
      html.classList.toggle("sidebar-enable");
    }
  }

  function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute("data-bs-theme");
    html.setAttribute("data-bs-theme", current === "dark" ? "light" : "dark");
  }

  return (
    <header className="topbar">
      <div className="container-fluid">
        <div className="navbar-header">
          <div className="d-flex align-items-center">
            <div className="topbar-item">
              <button type="button" className="button-toggle-menu me-2" onClick={toggleSidebar}>
                <iconify-icon icon="solar:hamburger-menu-broken" className="fs-24 align-middle"></iconify-icon>
              </button>
            </div>

            <div className="topbar-item">
              <h4 className="topbar-panel-title fw-bold topbar-button pe-none text-uppercase mb-0">Admin Panel</h4>
            </div>
          </div>

          <div className="d-flex align-items-center gap-1">
            <div className="topbar-item">
              <button type="button" className="topbar-button" id="light-dark-mode" onClick={toggleTheme}>
                <iconify-icon icon="solar:moon-bold-duotone" className="fs-24 align-middle"></iconify-icon>
              </button>
            </div>

            <div className="topbar-item d-none d-md-flex">
              <button
                type="button"
                className="topbar-button"
                id="theme-settings-btn"
                data-bs-toggle="offcanvas"
                data-bs-target="#theme-settings-offcanvas"
                aria-controls="theme-settings-offcanvas"
              >
                <iconify-icon icon="solar:settings-bold-duotone" className="fs-24 align-middle"></iconify-icon>
              </button>
            </div>

            <div className="dropdown topbar-item">
              <a
                href="#!"
                className="topbar-button"
                id="page-header-user-dropdown"
                data-bs-toggle="dropdown"
                aria-haspopup="true"
                aria-expanded="false"
              >
                <span className="d-flex align-items-center">
                  <img className="rounded-circle" width="32" src="/images/users/avatar-1.jpg" alt="avatar" />
                </span>
              </a>
              <div className="dropdown-menu dropdown-menu-end">
                <h6 className="dropdown-header">Welcome {userName}!</h6>

                <a
                  className="dropdown-item"
                  href="#!"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/admin/profile");
                  }}
                >
                  <i className="bx bx-user-circle text-muted fs-18 align-middle me-1"></i>
                  <span className="align-middle">Profile</span>
                </a>

                <a
                  className="dropdown-item"
                  href="#!"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/admin/tickets");
                  }}
                >
                  <i className="bx bx-message-dots text-muted fs-18 align-middle me-1"></i>
                  <span className="align-middle">Messages</span>
                </a>

                <a
                  className="dropdown-item"
                  href="#!"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("/admin/settings");
                  }}
                >
                  <i className="bx bx-wallet text-muted fs-18 align-middle me-1"></i>
                  <span className="align-middle">Pricing</span>
                </a>

                <a
                  className="dropdown-item"
                  href="#!"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open("https://wa.me/", "_blank");
                  }}
                >
                  <i className="bx bx-help-circle text-muted fs-18 align-middle me-1"></i>
                  <span className="align-middle">Help</span>
                </a>

                <a
                  className="dropdown-item"
                  href="#!"
                  onClick={(e) => {
                    e.preventDefault();
                    sessionStorage.setItem("locked", "true");
                    window.location.href = "/login";
                  }}
                >
                  <i className="bx bx-lock text-muted fs-18 align-middle me-1"></i>
                  <span className="align-middle">Lock screen</span>
                </a>

                <div className="dropdown-divider my-1"></div>

                <a
                  className="dropdown-item text-danger"
                  href="#!"
                  onClick={(e) => {
                    e.preventDefault();
                    localStorage.removeItem("token");
                    window.location.href = "/login";
                  }}
                >
                  <i className="bx bx-log-out fs-18 align-middle me-1"></i>
                  <span className="align-middle">Logout</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
