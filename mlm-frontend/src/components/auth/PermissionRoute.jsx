import { Navigate } from "react-router-dom";

function PermissionRoute({ children, permission, superAdminOnly }) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin = user.role === "super_admin";
  const perms = user.permissions || [];

  const allowed = superAdminOnly ? isSuperAdmin : isSuperAdmin || perms.includes(permission);

  if (!allowed) {
    return <Navigate to="/admin/no-access" replace />;
  }

  return children;
}

export default PermissionRoute;
