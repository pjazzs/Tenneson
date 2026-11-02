import { useState } from "react";
import { createSubjectResultCorrectionRequest } from "../../api/resultApi";

const SubjectResultCorrectionRequest = ({ result, onCreated }) => {
  const [subjectId, setSubjectId] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const subjectResults = Array.isArray(result?.subjectResults)
    ? result.subjectResults
    : [];

  const getSubjectId = (subjectResult) => {
    if (!subjectResult) return "";

    if (subjectResult.subject && typeof subjectResult.subject === "object") {
      return subjectResult.subject._id || subjectResult.subject.id || "";
    }

    return (
      subjectResult.subjectId ||
      (typeof subjectResult.subject === "string" ? subjectResult.subject : "")
    );
  };

  const getSubjectName = (subjectResult) => {
    if (!subjectResult) return "Unknown Subject";

    if (subjectResult.subject && typeof subjectResult.subject === "object") {
      return (
        subjectResult.subject.name ||
        subjectResult.subjectName ||
        "Unknown Subject"
      );
    }

    return (
      subjectResult.subjectName ||
      subjectResult.subject ||
      subjectResult.name ||
      "Unknown Subject"
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!subjectId) {
      setError("Please select the subject that needs correction.");
      return;
    }

    if (reason.trim().length < 5) {
      setError("The correction reason must contain at least 5 characters.");
      return;
    }

    if (reason.trim().length > 1000) {
      setError("The correction reason cannot exceed 1000 characters.");
      return;
    }

    try {
      setLoading(true);

      const response = await createSubjectResultCorrectionRequest(result._id, {
        subjectId,
        reason: reason.trim(),
      });

      setMessage(
        response?.message || "Subject correction request created successfully.",
      );

      setSubjectId("");
      setReason("");

      if (onCreated) {
        onCreated();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Could not create the subject correction request.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!result || result.status !== "published") {
    return null;
  }

  return (
    <div className="mt-6 rounded-xl border border-indigo-500/20 bg-slate-900/70 p-5">
      <div className="mb-4">
        <h4 className="text-base font-semibold text-white">
          Request Individual Subject Correction
        </h4>

        <p className="mt-1 text-sm text-slate-400">
          Select the affected subject and explain the correction. The request
          will be routed to the responsible subject teacher.
        </p>
      </div>

      {message && (
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="correction-subject"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Subject
          </label>

          <select
            id="correction-subject"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-indigo-500 disabled:opacity-50"
          >
            <option value="">Select subject</option>

            {subjectResults.map((subjectResult, index) => {
              const id = getSubjectId(subjectResult);

              if (!id) return null;

              return (
                <option key={id || index} value={id}>
                  {getSubjectName(subjectResult)}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label
            htmlFor="correction-reason"
            className="mb-2 block text-sm font-medium text-slate-300"
          >
            Reason for Correction
          </label>

          <textarea
            id="correction-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={loading}
            rows={4}
            maxLength={1000}
            placeholder="Explain why this subject result needs correction..."
            className="w-full rounded-lg border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-indigo-500 disabled:opacity-50"
          />

          <p className="mt-1 text-right text-xs text-slate-500">
            {reason.length}/1000 characters
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || subjectResults.length === 0}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending Request..." : "Send Correction Request"}
        </button>
      </form>
    </div>
  );
};

export default SubjectResultCorrectionRequest;
