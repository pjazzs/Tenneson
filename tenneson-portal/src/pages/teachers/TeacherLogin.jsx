import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChalkboardTeacher,
  FaEnvelope,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
} from "react-icons/fa";

import teacherApi from "../../api/teacherApi";
import useTeacherAuth from "../../hooks/useTeacherAuth";

function TeacherLogin() {
  const navigate = useNavigate();
  const { loginTeacher } = useTeacherAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    if (!email.trim() || !password) {
      setError("Email address and password are required.");
      return;
    }

    try {
      setLoading(true);

      const response = await teacherApi.post("/teacher/login", {
        email: email.trim().toLowerCase(),
        password,
      });

      const data = response.data;

      // First login: store only the temporary password-change token.
      if (data.passwordChangeToken) {
        sessionStorage.setItem(
          "teacherPasswordChangeToken",
          data.passwordChangeToken,
        );

        navigate("/teacher/change-password", {
          replace: true,
        });

        return;
      }

      // Normal login.
      if (!data.token || !data.teacher) {
        setError("Login succeeded, but no teacher session was returned.");
        return;
      }

      loginTeacher({
        token: data.token,
        teacher: data.teacher,
      });

      navigate("/teacher/dashboard", {
        replace: true,
      });
    } catch (err) {
      console.error("Teacher login error:", err.response?.data || err.message);

      setError(
        err.response?.data?.message ||
          "Unable to log in. Please check your email and password.",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle =
    "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 via-white to-emerald-50 px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-9"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-3xl text-white shadow-lg shadow-emerald-200">
            <FaChalkboardTeacher />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Tenneson Teacher Portal
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to access your teaching workspace.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5">
          <label
            htmlFor="teacher-email"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Email Address
          </label>

          <div className="relative">
            <FaEnvelope className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              id="teacher-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputStyle}
              placeholder="Enter your email address"
              autoComplete="username"
              required
            />
          </div>
        </div>

        <div className="mb-7">
          <label
            htmlFor="teacher-password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Password
          </label>

          <div className="relative">
            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              id="teacher-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputStyle} pr-12`}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <FaLock />
              Sign In
            </>
          )}
        </button>

        <p className="mt-7 text-center text-xs text-slate-400">
          Tenneson Comprehensive College
        </p>
      </form>
    </div>
  );
}

export default TeacherLogin;
