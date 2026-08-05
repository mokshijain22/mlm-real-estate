import { Navigate } from "react-router-dom";
import { getStoredUser } from "../../utils/userHelpers.js";

function PermissionRoute({ children, permission, superAdminOnly }) {
  const user = getStoredUser({});
  const isSuperAdmin = user.role === "super_admin";
  const perms = user.permissions || [];

  const allowed = superAdminOnly ? isSuperAdmin : isSuperAdmin || perms.includes(permission);

  if (!allowed) {
    return <Navigate to="/admin/no-access" replace />;
  }

  return children;
}

export default PermissionRoute;
