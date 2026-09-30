import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  FaSchool,
  FaUser,
  FaLock,
  FaEye,
  FaEyeSlash,
  FaSpinner,
} from "react-icons/fa";

import studentApi from "../../api/studentApi";
import useStudentAuth from "../../hooks/useStudentAuth";

function StudentLogin() {
  const navigate = useNavigate();

  const { loginStudent } = useStudentAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const normalizedUsername = username.trim().toUpperCase();

    if (!normalizedUsername || !password) {
      setError("Student ID and password are required.");
      return;
    }

    try {
      setLoading(true);

      const response = await studentApi.post("/student/login", {
        username: normalizedUsername,
        password,
      });

      /*
       * First-login password change
       *
       * The backend returns a short-lived password-change
       * token instead of a normal student access token.
       */
      if (response.data.requiresPasswordChange) {
        const passwordChangeToken = response.data.passwordChangeToken;

        if (!passwordChangeToken) {
          setError(
            "Login succeeded, but no password-change session was provided.",
          );

          return;
        }

        /*
         * Keep the temporary password-change token separate
         * from the normal student authentication token.
         *
         * sessionStorage is intentional because this token
         * should not persist like the normal student session.
         */
        sessionStorage.setItem(
          "studentPasswordChangeToken",
          passwordChangeToken,
        );

        navigate("/student/change-password", {
          replace: true,
        });

        return;
      }

      /*
       * Normal student login
       */
      if (!response.data.token) {
        setError("Login succeeded but no student session was returned.");

        return;
      }

      loginStudent({
        token: response.data.token,
        student: response.data.student,
      });

      navigate("/student/dashboard", {
        replace: true,
      });
    } catch (error) {
      console.error(
        "Student login error:",
        error.response?.data || error.message,
      );

      setError(
        error.response?.data?.message ||
          "Unable to log in. Please check your Student ID and password.",
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
        <div
          className="
            flex
            flex-col
            items-center
            mb-8
          "
        >
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
            <FaSchool />
          </div>

          <h1
            className="
              text-3xl
              font-bold
              text-white
            "
          >
            Tenneson Portal
          </h1>

          <p
            className="
              text-gray-400
              mt-2
              text-center
            "
          >
            Student Login
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
            htmlFor="student-username"
            className="
              text-gray-300
              text-sm
              block
              mb-2
            "
          >
            Student ID
          </label>

          <div className="relative">
            <FaUser
              className="
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-gray-500
              "
            />

            <input
              id="student-username"
              name="username"
              type="text"
              placeholder="2026/TCC00001"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className={`${inputStyle} pl-11`}
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck="false"
              required
            />
          </div>
        </div>

        <div className="mb-6">
          <label
            htmlFor="student-password"
            className="
              text-gray-300
              text-sm
              block
              mb-2
            "
          >
            Password
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
              id="student-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={`${inputStyle} pl-11 pr-12`}
              autoComplete="current-password"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                text-gray-400
                hover:text-white
              "
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
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
              Logging in...
            </>
          ) : (
            <>
              <FaLock />
              Login
            </>
          )}
        </button>

        <p
          className="
            text-center
            text-gray-500
            text-xs
            mt-6
          "
        >
          Tenneson Student Portal
        </p>
      </form>
    </div>
  );
}

export default StudentLogin;
