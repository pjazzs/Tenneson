import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
  FaUserGraduate,
  FaCalendarAlt,
  FaBook,
  FaChalkboardTeacher,
  FaSpinner,
} from "react-icons/fa";

import {
  getSubjectResultSubmission,
  approveSubjectResultSubmission,
  rejectSubjectResultSubmission,
} from "../../api/subjectResultReviewApi";

function SubjectResultSubmissionDetails() {
  const { submissionId } = useParams();
  const navigate = useNavigate();

  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadSubmission = async () => {
      try {
        const response = await getSubjectResultSubmission(submissionId);

        if (cancelled) return;

        setSubmission(response?.submission || null);
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Subject result submission details error:",
          err.response?.data || err.message,
        );

        setError(
          err.response?.data?.message ||
            "Failed to load subject result submission.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSubmission();

    return () => {
      cancelled = true;
    };
  }, [submissionId]);

  const formatLabel = (value) => {
    if (!value) return "N/A";

    return value.charAt(0).toUpperCase() + value.slice(1);
  };

  const formatDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleString();
  };

  const getStatusStyle = (status) => {
    const styles = {
      draft: "bg-slate-100 text-slate-700",
      submitted: "bg-blue-100 text-blue-700",
      approved: "bg-green-100 text-green-700",
      rejected: "bg-red-100 text-red-700",
    };

    return styles[status] || "bg-slate-100 text-slate-700";
  };

  const getScoreTotal = (student) => {
    if (!student.offered) return null;

    return (
      Number(student.ca1 || 0) +
      Number(student.ca2 || 0) +
      Number(student.exam || 0)
    );
  };

  const handleApprove = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to approve this teacher's subject result submission?",
    );

    if (!confirmed) return;

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await approveSubjectResultSubmission(submissionId);

      setSubmission(response?.submission || submission);

      setSuccess(
        response?.message || "Subject result submission approved successfully.",
      );
    } catch (err) {
      console.error(
        "Subject result approval error:",
        err.response?.data || err.message,
      );

      setError(
        err.response?.data?.message || "Unable to approve this submission.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();

    const reason = rejectionReason.trim();

    if (!reason) {
      setError("Please provide a reason for rejecting this submission.");
      return;
    }

    if (reason.length > 1000) {
      setError("The rejection reason cannot exceed 1000 characters.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await rejectSubjectResultSubmission(
        submissionId,
        reason,
      );

      setSubmission(response?.submission || submission);
      setRejectionReason("");
      setShowRejectForm(false);

      setSuccess(
        response?.message || "Submission rejected and returned to the teacher.",
      );
    } catch (err) {
      console.error(
        "Subject result rejection error:",
        err.response?.data || err.message,
      );

      setError(
        err.response?.data?.message || "Unable to reject this submission.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <FaSpinner className="animate-spin text-3xl text-green-600" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="font-medium text-red-700">
          {error || "Subject result submission not found."}
        </p>

        <button
          type="button"
          onClick={() => navigate("/subject-result-review")}
          className="mt-4 text-sm font-semibold text-green-700 hover:underline"
        >
          Back to Subject Result Review
        </button>
      </div>
    );
  }

  const allocation = submission.allocation || {};
  const responsibility = submission.responsibility || {};
  const teacher = responsibility.teacherAssignment?.teacher;

  const canReview = submission.status === "submitted";

  return (
    <div className="space-y-6">
      {/* PAGE HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button
            type="button"
            onClick={() => navigate("/subject-result-review")}
            className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-green-700"
          >
            <FaArrowLeft />
            Back to submissions
          </button>

          <h1 className="text-2xl font-bold text-slate-800">
            Subject Result Review
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Review the scores submitted by the designated teacher.
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-4 py-2 text-sm font-semibold ${getStatusStyle(
            submission.status,
          )}`}
        >
          {formatLabel(submission.status)}
        </span>
      </div>

      {/* FEEDBACK */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* SUBMISSION INFORMATION */}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          icon={<FaUserGraduate />}
          label="Class"
          value={allocation.schoolClass?.name || "N/A"}
        />

        <InfoCard
          icon={<FaBook />}
          label="Subject"
          value={allocation.subject?.name || "N/A"}
        />

        <InfoCard
          icon={<FaChalkboardTeacher />}
          label="Department"
          value={allocation.department?.name || "General"}
        />

        <InfoCard
          icon={<FaCalendarAlt />}
          label="Academic Session"
          value={submission.academicSession?.name || "N/A"}
        />
      </div>

      {/* TEACHER AND TERM INFORMATION */}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Submission Information
        </h2>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem
            label="Designated Teacher"
            value={teacher?.fullName || "Unknown Teacher"}
          />

          <DetailItem
            label="Academic Term"
            value={`${formatLabel(submission.term)} Term`}
          />

          <DetailItem
            label="Submitted At"
            value={formatDate(submission.submittedAt)}
          />

          <DetailItem
            label="Last Updated"
            value={formatDate(submission.updatedAt)}
          />

          <DetailItem
            label="Number of Students"
            value={submission.studentResults?.length || 0}
          />

          <DetailItem
            label="Submission Status"
            value={formatLabel(submission.status)}
          />
        </div>
      </div>

      {/* STUDENT SCORES */}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-lg font-semibold text-slate-800">
            Student Scores
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            CA1: 20 marks | CA2: 10 marks | Examination: 70 marks
          </p>
        </div>

        {submission.studentResults?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-21 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-4 py-4">S/N</th>
                  <th className="px-4 py-4">Student ID</th>
                  <th className="px-4 py-4">Student Name</th>
                  <th className="px-4 py-4 text-center">Offered</th>
                  <th className="px-4 py-4 text-center">CA1 / 20</th>
                  <th className="px-4 py-4 text-center">CA2 / 10</th>
                  <th className="px-4 py-4 text-center">Exam / 70</th>
                  <th className="px-4 py-4 text-center">Total / 100</th>
                  <th className="px-4 py-4">Teacher Comment</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {submission.studentResults.map((student, index) => (
                  <tr
                    key={student._id || student.student}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">{index + 1}</td>

                    <td className="px-4 py-4 font-medium text-slate-700">
                      {student.studentId || "N/A"}
                    </td>

                    <td className="px-4 py-4 font-medium text-slate-800">
                      {student.studentName || "N/A"}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {student.offered ? "Yes" : "No"}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {student.offered ? (student.ca1 ?? "—") : "—"}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {student.offered ? (student.ca2 ?? "—") : "—"}
                    </td>

                    <td className="px-4 py-4 text-center">
                      {student.offered ? (student.exam ?? "—") : "—"}
                    </td>

                    <td className="px-4 py-4 text-center font-bold">
                      {getScoreTotal(student) ?? "—"}
                    </td>

                    <td className="max-w-55px-4 py-4 text-slate-600">
                      {student.teacherComment || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-sm text-slate-500">
            No student scores were found in this submission.
          </div>
        )}
      </div>

      {/* CURRENT REJECTION DETAILS */}

      {submission.status === "rejected" && submission.rejectionReason && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h2 className="font-semibold text-red-800">
            Current Rejection Reason
          </h2>

          <p className="mt-2 whitespace-pre-wrap text-sm text-red-700">
            {submission.rejectionReason}
          </p>

          <p className="mt-3 text-xs text-red-600">
            Rejected on: {formatDate(submission.rejectedAt)}
          </p>
        </div>
      )}

      {/* REJECTION HISTORY */}

      {submission.rejectionHistory?.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            Rejection History
          </h2>

          <div className="space-y-4">
            {submission.rejectionHistory.map((item, index) => (
              <div
                key={item._id || index}
                className="rounded-lg border border-red-100 bg-red-50 p-4"
              >
                <p className="text-sm font-semibold text-red-800">
                  Rejection {index + 1}
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {item.reason}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {formatDate(item.rejectedAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* REVIEW ACTIONS */}

      {canReview && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">
            Review Decision
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Approve this submission if the scores are correct, or reject it with
            a clear reason for the teacher to make corrections.
          </p>

          {!showRejectForm ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleApprove}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {actionLoading ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <FaCheckCircle />
                )}
                Approve Submission
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setShowRejectForm(true);
                }}
                disabled={actionLoading}
                className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <FaTimesCircle />
                Reject Submission
              </button>
            </div>
          ) : (
            <form onSubmit={handleReject} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="rejectionReason"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Reason for rejection
                </label>

                <textarea
                  id="rejectionReason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  maxLength={1000}
                  rows={4}
                  required
                  placeholder="Explain what needs to be corrected by the teacher..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {rejectionReason.length}/1000 characters
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={actionLoading || !rejectionReason.trim()}
                  className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {actionLoading ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    <FaTimesCircle />
                  )}
                  Confirm Rejection
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowRejectForm(false);
                    setRejectionReason("");
                    setError("");
                  }}
                  disabled={actionLoading}
                  className="rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {!canReview && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          This submission is currently <strong>{submission.status}</strong>. No
          review action is available.
        </div>
      )}
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-green-50 text-lg text-green-700">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-1 truncate font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-medium text-slate-800">{value}</p>
    </div>
  );
}

export default SubjectResultSubmissionDetails;
