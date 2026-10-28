import { useState } from "react";
import { FaKey, FaCopy, FaSpinner, FaCheck } from "react-icons/fa";
import api from "../../api/axios";

function ResetStudentPassword({ student }) {
  const [showModal, setShowModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const resetPassword = async () => {
    try {
      setResetting(true);
      setError("");
      setTemporaryPassword("");
      setCopied(false);

      // Omitting password makes the backend generate
      // a secure temporary password automatically.
      const response = await api.patch(
        `/students/${encodeURIComponent(student.studentId)}/reset-password`,
        {},
      );

      const password = response.data?.studentCredential?.temporaryPassword;

      if (!password) {
        throw new Error(
          "The password was reset, but the temporary password was not returned. Contact your system administrator.",
        );
      }

      setTemporaryPassword(password);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Unable to reset the student's password.",
      );
    } finally {
      setResetting(false);
    }
  };

  const closeModal = () => {
    if (resetting) return;

    setShowModal(false);
    setTemporaryPassword("");
    setError("");
    setCopied(false);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
    } catch {
      setError(
        "Unable to copy automatically. Select the password and copy it manually.",
      );
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
          setError("");
        }}
        className="flex items-center justify-center gap-2 px-3 py-2 min-h-10 rounded-lg text-xs whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white transition"
        title="Reset student password"
      >
        <FaKey />
        <span>Reset Password</span>
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={closeModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-password-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start gap-3">
              <div className="rounded-xl bg-amber-500/15 p-3 text-amber-400">
                <FaKey size={20} />
              </div>

              <div>
                <h2 id="reset-password-title" className="text-xl font-bold">
                  Reset Student Password
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  {student.firstName} {student.lastName}
                </p>

                <p className="text-sm text-gray-400">
                  Student ID: {student.studentId}
                </p>
              </div>
            </div>

            {!temporaryPassword && !error && (
              <p className="mb-5 text-sm leading-6 text-gray-300">
                This will replace the student's current password and sign out
                existing sessions. The student must choose a new password after
                logging in.
              </p>
            )}

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300"
              >
                {error}
              </div>
            )}

            {temporaryPassword && (
              <div className="mb-5">
                <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                  <p className="mb-2 text-sm font-medium text-green-300">
                    Password reset successfully
                  </p>

                  <p className="text-xs text-gray-300">
                    Give this temporary password to the verified student or
                    their authorized guardian through a secure channel.
                  </p>
                </div>

                <label
                  htmlFor="temporary-password"
                  className="mb-2 block text-sm text-gray-300"
                >
                  Temporary password
                </label>

                <div className="flex gap-2">
                  <input
                    id="temporary-password"
                    type="text"
                    readOnly
                    value={temporaryPassword}
                    className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-3 font-mono text-sm"
                    onFocus={(e) => e.target.select()}
                  />

                  <button
                    type="button"
                    onClick={copyPassword}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm hover:bg-blue-700"
                  >
                    {copied ? <FaCheck /> : <FaCopy />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>

                <p className="mt-3 text-xs text-amber-300">
                  This password is displayed only in this dialog. Save it
                  securely before closing.
                </p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeModal}
                disabled={resetting}
                className="rounded-lg border border-white/10 px-4 py-2.5 text-sm hover:bg-white/5 disabled:opacity-50"
              >
                {temporaryPassword ? "Close" : "Cancel"}
              </button>

              {!temporaryPassword && (
                <button
                  type="button"
                  onClick={resetPassword}
                  disabled={resetting}
                  className="flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {resetting ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <FaKey />
                      Confirm Reset
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ResetStudentPassword;
