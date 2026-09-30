import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
  FaCheckCircle,
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

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      setError("Password must contain at least one lowercase letter.");
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError("Password must contain at least one number.");
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setError("Password must contain at least one special character.");
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

      /*
       * The temporary password-change token has now
       * served its purpose. Remove it.
       */
      sessionStorage.removeItem("studentPasswordChangeToken");

      /*
       * Store the normal student session.
       */
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
              onChange={(event) => setNewPassword(event.target.value)}
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

        <div className="mb-6">
          <label
            htmlFor="confirm-password"
            className="text-gray-300 text-sm block mb-2"
          >
            Confirm New Password
          </label>

          <div className="relative">
            <FaCheckCircle
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-gray-500
              "
            />

            <input
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className={`${inputStyle} pl-11 pr-12`}
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
        </div>

        <div
          className="
            bg-slate-800/70
            border
            border-white/5
            rounded-xl
            p-4
            mb-6
            text-sm
            text-gray-400
          "
        >
          <p className="text-gray-300 font-medium mb-2">
            Password requirements:
          </p>

          <ul className="space-y-1">
            <li>• At least 8 characters</li>
            <li>• At least one uppercase letter</li>
            <li>• At least one lowercase letter</li>
            <li>• At least one number</li>
            <li>• At least one special character</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
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
            disabled:opacity-50
            disabled:cursor-not-allowed
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
