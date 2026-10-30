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
import StudentDashboard from "../pages/students/StudentDashboard";
import StudentProtectedRoute from "../components/students/StudentProtectedRoute";

import TeacherLogin from "../pages/teachers/TeacherLogin";
import TeacherChangePassword from "../pages/teachers/TeacherChangePassword";
import TeacherDashboard from "../pages/teachers/TeacherDashboard";
import TeacherProtectedRoute from "../components/teachers/TeacherProtectedRoute";

import Dashboard from "../pages/dashboard/Dashboard";
import Promotions from "../pages/promotions/Promotions";
import Results from "../pages/results/Results";
import Students from "../pages/students/Students";
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

import TeacherManagement from "../pages/teachers/TeacherManagement";
import SubjectAllocation from "../pages/academic/SubjectAllocation";
import TeacherAssignment from "../pages/teachers/TeacherAssignment";

function AppRoutes() {
  return (
    <Routes>
      {/* =========================================
          PUBLIC ROUTES
      ========================================= */}

      <Route path="/" element={<LandingPage />} />

      {/* Admin login */}
      <Route path="/login" element={<Login />} />

      {/* Student authentication */}
      <Route path="/student/login" element={<StudentLogin />} />
      <Route
        path="/student/change-password"
        element={<StudentChangePassword />}
      />

      {/* Teacher authentication */}
      <Route path="/teacher/login" element={<TeacherLogin />} />
      <Route
        path="/teacher/change-password"
        element={<TeacherChangePassword />}
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
          PROTECTED TEACHER PORTAL
          Separate from admin authentication/layout
      ========================================= */}

      <Route element={<TeacherProtectedRoute />}>
        <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
      </Route>

      {/* =========================================
          PROTECTED ADMIN PORTAL
      ========================================= */}

      <Route element={<ProtectedRoute />}>
        {/* Teacher management */}
        <Route
          path="/teachers"
          element={
            <PermissionRoute permission="teachers.view">
              <TeacherManagement />
            </PermissionRoute>
          }
        />

        {/* Admin layout */}
        <Route element={<Layout />}>
          {/* =====================================
              ACADEMIC CONFIGURATION
          ===================================== */}

          <Route
            path="/subject-allocations"
            element={
              <PermissionRoute permission="class-subject-allocations.view">
                <SubjectAllocation />
              </PermissionRoute>
            }
          />

          <Route
            path="/teacher-assignments"
            element={
              <PermissionRoute permission="teacher-assignments.view">
                <TeacherAssignment />
              </PermissionRoute>
            }
          />

          <Route path="/academic-sessions" element={<AcademicSessions />} />

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

          <Route
            path="/students"
            element={
              <PermissionRoute permission="students.view">
                <Students />
              </PermissionRoute>
            }
          />

          <Route
            path="/students/add"
            element={
              <PermissionRoute permission="students.create">
                <AddStudent />
              </PermissionRoute>
            }
          />

          <Route
            path="/students/archived"
            element={
              <PermissionRoute permission="students.view">
                <ArchivedStudents />
              </PermissionRoute>
            }
          />

          <Route
            path="/students/:studentId"
            element={
              <PermissionRoute permission="students.view">
                <StudentDetails />
              </PermissionRoute>
            }
          />

          <Route
            path="/students/:studentId/edit"
            element={
              <PermissionRoute permission="students.update">
                <EditStudent />
              </PermissionRoute>
            }
          />

          {/* =====================================
              RESULTS
          ===================================== */}

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

          {/* =====================================
              PROMOTIONS
          ===================================== */}

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
