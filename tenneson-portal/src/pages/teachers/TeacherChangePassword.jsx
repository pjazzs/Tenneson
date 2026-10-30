import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaCheckCircle,
} from "react-icons/fa";

import teacherApi from "../../api/teacherApi";
import useTeacherAuth from "../../hooks/useTeacherAuth";

function TeacherChangePassword() {
  const navigate = useNavigate();
  const { loginTeacher } = useTeacherAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordChangeToken = sessionStorage.getItem(
    "teacherPasswordChangeToken",
  );

  const validatePassword = () => {
    if (newPassword.length < 8 || newPassword.length > 128) {
      return "Password must contain between 8 and 128 characters.";
    }

    if (!/[a-z]/.test(newPassword)) {
      return "Password must contain at least one lowercase letter.";
    }

    if (!/[A-Z]/.test(newPassword)) {
      return "Password must contain at least one uppercase letter.";
    }

    if (!/[0-9]/.test(newPassword)) {
      return "Password must contain at least one number.";
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return "Password must contain at least one special character.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!passwordChangeToken) {
      setError(
        "Your password-change session has expired. Please log in again.",
      );
      return;
    }

    if (!newPassword || !confirmPassword) {
      setError("Please enter and confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    const passwordError = validatePassword();

    if (passwordError) {
      setError(passwordError);
      return;
    }

    try {
      setLoading(true);

      const response = await teacherApi.patch(
        "/teacher/change-password",
        {
          newPassword,
          confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${passwordChangeToken}`,
          },
        },
      );

      const { token, teacher } = response.data;

      if (!token || !teacher) {
        setError(
          "Your password may have been changed, but no teacher session was returned. Please log in again.",
        );
        return;
      }

      sessionStorage.removeItem("teacherPasswordChangeToken");

      loginTeacher({
        token,
        teacher,
      });

      navigate("/teacher/dashboard", {
        replace: true,
      });
    } catch (err) {
      console.error(
        "Teacher password change error:",
        err.response?.data || err.message,
      );

      setError(
        err.response?.data?.message ||
          "Unable to change your password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle =
    "w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-12 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-slate-50 via-white to-emerald-50 px-4 py-10">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-7 shadow-xl shadow-slate-200/60 sm:p-9"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-600 text-2xl text-white shadow-lg shadow-emerald-200">
            <FaLock />
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            Create a New Password
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            You must change your temporary password before accessing the teacher
            portal.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-5">
          <label
            htmlFor="teacher-new-password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            New Password
          </label>

          <div className="relative">
            <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              id="teacher-new-password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={inputStyle}
              placeholder="Enter your new password"
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              onClick={() => setShowNewPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <div className="mb-5">
          <label
            htmlFor="teacher-confirm-password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Confirm New Password
          </label>

          <div className="relative">
            <FaCheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

            <input
              id="teacher-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={inputStyle}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              required
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
          <p className="mb-2 font-semibold text-slate-800">
            Password requirements
          </p>

          <ul className="space-y-1">
            <li>• 8–128 characters</li>
            <li>• At least one uppercase letter</li>
            <li>• At least one lowercase letter</li>
            <li>• At least one number</li>
            <li>• At least one special character</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin" />
              Updating Password...
            </>
          ) : (
            <>
              <FaLock />
              Change Password
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default TeacherChangePassword;
