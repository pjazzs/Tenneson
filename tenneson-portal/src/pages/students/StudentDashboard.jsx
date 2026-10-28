import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaGraduationCap,
  FaUser,
  FaBookOpen,
  FaClipboardList,
  FaSignOutAlt,
  FaIdCard,
  FaCalendarAlt,
  FaSchool,
  FaArrowRight,
} from "react-icons/fa";

import useStudentAuth from "../../hooks/useStudentAuth";
import studentApi from "../../api/studentApi";

function StudentDashboard() {
  const navigate = useNavigate();

  const { student, updateStudent, logoutStudent } = useStudentAuth();

  const [latestStudent, setLatestStudent] = useState(student);
  const [photoError, setPhotoError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadLatestStudent = async () => {
      try {
        setProfileError("");

        const response = await studentApi.get("/student/me");

        // Support the API's expected { student: ... } response.
        const freshStudent = response.data?.student;

        if (!freshStudent) {
          throw new Error("The server did not return student information.");
        }

        if (!isMounted) return;

        setLatestStudent(freshStudent);
        setPhotoError(false);

        // Synchronize React context and localStorage.
        if (typeof updateStudent === "function") {
          updateStudent(freshStudent);
        }
      } catch (error) {
        if (!isMounted) return;

        console.error(
          "Failed to refresh student dashboard:",
          error?.response?.data?.message || error.message,
        );

        // Keep the cached profile visible if the request fails.
        setProfileError(
          "Your latest profile details could not be loaded. Displayed information may be outdated.",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadLatestStudent();

    return () => {
      isMounted = false;
    };
  }, [updateStudent]);

  // Prefer the freshly fetched profile.
  const currentStudent = latestStudent || student;

  const handleLogout = () => {
    logoutStudent();

    navigate("/student/login", {
      replace: true,
    });
  };

  if (!currentStudent && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-green-500/30 border-t-green-500" />
          <p className="text-gray-400">Loading your student information...</p>
        </div>
      </div>
    );
  }

  if (!currentStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center px-4">
          <p className="text-gray-400 mb-4">
            Student information could not be loaded.
          </p>

          <button
            onClick={() => navigate("/student/login", { replace: true })}
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-medium transition"
          >
            Go to Student Login
          </button>
        </div>
      </div>
    );
  }

  const fullName = [
    currentStudent.firstName,
    currentStudent.otherName,
    currentStudent.lastName,
  ]
    .filter(Boolean)
    .join(" ");

  const photoUrl =
    typeof currentStudent.photo === "string"
      ? currentStudent.photo
      : currentStudent.photo?.url || "";

  const hasPhoto = Boolean(photoUrl) && !photoError;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* HEADER */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-green-600 flex items-center justify-center text-xl">
              <FaSchool />
            </div>

            <div>
              <h1 className="font-bold text-lg">Tenneson Portal</h1>
              <p className="text-xs text-gray-400">Student Portal</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition text-sm"
          >
            <FaSignOutAlt />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {profileError && (
          <div
            role="status"
            className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          >
            {profileError}
          </div>
        )}

        {/* WELCOME SECTION */}
        <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-green-700 via-green-800 to-slate-900 border border-white/10 p-6 sm:p-8 mb-8">
          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
            {/* STUDENT PHOTO */}
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden shrink-0 border-4 border-white/20 bg-slate-800 shadow-xl">
              {hasPhoto ? (
                <img
                  src={photoUrl}
                  alt={`${fullName || "Student"}'s profile`}
                  className="w-full h-full object-cover"
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-800 text-gray-400">
                  <FaUser className="text-5xl" />
                </div>
              )}
            </div>

            {/* WELCOME TEXT */}
            <div className="text-center sm:text-left">
              <p className="text-green-200 text-sm mb-2">Welcome back</p>

              <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                {fullName || "Student"}
              </h2>

              <p className="text-green-100/80 text-sm sm:text-base">
                Welcome to your Tenneson student portal.
              </p>

              <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                <FaIdCard className="text-green-300 text-sm" />

                <span className="text-green-100/80 text-sm">
                  {currentStudent.studentId || "Student ID unavailable"}
                </span>
              </div>
            </div>
          </div>

          <FaGraduationCap className="absolute -right-4 -bottom-8 text-[180px] text-white/5 rotate-12" />
        </section>

        {/* STUDENT INFORMATION */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FaIdCard className="text-green-500" />
            <h3 className="text-lg font-semibold">Student Information</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* STUDENT ID */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <FaIdCard />
                </div>
                <span className="text-sm text-gray-400">Student ID</span>
              </div>

              <p className="font-semibold text-white">
                {currentStudent.studentId || "Not available"}
              </p>
            </div>

            {/* CURRENT CLASS */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <FaGraduationCap />
                </div>
                <span className="text-sm text-gray-400">Current Class</span>
              </div>

              <p className="font-semibold text-white">
                {currentStudent.currentClass || "Not available"}
              </p>
            </div>

            {/* ACADEMIC SESSION */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
                  <FaCalendarAlt />
                </div>
                <span className="text-sm text-gray-400">Academic Session</span>
              </div>

              <p className="font-semibold text-white">
                {currentStudent.session || "Not available"}
              </p>
            </div>

            {/* GENDER */}
            <div className="bg-slate-900 border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center">
                  <FaUser />
                </div>
                <span className="text-sm text-gray-400">Gender</span>
              </div>

              <p className="font-semibold text-white">
                {currentStudent.gender || "Not available"}
              </p>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <FaBookOpen className="text-green-500" />
            <h3 className="text-lg font-semibold">Student Portal</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* PROFILE */}
            <button
              type="button"
              onClick={() => navigate("/student/profile")}
              className="text-left bg-slate-900 border border-white/10 hover:border-green-500/40 rounded-2xl p-6 transition group"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center text-xl">
                  <FaUser />
                </div>

                <FaArrowRight className="text-gray-600 group-hover:text-green-400 group-hover:translate-x-1 transition" />
              </div>

              <h4 className="font-semibold mt-5 mb-2">My Profile</h4>

              <p className="text-sm text-gray-400">
                View your personal and academic information.
              </p>
            </button>

            {/* RESULTS */}
            <button
              type="button"
              onClick={() => navigate("/student/results")}
              className="text-left bg-slate-900 border border-white/10 hover:border-green-500/40 rounded-2xl p-6 transition group"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center text-xl">
                  <FaClipboardList />
                </div>

                <FaArrowRight className="text-gray-600 group-hover:text-green-400 group-hover:translate-x-1 transition" />
              </div>

              <h4 className="font-semibold mt-5 mb-2">My Results</h4>

              <p className="text-sm text-gray-400">
                View your published academic results.
              </p>
            </button>

            {/* ACADEMIC RECORDS */}
            <button
              type="button"
              onClick={() => navigate("/student/academic-records")}
              className="text-left bg-slate-900 border border-white/10 hover:border-green-500/40 rounded-2xl p-6 transition group"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center text-xl">
                  <FaGraduationCap />
                </div>

                <FaArrowRight className="text-gray-600 group-hover:text-green-400 group-hover:translate-x-1 transition" />
              </div>

              <h4 className="font-semibold mt-5 mb-2">Academic Records</h4>

              <p className="text-sm text-gray-400">
                Access your available academic records.
              </p>
            </button>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-white/10 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
          <p className="text-gray-500 text-xs">Tenneson Student Portal</p>
          <p className="text-gray-600 text-xs mt-1">Created by PjazzDev</p>
        </div>
      </footer>
    </div>
  );
}

export default StudentDashboard;
