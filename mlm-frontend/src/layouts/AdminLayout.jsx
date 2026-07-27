import { Outlet } from "react-router-dom";
import AdminTopbar from "../components/admin/Topbar.jsx";
import AdminSidebar from "../components/admin/Sidebar.jsx";
import AdminFooter from "../components/admin/Footer.jsx";
import ThemeSettingsOffcanvas from "../components/admin/ThemeSettingsOffcanvas.jsx";

function AdminLayout() {
  return (
    <div className="wrapper">
      <AdminTopbar />
      <AdminSidebar />
      <div className="page-content" style={{ backgroundColor: "var(--bs-body-bg)" }}>
        <div className="container-fluid">
          <Outlet />
        </div>
        <AdminFooter />
      </div>
      <ThemeSettingsOffcanvas />
    </div>
  );
}

export default AdminLayout;