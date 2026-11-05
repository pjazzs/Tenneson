import { useCallback, useEffect, useState } from "react";

import {
  getSubjectResultCorrectionRequests,
  getSubjectResultCorrectionRequest,
  acceptSubjectResultCorrectionRequest,
  returnSubjectResultCorrectionRequest,
} from "../../api/subjectResultCorrectionApi";

const initialPagination = {
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};

const formatName = (student) =>
  [student?.firstName, student?.lastName, student?.otherName]
    .filter(Boolean)
    .join(" ") || "Unknown student";

const formatLabel = (value) =>
  String(value || "—")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      });
};

const getTotal = (score) => {
  if (!score || score.offered === false) return "Not offered";

  const values = [score.ca1, score.ca2, score.exam];

  if (values.some((value) => typeof value !== "number")) return "—";

  return values.reduce((sum, value) => sum + value, 0);
};

const ScoreComparison = ({ title, score }) => (
  <div className="rounded-xl border border-white/10 bg-slate-950/70 p-4">
    <h4 className="mb-3 text-sm font-semibold text-slate-200">{title}</h4>

    {score?.offered === false ? (
      <p className="text-sm text-amber-300">
        Student did not offer this subject.
      </p>
    ) : (
      <>
        <div className="grid grid-cols-3 gap-2">
          {[
            ["CA1", score?.ca1, 20],
            ["CA2", score?.ca2, 10],
            ["Exam", score?.exam, 70],
          ].map(([label, value, maximum]) => (
            <div key={label} className="rounded-lg bg-white/5 p-2">
              <p className="text-xs text-slate-500">{label}</p>
              <p className="mt-1 text-lg font-bold text-white">
                {value ?? "—"}
                <span className="ml-1 text-xs font-normal text-slate-500">
                  / {maximum}
                </span>
              </p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-sm text-slate-400">Total score</span>
          <span className="text-xl font-bold text-white">
            {getTotal(score)}
            {typeof getTotal(score) === "number" ? " / 100" : ""}
          </span>
        </div>
      </>
    )}

    <div className="mt-3 border-t border-white/10 pt-3">
      <p className="text-xs text-slate-500">Teacher comment</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-300">
        {score?.teacherComment?.trim() || "No comment provided."}
      </p>
    </div>
  </div>
);

const SubjectResultCorrectionReview = () => {
  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState(initialPagination);
  const [status, setStatus] = useState("submitted");
  const [page, setPage] = useState(1);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getSubjectResultCorrectionRequests({
        status,
        page,
        limit: 10,
      });

      setRequests(response.correctionRequests || []);
      setPagination(
        response.pagination || {
          page: 1,
          totalPages: 1,
          total: 0,
        },
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load subject correction requests.",
      );
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    window.scrollTo(0, 0);

    const timer = setTimeout(() => {
      fetchRequests();
    }, 0);

    return () => clearTimeout(timer);
  }, [fetchRequests]);

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
    setSelectedRequest(null);
    setReviewNote("");
  };

  const handleOpenRequest = async (requestId) => {
    try {
      setDetailLoading(true);
      setActionError("");
      setSelectedRequest(null);
      setReviewNote("");

      const response = await getSubjectResultCorrectionRequest(requestId);

      setSelectedRequest(response.correctionRequest || null);
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Unable to load the correction request details.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!selectedRequest?._id || actionLoading) return;

    if (
      !window.confirm(
        "Accept this teacher's proposed score? It will be merged into the parent correction draft. The published result will remain unchanged.",
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");

      await acceptSubjectResultCorrectionRequest(
        selectedRequest._id,
        reviewNote.trim(),
      );

      window.alert(
        "Teacher correction accepted and added to the parent correction draft. The published result remains unchanged.",
      );

      setSelectedRequest(null);
      setReviewNote("");
      await fetchRequests();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Unable to accept this correction request.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!selectedRequest?._id || actionLoading) return;

    const reason = reviewNote.trim();

    if (reason.length < 5) {
      setActionError("Enter a return explanation of at least 5 characters.");
      return;
    }

    if (
      !window.confirm(
        "Return this correction request to the teacher for revision?",
      )
    ) {
      return;
    }

    try {
      setActionLoading(true);
      setActionError("");

      await returnSubjectResultCorrectionRequest(selectedRequest._id, reason);

      window.alert("Correction request returned to the teacher.");

      setSelectedRequest(null);
      setReviewNote("");
      await fetchRequests();
    } catch (err) {
      setActionError(
        err.response?.data?.message ||
          "Unable to return this correction request.",
      );
    } finally {
      setActionLoading(false);
    }
  };

  const student = selectedRequest?.student || {};
  const subject =
    selectedRequest?.subject || selectedRequest?.allocation?.subject || {};
  const allocation = selectedRequest?.allocation || {};
  const teacher = selectedRequest?.originalSubmittingTeacher || {};

  const className =
    allocation?.schoolClass?.name ||
    selectedRequest?.result?.currentClass ||
    student?.currentClass ||
    "—";

  const canReview = selectedRequest?.status === "submitted";

  return (
    <section className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            Subject Correction Requests
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Review score corrections submitted by subject teachers.
          </p>
        </div>

        <span className="w-fit rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-300">
          {pagination.total} request{pagination.total === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {[
            ["submitted", "Awaiting Review"],
            ["accepted", "Accepted"],
            ["returned", "Returned"],
            ["pending_teacher", "With Teachers"],
            ["all", "All Requests"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => handleStatusChange(value)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                status === value
                  ? "border-indigo-500 bg-indigo-500/20 text-indigo-200"
                  : "border-white/10 bg-slate-900 text-slate-400 hover:bg-slate-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={fetchRequests}
          disabled={loading}
          className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">
          Loading correction requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
          <p className="font-medium text-slate-300">
            No correction requests found.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Requests matching this status will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const requestStudent = request.student || {};
            const requestSubject =
              request.subject || request.allocation?.subject || {};

            return (
              <div
                key={request._id}
                className="flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-white">
                    {formatName(requestStudent)}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {requestStudent.studentId || "—"} ·{" "}
                    {request.allocation?.schoolClass?.name ||
                      requestStudent.currentClass ||
                      "—"}
                  </p>

                  <p className="mt-2 text-sm font-medium text-indigo-300">
                    {requestSubject.name || "Unknown subject"}
                    {requestSubject.code ? ` (${requestSubject.code})` : ""}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {request.academicSession?.name || "—"} ·{" "}
                    {formatLabel(request.term)} Term · Submitted{" "}
                    {formatDate(request.submittedAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      request.status === "submitted"
                        ? "bg-amber-500/10 text-amber-300"
                        : request.status === "accepted"
                          ? "bg-emerald-500/10 text-emerald-300"
                          : request.status === "returned"
                            ? "bg-red-500/10 text-red-300"
                            : "bg-slate-500/10 text-slate-300"
                    }`}
                  >
                    {formatLabel(request.status)}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenRequest(request._id)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/10 pt-4">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.min(pagination.totalPages, current + 1),
                )
              }
              disabled={page >= pagination.totalPages}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {detailLoading && (
        <div className="rounded-xl border border-white/10 bg-slate-950/70 p-6 text-center text-sm text-slate-400">
          Loading request details...
        </div>
      )}

      {selectedRequest && (
        <div className="space-y-5 rounded-xl border border-indigo-500/30 bg-slate-900/80 p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">
                Correction Review
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {formatName(student)} · {subject.name || "Unknown subject"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedRequest(null);
                setReviewNote("");
                setActionError("");
              }}
              className="w-fit rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              Close Details
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Student ID", student.studentId],
              ["Class", className],
              ["Session", selectedRequest.academicSession?.name],
              ["Term", `${formatLabel(selectedRequest.term)} Term`],
              [
                "Teacher",
                teacher.fullName || selectedRequest.originalTeacherName,
              ],
              ["Teacher Email", teacher.email],
              ["Requested", formatDate(selectedRequest.requestedAt)],
              ["Teacher Submitted", formatDate(selectedRequest.submittedAt)],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-slate-950/60 p-3"
              >
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 wrap-break-word text-sm font-medium text-slate-200">
                  {value || "—"}
                </p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <h4 className="text-sm font-semibold text-amber-300">
              Administrator's Original Correction Reason
            </h4>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
              {selectedRequest.requestReason || "No reason recorded."}
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold text-white">
              Score Comparison
            </h4>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ScoreComparison
                title="Original Published Score"
                score={selectedRequest.originalScore}
              />

              <ScoreComparison
                title="Teacher's Proposed Score"
                score={selectedRequest.proposedScore}
              />
            </div>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <h4 className="text-sm font-semibold text-blue-300">
              Teacher's Explanation
            </h4>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-200">
              {selectedRequest.teacherReason || "No explanation provided."}
            </p>
          </div>

          {selectedRequest.adminReviewNote && (
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <h4 className="text-sm font-semibold text-slate-300">
                Previous Admin Review Note
              </h4>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-400">
                {selectedRequest.adminReviewNote}
              </p>
            </div>
          )}

          {canReview ? (
            <div className="space-y-3 border-t border-white/10 pt-5">
              <div>
                <label
                  htmlFor="subject-correction-review-note"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Admin Review Note
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    (Optional for acceptance; required for return)
                  </span>
                </label>

                <textarea
                  id="subject-correction-review-note"
                  rows={3}
                  maxLength={2000}
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                  placeholder="Enter your review note or explain what the teacher needs to correct..."
                  className="w-full rounded-lg border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                />

                <p className="mt-1 text-right text-xs text-slate-500">
                  {reviewNote.length}/2000
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleReturn}
                  disabled={actionLoading}
                  className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Return to Teacher"}
                </button>

                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={actionLoading}
                  className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {actionLoading ? "Processing..." : "Accept Proposed Score"}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-400">
              This request is no longer awaiting administrator review. Its
              current status is{" "}
              <span className="font-semibold text-slate-200">
                {formatLabel(selectedRequest.status)}
              </span>
              .
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default SubjectResultCorrectionReview;
