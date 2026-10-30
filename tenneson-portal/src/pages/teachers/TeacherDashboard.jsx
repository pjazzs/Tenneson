import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChalkboardTeacher,
  FaEnvelope,
  FaIdBadge,
  FaBookOpen,
  FaSignOutAlt,
  FaUserCircle,
} from "react-icons/fa";

import teacherApi from "../../api/teacherApi";
import useTeacherAuth from "../../hooks/useTeacherAuth";

function TeacherDashboard() {
  const navigate = useNavigate();

  const { teacher, updateTeacher, logoutTeacher } = useTeacherAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchTeacherProfile = async () => {
      try {
        const response = await teacherApi.get("/teacher/me");

        if (isMounted && response.data.teacher) {
          updateTeacher(response.data.teacher);
        }
      } catch (err) {
        console.error(
          "Teacher profile error:",
          err.response?.data || err.message,
        );

        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load your profile. Please try again.",
          );

          if (err.response?.status === 401) {
            logoutTeacher();
            navigate("/teacher/login", { replace: true });
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTeacherProfile();

    return () => {
      isMounted = false;
    };
  }, [updateTeacher, logoutTeacher, navigate]);

  const handleLogout = () => {
    logoutTeacher();
    navigate("/teacher/login", { replace: true });
  };

  const displayName = teacher?.fullName || "Teacher";
  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">
              <FaChalkboardTeacher />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">Tenneson</h1>
              <p className="text-xs text-slate-500">Teacher Portal</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <FaSignOutAlt />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* WELCOME */}
        <section className="mb-8 overflow-hidden rounded-3xl bg-linear-to-r from-emerald-700 to-teal-600 p-6 text-white shadow-lg shadow-emerald-100 sm:p-9">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 text-sm font-medium text-emerald-100">
                TEACHER WORKSPACE
              </p>

              <h2 className="text-2xl font-bold sm:text-3xl">
                Welcome, {displayName}
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
                Manage your teaching responsibilities and access your assigned
                academic resources from one place.
              </p>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-2xl font-bold text-white backdrop-blur-sm">
              {initials || <FaUserCircle />}
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* PROFILE SUMMARY */}
        <section className="mb-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Your Profile</h2>
            <p className="mt-1 text-sm text-slate-500">
              Your teacher account information.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
                <FaUserCircle />
              </div>

              <p className="text-sm text-slate-500">Full Name</p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {loading ? "Loading..." : displayName}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">
                <FaEnvelope />
              </div>

              <p className="text-sm text-slate-500">Email Address</p>

              <p className="mt-2 break-all text-lg font-bold text-slate-900">
                {loading ? "Loading..." : teacher?.email || "Not available"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-lg text-violet-700">
                <FaIdBadge />
              </div>

              <p className="text-sm text-slate-500">Employee ID</p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {loading ? "Loading..." : teacher?.employeeId || "Not assigned"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-lg text-green-700">
                <FaBookOpen />
              </div>

              <p className="text-sm text-slate-500">Account Status</p>

              <p className="mt-2">
                {loading ? (
                  <span className="font-semibold text-slate-500">
                    Checking...
                  </span>
                ) : teacher?.isActive ? (
                  <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                    Inactive
                  </span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* TEACHING AREA */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
              <FaBookOpen />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Teaching Workspace
              </h2>

              <p className="text-sm text-slate-500">
                Your classes, subjects, and academic responsibilities.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <FaChalkboardTeacher className="mx-auto mb-3 text-3xl text-slate-400" />

            <h3 className="font-semibold text-slate-800">
              Your teaching assignments will appear here
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              Once your assigned classes and subjects are loaded, you will be
              able to access the relevant teaching and result-entry features
              from this workspace.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        Tenneson Teacher Portal
      </footer>
    </div>
  );
}

export default TeacherDashboard;
