import { Navigate, Outlet } from "react-router-dom";

function TeacherProtectedRoute() {
  const token = localStorage.getItem("teacherToken");

  if (!token) {
    return <Navigate to="/teacher/login" replace />;
  }

  return <Outlet />;
}

export default TeacherProtectedRoute;
