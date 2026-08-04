import { Routes, Route } from "react-router-dom";

import Layout from "../components/layout/Layout";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import Students from "../pages/students/Students";
import VerifyStudent from "../pages/verify/VerifyStudent";
import ProtectedRoute from "../components/auth/ProtectedRoute";


function AppRoutes() {
  return (


  
    <Routes>

  <Route path="/login" element={<Login />} />

  <Route element={<ProtectedRoute />}>

    <Route element={<Layout />}>

      <Route 
        path="/dashboard" 
        element={<Dashboard />} 
      />

      <Route 
        path="/students" 
        element={<Students />} 
      />

    </Route>

  </Route>


  <Route 
    path="/verify/:studentId"
    element={<VerifyStudent />}
  />
<Route path="*" element={<Login />} />
</Routes>
  );
}

export default AppRoutes;