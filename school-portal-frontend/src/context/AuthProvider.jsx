import { useState } from "react";
import AuthContext from "./AuthContext";

export function AuthProvider({ children }) {

  const [admin, setAdmin] = useState(
    JSON.parse(localStorage.getItem("admin")) || null
  );

  const hasPermission = (permission) => {

    if (!admin) return false;

    if (admin.role === "super_admin") {
      return true;
    }

    return admin.permissions?.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        setAdmin,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}