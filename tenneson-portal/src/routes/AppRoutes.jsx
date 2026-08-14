import { Routes, Route } from "react-router-dom";

import Layout from "../components/layout/Layout";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import Students from "../pages/students/Students";
import VerifyStudent from "../pages/verify/VerifyStudent";

import ProtectedRoute from "../components/auth/ProtectedRoute";
import PermissionRoute from "../components/auth/PermissionRoute";

import AddStudent from "../pages/students/AddStudent";
import StudentDetails from "../pages/students/StudentDetails";
import EditStudent from "../pages/students/EditStudent";
import ArchivedStudents from "../pages/students/ArchivedStudents";

import ActivityLogs from "../pages/activity/ActivityLogs";

import AdminManagement from "../pages/admin/AdminManagement";
import AuditLog from "../pages/admin/AuditLog";


function AppRoutes() {
  return (
    <Routes>

      {/* =========================================
          PUBLIC ROUTES
      ========================================= */}

      <Route
        path="/login"
        element={<Login />}
      />

      {/* Public student verification */}
      <Route
        path="/verify/:studentId"
        element={<VerifyStudent />}
      />


      {/* =========================================
          PROTECTED ADMIN PORTAL
      ========================================= */}

      <Route element={<ProtectedRoute />}>

        <Route element={<Layout />}>

          {/* =====================================
              DASHBOARD
          ===================================== */}

          <Route
            path="/dashboard"
            element={
              <PermissionRoute permission="students.view">
                <Dashboard />
              </PermissionRoute>
            }
          />


          {/* =====================================
              STUDENTS
          ===================================== */}

          {/* View students */}
          <Route
            path="/students"
            element={
              <PermissionRoute permission="students.view">
                <Students />
              </PermissionRoute>
            }
          />


          {/* Add student */}
          <Route
            path="/students/add"
            element={
              <PermissionRoute permission="students.create">
                <AddStudent />
              </PermissionRoute>
            }
          />


          {/* Archived students */}
          <Route
            path="/students/archived"
            element={
              <PermissionRoute permission="students.view">
                <ArchivedStudents />
              </PermissionRoute>
            }
          />


          {/* Student details */}
          <Route
            path="/students/:studentId"
            element={
              <PermissionRoute permission="students.view">
                <StudentDetails />
              </PermissionRoute>
            }
          />


          {/* Edit student */}
          <Route
            path="/students/:studentId/edit"
            element={
              <PermissionRoute permission="students.update">
                <EditStudent />
              </PermissionRoute>
            }
          />


          {/* =====================================
              ACTIVITY LOGS
          ===================================== */}

          <Route
            path="/activity-logs"
            element={
              <PermissionRoute permission="students.view">
                <ActivityLogs />
              </PermissionRoute>
            }
          />


          {/* =====================================
              ADMIN MANAGEMENT
          ===================================== */}

          <Route
            path="/admins"
            element={
              <PermissionRoute permission="admins.manage">
                <AdminManagement />
              </PermissionRoute>
            }
          />


          {/* =====================================
              AUDIT LOGS
          ===================================== */}

          <Route
            path="/audit-logs"
            element={
              <PermissionRoute permission="admins.manage">
                <AuditLog />
              </PermissionRoute>
            }
          />

        </Route>

      </Route>


      {/* =========================================
          FALLBACK
      ========================================= */}

      <Route
        path="*"
        element={<Login />}
      />

    </Routes>
  );
}


export default AppRoutes;