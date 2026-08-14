import { Navigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth";

function PermissionRoute({ permission, children }) {
  const { admin, hasPermission } = useAuth();

  if (!admin) {
    return <Navigate to="/login" replace />;
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default PermissionRoute;