import { Outlet } from "react-router-dom";
import Topbar from "../components/agent/Topbar.jsx";
import Sidebar from "../components/agent/Sidebar.jsx";
import ThemeSettingsOffcanvas from "../components/admin/ThemeSettingsOffcanvas.jsx";

function AgentLayout() {
  return (
    <div className="wrapper">
      <Topbar />
      <Sidebar />
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