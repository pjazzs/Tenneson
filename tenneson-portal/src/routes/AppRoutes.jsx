import { Routes, Route } from "react-router-dom";
import LandingPage from "../pages/LandingPage";

import Layout from "../components/layout/Layout";

import Login from "../pages/auth/Login";
import StudentLogin from "../pages/students/StudentLogin";
import StudentChangePassword from "../pages/students/StudentChangePassword";
import StudentProfile from "../pages/students/StudentProfile";
import StudentResults from "../pages/students/StudentResults";
import StudentResultDetails from "../pages/students/StudentResultDetails";
import AcademicRecords from "../pages/students/AcademicRecords";
import Dashboard from "../pages/dashboard/Dashboard";
import Promotions from "../pages/promotions/Promotions";
import Results from "../pages/results/Results";
import Students from "../pages/students/Students";
import StudentDashboard from "../pages/students/StudentDashboard";
import StudentProtectedRoute from "../components/students/StudentProtectedRoute";
import VerifyStudent from "../pages/verify/VerifyStudent";

import ProtectedRoute from "../components/auth/ProtectedRoute";
import PermissionRoute from "../components/auth/PermissionRoute";

import AddStudent from "../pages/students/AddStudent";
import StudentDetails from "../pages/students/StudentDetails";
import EditStudent from "../pages/students/EditStudent";
import ArchivedStudents from "../pages/students/ArchivedStudents";
import ResultEntry from "../pages/results/ResultEntry";

import ActivityLogs from "../pages/activity/ActivityLogs";

import AdminManagement from "../pages/admin/AdminManagement";
import AuditLog from "../pages/admin/AuditLog";
import AcademicSessions from "../pages/academicSessions/AcademicSessions";
function AppRoutes() {
  return (
    <Routes>
      {/* =========================================
          PUBLIC ROUTES
      ========================================= */}

      <Route path="/" element={<LandingPage />} />

      <Route path="/login" element={<Login />} />

      <Route path="/student/login" element={<StudentLogin />} />
      <Route
        path="/student/change-password"
        element={<StudentChangePassword />}
      />

      {/* Public student verification */}
      <Route path="/verify/:identifier" element={<VerifyStudent />} />

      {/* =========================================
    PROTECTED STUDENT PORTAL
========================================= */}

      <Route element={<StudentProtectedRoute />}>
        <Route path="/student/dashboard" element={<StudentDashboard />} />
      </Route>

      <Route path="/student/profile" element={<StudentProfile />} />

      <Route path="/student/results" element={<StudentResults />} />

      <Route
        path="/student/results/:resultId"
        element={<StudentResultDetails />}
      />

      <Route path="/student/academic-records" element={<AcademicRecords />} />

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

          <Route
            path="/results"
            element={
              <PermissionRoute permission="results.view">
                <Results />
              </PermissionRoute>
            }
          />

          <Route
            path="/results/entry"
            element={
              <PermissionRoute permission="results.create">
                <ResultEntry />
              </PermissionRoute>
            }
          />

          <Route path="/academic-sessions" element={<AcademicSessions />} />

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

          <Route path="/promotions" element={<Promotions />} />

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

      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

export default AppRoutes;
