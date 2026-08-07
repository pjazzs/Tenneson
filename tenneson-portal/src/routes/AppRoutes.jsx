import { Routes, Route } from "react-router-dom";

import Layout from "../components/layout/Layout";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import Students from "../pages/students/Students";
import VerifyStudent from "../pages/verify/VerifyStudent";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import AddStudent from "../pages/students/AddStudent";
import StudentDetails from "../pages/students/StudentDetails";
import EditStudent from "../pages/students/EditStudent";
import ArchivedStudents from "../pages/students/ArchivedStudents";
import ActivityLogs from "../pages/activity/ActivityLogs";
import AdminManagement from "../pages/admin/AdminManagement";
import AuditLog from "../pages/admin/AuditLog";
import StudentVerification from "../pages/students/StudentVerification";

function AppRoutes() {
  return (


  
    <Routes>
      <Route path="/admins" element={<AdminManagement />} />
      <Route path="/audit-logs" element={<AuditLog />} />
      <Route
  path="/verify/:studentId"
  element={<StudentVerification />}
/>


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

      <Route
  path="/students/:studentId"
  element={<StudentDetails />}
/>

      <Route
  path="/students/add"
  element={<AddStudent />}
/>

    </Route>
<Route
  path="/students/:studentId/edit"
  element={<EditStudent />}
/>

<Route
  path="/students/archived"
  element={<ArchivedStudents />}
/>
  </Route>


  <Route 
    path="/verify/:studentId"
    element={<VerifyStudent />}
  />
  
  <Route
  path="/activity-logs"
  element={<ActivityLogs />}
/>

<Route path="*" element={<Login />} />
</Routes>
  );
}

export default AppRoutes;