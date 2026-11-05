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

import studentApi from "../../api/studentApi";
import useStudentAuth from "../../hooks/useStudentAuth";

function StudentChangePassword() {
  const navigate = useNavigate();

  const { loginStudent } = useStudentAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const passwordChangeToken = sessionStorage.getItem(
    "studentPasswordChangeToken",
  );

  // Live password requirements.
  const passwordRequirements = [
    {
      label: "At least 8 characters",
      valid: newPassword.length >= 8,
    },
    {
      label: "At least one uppercase letter (A-Z)",
      valid: /[A-Z]/.test(newPassword),
    },
    {
      label: "At least one lowercase letter (a-z)",
      valid: /[a-z]/.test(newPassword),
    },
    {
      label: "At least one number (0-9)",
      valid: /[0-9]/.test(newPassword),
    },
    {
      label: "At least one special character (@, #, $, !)",
      valid: /[^A-Za-z0-9]/.test(newPassword),
    },
  ];

  const allRequirementsMet = passwordRequirements.every(
    (requirement) => requirement.valid,
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
      setError("Please satisfy all password requirements.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your new password.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      const response = await studentApi.patch(
        "/student/change-password",
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

      const { token, student } = response.data;

      if (!token || !student) {
        setError(
          "Password was changed, but a student session was not returned.",
        );
        return;
      }

      sessionStorage.removeItem("studentPasswordChangeToken");

      loginStudent({
        token,
        student,
      });

      navigate("/student/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Student password change error:",
        error.response?.data || error.message,
      );

      setError(
        error.response?.data?.message ||
          "Unable to change your password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = `
    w-full
    bg-slate-800
    border
    border-white/10
    text-white
    rounded-xl
    px-4
    py-3
    outline-none
    focus:border-green-500
    transition
  `;

  return (
    <div
      className="
        min-h-screen
        flex
        items-center
        justify-center
        bg-linear-to-br
        from-slate-950
        via-slate-900
        to-green-950
        px-4
        py-8
      "
    >
      <form
        onSubmit={handleSubmit}
        className="
          w-full
          max-w-md
          bg-slate-900/80
          backdrop-blur-xl
          border
          border-white/10
          shadow-2xl
          rounded-3xl
          p-8
        "
      >
        <div className="flex flex-col items-center mb-8">
          <div
            className="
              w-20
              h-20
              rounded-full
              bg-green-600
              flex
              items-center
              justify-center
              text-white
              text-3xl
              shadow-lg
              mb-4
            "
          >
            <FaLock />
          </div>

          <h1 className="text-3xl font-bold text-white text-center">
            Change Password
          </h1>

          <p className="text-gray-400 mt-2 text-center">
            You must create a new password before continuing.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            className="
              bg-red-600/20
              text-red-400
              border
              border-red-500/20
              p-3
              rounded-xl
              mb-5
              text-sm
            "
          >
            {error}
          </div>
        )}

        {/* NEW PASSWORD */}
        <div className="mb-5">
          <label
            htmlFor="new-password"
            className="text-gray-300 text-sm block mb-2"
          >
            New Password
          </label>

          <div className="relative">
            <FaLock
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-gray-500
              "
            />

            <input
              id="new-password"
              type={showNewPassword ? "text" : "password"}
              value={newPassword}
              onChange={(event) => {
                setNewPassword(event.target.value);
                setError("");
              }}
              className={`${inputStyle} pl-11 pr-12`}
              autoComplete="new-password"
              placeholder="Enter your new password"
              required
            />

            <button
              type="button"
              onClick={() => setShowNewPassword((current) => !current)}
              className="
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                text-gray-400
                hover:text-white
              "
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
        </div>

        {/* LIVE PASSWORD CHECKLIST */}
        <div
          className="
            bg-slate-800/70
            border
            border-white/5
            rounded-xl
            p-4
            mb-5
          "
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-300 font-medium text-sm">
              Password requirements
            </p>

            {allRequirementsMet && (
              <span className="text-green-400 text-xs font-medium">
                All satisfied
              </span>
            )}
          </div>

          <ul className="space-y-2">
            {passwordRequirements.map((requirement) => (
              <li
                key={requirement.label}
                className={`flex items-center gap-2 text-sm transition-colors ${
                  requirement.valid ? "text-green-400" : "text-gray-400"
                }`}
              >
                {requirement.valid ? (
                  <FaCheckCircle className="shrink-0" />
                ) : (
                  <FaCircle className="shrink-0 text-gray-600 text-[10px]" />
                )}

                <span>{requirement.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="mb-6">
          <label
            htmlFor="confirm-password"
            className="text-gray-300 text-sm block mb-2"
          >
            Confirm New Password
          </label>

          <div className="relative">
            <FaCheckCircle
              className={`
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                ${passwordsMatch ? "text-green-400" : "text-gray-500"}
              `}
            />

            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                setError("");
              }}
              className={`${inputStyle} pl-11 pr-12 ${
                confirmPassword && !passwordsMatch
                  ? "border-red-500/50"
                  : passwordsMatch
                    ? "border-green-500/50"
                    : ""
              }`}
              autoComplete="new-password"
              placeholder="Confirm your new password"
              required
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword((current) => !current)}
              className="
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                text-gray-400
                hover:text-white
              "
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          {confirmPassword && (
            <p
              className={`text-xs mt-2 ${
                passwordsMatch ? "text-green-400" : "text-red-400"
              }`}
            >
              {passwordsMatch ? "Passwords match." : "Passwords do not match."}
            </p>
          )}
        </div>

        {/* SUBMIT */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="
            w-full
            flex
            items-center
            justify-center
            gap-3
            bg-green-600
            hover:bg-green-700
            text-white
            py-3
            rounded-xl
            font-semibold
            transition
            disabled:opacity-40
            disabled:cursor-not-allowed
            disabled:hover:bg-green-600
          "
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin" />
              Changing Password...
            </>
          ) : (
            <>
              <FaLock />
              Change Password
            </>
          )}
        </button>

        <p className="text-center text-gray-500 text-xs mt-6">
          Tenneson Student Portal
        </p>
      </form>
    </div>
  );
}

export default StudentChangePassword;
