import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaCheckCircle,
  FaCircle,
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

  const passwordRequirements = [
    {
      label: "At least 8 characters",
      met: newPassword.length >= 8,
    },
    {
      label: "No more than 128 characters",
      met: newPassword.length <= 128,
    },
    {
      label: "At least one uppercase letter (A–Z)",
      met: /[A-Z]/.test(newPassword),
    },
    {
      label: "At least one lowercase letter (a–z)",
      met: /[a-z]/.test(newPassword),
    },
    {
      label: "At least one number (0–9)",
      met: /[0-9]/.test(newPassword),
    },
    {
      label: "At least one special character (!@#$ etc.)",
      met: /[^A-Za-z0-9]/.test(newPassword),
    },
  ];

  const allRequirementsMet = passwordRequirements.every(
    (requirement) => requirement.met,
  );

  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;

  const canSubmit =
    allRequirementsMet &&
    passwordsMatch &&
    Boolean(passwordChangeToken) &&
    !loading;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!passwordChangeToken) {
      setError(
        "Your password-change session has expired. Please log in again.",
      );
      return;
    }

    if (!allRequirementsMet) {
      setError("Please satisfy all the password requirements.");
      return;
    }

    if (!passwordsMatch) {
      setError("The passwords do not match.");
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
              onChange={(event) => {
                setNewPassword(event.target.value);
                setError("");
              }}
              className={inputStyle}
              placeholder="Enter your new password"
              autoComplete="new-password"
              maxLength={128}
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

        {/* Live password requirements */}
        <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm">
          <p className="mb-3 font-semibold text-slate-800">
            Password requirements
          </p>

          <ul className="space-y-2">
            {passwordRequirements.map((requirement) => (
              <li
                key={requirement.label}
                className={`flex items-center gap-2 ${
                  requirement.met ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {requirement.met ? (
                  <FaCheckCircle className="shrink-0" />
                ) : (
                  <FaCircle className="shrink-0 text-[10px]" />
                )}

                <span>{requirement.label}</span>
              </li>
            ))}
          </ul>

          <p
            className={`mt-3 text-xs font-medium ${
              allRequirementsMet ? "text-emerald-600" : "text-slate-400"
            }`}
          >
            {allRequirementsMet
              ? "All password requirements satisfied."
              : "Complete all requirements to continue."}
          </p>
        </div>

        <div className="mb-6">
          <label
            htmlFor="teacher-confirm-password"
            className="mb-2 block text-sm font-medium text-slate-700"
          >
            Confirm New Password
          </label>

          <div className="relative">
            {passwordsMatch ? (
              <FaCheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" />
            ) : (
              <FaLock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            )}

            <input
              id="teacher-confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError("");
              }}
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

          {confirmPassword && (
            <p
              className={`mt-2 flex items-center gap-2 text-xs ${
                passwordsMatch ? "text-emerald-600" : "text-red-500"
              }`}
            >
              {passwordsMatch ? (
                <>
                  <FaCheckCircle />
                  Passwords match.
                </>
              ) : (
                <>
                  <FaCircle className="text-[8px]" />
                  Passwords do not match.
                </>
              )}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
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
