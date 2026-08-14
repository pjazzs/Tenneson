import { Navigate, Outlet } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

function PermissionRoute({ permission }) {
  const { admin, hasPermission } = useAuth();

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export default PermissionRoute;