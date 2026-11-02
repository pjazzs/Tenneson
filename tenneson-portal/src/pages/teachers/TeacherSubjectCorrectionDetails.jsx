import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaBookOpen,
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardCheck,
  FaExclamationCircle,
  FaSave,
  FaUserGraduate,
} from "react-icons/fa";

import teacherApi from "../../api/teacherApi";

const TERM_LABELS = {
  first: "First Term",
  second: "Second Term",
  third: "Third Term",
};

const SCORE_FIELDS = [
  { key: "ca1", label: "CA1", maximum: 20 },
  { key: "ca2", label: "CA2", maximum: 10 },
  { key: "exam", label: "Examination", maximum: 70 },
];

const formatDate = (value) => {
  if (!value) return "Unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unavailable";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getStudentName = (student) => {
  if (!student) return "Student unavailable";

  return (
    [student.firstName, student.otherName, student.lastName]
      .filter(Boolean)
      .join(" ") || "Student unavailable"
  );
};

const getInitialScore = (score) => ({
  ca1: score?.ca1 ?? "",
  ca2: score?.ca2 ?? "",
  exam: score?.exam ?? "",
  teacherComment: score?.teacherComment || "",
});

const formatScore = (score) => {
  if (!score) return "Score unavailable";

  if (score.offered === false) {
    return "Subject not offered";
  }

  return `CA1: ${score.ca1 ?? 0}/20 | CA2: ${
    score.ca2 ?? 0
  }/10 | Exam: ${score.exam ?? 0}/70`;
};

function TeacherSubjectCorrectionDetails() {
  const { requestId } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [scores, setScores] = useState({
    ca1: "",
    ca2: "",
    exam: "",
    teacherComment: "",
  });
  const [teacherReason, setTeacherReason] = useState("");
  const [canSubmit, setCanSubmit] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let isMounted = true;

    teacherApi
      .get(`/teacher/subject-corrections/${requestId}`)
      .then((response) => {
        if (!isMounted) return;

        const fetchedRequest = response.data.request;

        setRequest(fetchedRequest);
        setCanSubmit(response.data.canSubmit === true);

        const initialScore =
          fetchedRequest.proposedScore || fetchedRequest.originalScore;

        setScores(getInitialScore(initialScore));
        setTeacherReason(fetchedRequest.teacherReason || "");
      })
      .catch((err) => {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load this correction request.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [requestId]);

  const handleScoreChange = (field, value, maximum) => {
    if (value !== "") {
      const numericValue = Number(value);

      if (
        !Number.isFinite(numericValue) ||
        numericValue < 0 ||
        numericValue > maximum
      ) {
        return;
      }
    }

    setScores((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!request || !canSubmit || submitting) return;

    const reason = teacherReason.trim();

    if (reason.length < 5) {
      setError("Please provide an explanation of at least 5 characters.");
      return;
    }

    if (reason.length > 1000) {
      setError("Your explanation cannot exceed 1000 characters.");
      return;
    }

    const subjectOffered = request.originalScore?.offered !== false;

    const proposedScore = {
      offered: subjectOffered,
      ca1: null,
      ca2: null,
      exam: null,
      teacherComment: scores.teacherComment.trim(),
    };

    if (subjectOffered) {
      for (const field of SCORE_FIELDS) {
        const value = scores[field.key];

        if (value === "" || value === null || value === undefined) {
          setError(`${field.label} score is required.`);
          return;
        }

        const numericValue = Number(value);

        if (
          !Number.isFinite(numericValue) ||
          numericValue < 0 ||
          numericValue > field.maximum
        ) {
          setError(`${field.label} must be between 0 and ${field.maximum}.`);
          return;
        }

        proposedScore[field.key] = numericValue;
      }
    }

    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const response = await teacherApi.put(
        `/teacher/subject-corrections/${requestId}/submit`,
        {
          proposedScore,
          teacherReason: reason,
        },
      );

      const savedRequest = response.data.request;

      setRequest((previous) => ({
        ...previous,
        ...savedRequest,
      }));

      setCanSubmit(false);

      setSuccess(
        response.data.message ||
          "Your proposed correction has been submitted for administrator review.",
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to submit your proposed correction. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const student = request?.student || {};
  const allocation = request?.allocation || {};
  const subject = request?.subject || allocation.subject || {};
  const schoolClass = allocation.schoolClass || {};
  const academicSession = request?.academicSession || {};

  const originalScore = request?.originalScore;
  const proposedScore = request?.proposedScore;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          <p className="text-sm font-medium text-slate-600">
            Loading correction request...
          </p>
        </div>
      </div>
    );
  }

  if (error && !request) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <FaExclamationCircle className="mx-auto mb-4 text-3xl text-red-500" />

          <h2 className="text-lg font-bold text-slate-900">
            Unable to Open Correction Request
          </h2>

          <p className="mt-3 text-sm leading-6 text-red-700">{error}</p>

          <button
            type="button"
            onClick={() => navigate("/teacher/dashboard")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <FaArrowLeft />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const subjectOffered = originalScore?.offered !== false;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Tenneson</h1>
            <p className="text-xs text-slate-500">Teacher Portal</p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/teacher/dashboard")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            <FaArrowLeft />
            Dashboard
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-700">
            Published Result Correction
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
            Review Correction Request
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Review the administrator's request, verify the original score, and
            submit your proposed correction for approval.
          </p>
        </div>

        {success && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <FaCheckCircle className="mt-0.5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <FaExclamationCircle className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* REQUEST INFORMATION */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <FaClipboardCheck />
            </div>

            <div>
              <h3 className="font-bold text-slate-900">
                Correction Request Details
              </h3>
              <p className="text-xs text-slate-500">
                Request date:{" "}
                {formatDate(request?.requestedAt || request?.createdAt)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <FaUserGraduate />
                Student
              </div>

              <p className="mt-2 font-semibold text-slate-800">
                {getStudentName(student)}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Student ID: {student.studentId || "Unavailable"}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <FaBookOpen />
                Subject and Class
              </div>

              <p className="mt-2 font-semibold text-slate-800">
                {subject.name || "Subject unavailable"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {schoolClass.name || "Class unavailable"}
                {allocation.department?.name
                  ? ` • ${allocation.department.name}`
                  : ""}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <FaCalendarAlt />
                Academic Period
              </div>

              <p className="mt-2 font-semibold text-slate-800">
                {academicSession.name || "Session unavailable"}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {TERM_LABELS[request?.term] ||
                  request?.term ||
                  "Term unavailable"}
              </p>
            </div>
          </div>
        </section>

        {/* ADMINISTRATOR'S REASON */}
        <section className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-amber-800">
            Administrator's Correction Reason
          </h3>

          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-amber-950">
            {request?.requestReason || "No reason was provided."}
          </p>

          {request?.status === "returned" && request?.adminReviewNote && (
            <div className="mt-5 border-t border-amber-200 pt-4">
              <h4 className="text-sm font-bold text-red-700">
                Administrator's Review Note
              </h4>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-800">
                {request.adminReviewNote}
              </p>
            </div>
          )}
        </section>

        {/* ORIGINAL SCORE */}
        <section className="mb-6 rounded-2xl border border-blue-200 bg-white p-5 shadow-sm sm:p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-blue-700">
            Original Published Score
          </h3>

          <p className="mt-3 text-lg font-bold text-slate-900">
            {formatScore(originalScore)}
          </p>

          {originalScore?.teacherComment && (
            <div className="mt-4 rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Original Teacher Comment
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-blue-900">
                {originalScore.teacherComment}
              </p>
            </div>
          )}
        </section>

        {/* TEACHER PROPOSAL */}
        {canSubmit ? (
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
          >
            <div className="mb-5">
              <h3 className="text-lg font-bold text-slate-900">
                Your Proposed Correction
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Enter the corrected scores below. Your submission will be
                reviewed by the administrator before the published result is
                changed.
              </p>
            </div>

            {!subjectOffered ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-700">
                  This student was marked as not offering this subject.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  The subject-offered status cannot be changed through this
                  correction request. You can still provide your explanation.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  {SCORE_FIELDS.map((field) => (
                    <div key={field.key}>
                      <label
                        htmlFor={field.key}
                        className="mb-2 block text-sm font-semibold text-slate-700"
                      >
                        {field.label} (0–{field.maximum})
                      </label>

                      <input
                        id={field.key}
                        type="number"
                        min="0"
                        max={field.maximum}
                        step="any"
                        required
                        value={scores[field.key]}
                        onChange={(event) =>
                          handleScoreChange(
                            field.key,
                            event.target.value,
                            field.maximum,
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="teacherComment"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Teacher Comment
                    <span className="ml-2 font-normal text-slate-400">
                      Optional
                    </span>
                  </label>

                  <textarea
                    id="teacherComment"
                    rows="3"
                    maxLength="1000"
                    value={scores.teacherComment}
                    onChange={(event) =>
                      setScores((previous) => ({
                        ...previous,
                        teacherComment: event.target.value,
                      }))
                    }
                    placeholder="Enter an optional comment for this student's result..."
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />

                  <p className="mt-1 text-right text-xs text-slate-400">
                    {scores.teacherComment.length}/1000
                  </p>
                </div>
              </>
            )}

            <div className="mt-6">
              <label
                htmlFor="teacherReason"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Explanation for Your Proposed Correction
                <span className="ml-1 text-red-600">*</span>
              </label>

              <textarea
                id="teacherReason"
                rows="4"
                minLength="5"
                maxLength="1000"
                required
                value={teacherReason}
                onChange={(event) => setTeacherReason(event.target.value)}
                placeholder="Explain why this score needs to be corrected..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <p className="mt-1 text-right text-xs text-slate-400">
                {teacherReason.length}/1000 (minimum 5 characters)
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm leading-6 text-amber-900">
                Submitting this proposal does not immediately change the
                published result. The administrator must review and accept your
                proposed correction.
              </p>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => navigate("/teacher/dashboard")}
                disabled={submitting}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaSave />
                {submitting ? "Submitting..." : "Submit Proposed Correction"}
              </button>
            </div>
          </form>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3">
              <FaCheckCircle className="mt-1 text-xl text-emerald-600" />

              <div>
                <h3 className="font-bold text-slate-900">
                  {request?.status === "submitted"
                    ? "Correction Submitted"
                    : request?.status === "accepted"
                      ? "Correction Accepted"
                      : request?.status === "cancelled"
                        ? "Request Cancelled"
                        : "Teacher Response Unavailable"}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {request?.status === "submitted"
                    ? "Your proposed correction has been submitted and is awaiting administrator review. The published result has not been changed by this submission."
                    : request?.status === "accepted"
                      ? "The administrator has accepted your proposed correction."
                      : request?.status === "cancelled"
                        ? "This correction request has been cancelled."
                        : "This request is no longer available for a teacher response."}
                </p>

                {proposedScore && (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Your Proposed Score
                    </p>
                    <p className="mt-2 text-sm font-bold text-emerald-900">
                      {formatScore(proposedScore)}
                    </p>
                  </div>
                )}

                {request?.teacherReason && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Your Explanation
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {request.teacherReason}
                    </p>
                  </div>
                )}

                {request?.submittedAt && (
                  <p className="mt-4 text-xs text-slate-500">
                    Submitted on {formatDate(request.submittedAt)}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/teacher/dashboard")}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <FaArrowLeft />
              Back to Dashboard
            </button>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        Tenneson Teacher Portal
        <p className="mt-1">Created by PjazzDev</p>
      </footer>
    </div>
  );
}

export default TeacherSubjectCorrectionDetails;
