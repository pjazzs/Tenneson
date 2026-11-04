import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaClipboardCheck,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaSyncAlt,
  FaUserGraduate,
  FaBookOpen,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

import teacherApi from "../../api/teacherApi";

const ITEMS_PER_PAGE = 5;

const TERM_LABELS = {
  first: "First Term",
  second: "Second Term",
  third: "Third Term",
};

const STATUS_CONFIG = {
  pending_teacher: {
    label: "Awaiting Your Response",
    className: "bg-amber-100 text-amber-800",
    icon: <FaClock />,
  },
  submitted: {
    label: "Submitted for Admin Review",
    className: "bg-blue-100 text-blue-800",
    icon: <FaCheckCircle />,
  },
  accepted: {
    label: "Accepted",
    className: "bg-emerald-100 text-emerald-800",
    icon: <FaCheckCircle />,
  },
  returned: {
    label: "Returned for Correction",
    className: "bg-red-100 text-red-800",
    icon: <FaExclamationCircle />,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-100 text-slate-600",
    icon: <FaExclamationCircle />,
  },
};

const formatDate = (value) => {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const getStudentName = (student) => {
  if (!student) return "Student not available";

  return (
    [student.firstName, student.otherName, student.lastName]
      .filter(Boolean)
      .join(" ") || "Student not available"
  );
};

const formatScore = (score) => {
  if (!score) return "Score unavailable";

  if (score.offered === false) {
    return "Subject not offered";
  }

  return `CA1: ${score.ca1 ?? 0}/20 | CA2: ${
    score.ca2 ?? 0
  }/10 | Exam: ${score.exam ?? 0}/70`;
};

const TeacherSubjectCorrectionRequests = () => {
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    let isMounted = true;

    const loadRequests = async () => {
      try {
        if (isMounted) {
          setError("");
          setRefreshing(true);
        }

        const response = await teacherApi.get(
          "/teacher/my-subject-corrections",
        );

        if (isMounted) {
          setRequests(response.data.requests || []);
          setCurrentPage(1);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Failed to load correction requests.",
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadRequests();

    return () => {
      isMounted = false;
    };
  }, [refreshCount]);

  const handleRefresh = () => {
    setRefreshCount((previous) => previous + 1);
  };

  const pendingRequests = requests.filter((item) =>
    ["pending_teacher", "returned"].includes(item.status),
  );

  const submittedRequests = requests.filter(
    (item) => item.status === "submitted",
  );

  const resolvedRequests = requests.filter((item) =>
    ["accepted", "cancelled"].includes(item.status),
  );

  // PAGINATION
  const totalPages = Math.ceil(requests.length / ITEMS_PER_PAGE);

  const safeCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, requests.length);

  const paginatedRequests = requests.slice(startIndex, endIndex);

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {/* SECTION HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-lg text-amber-700">
            <FaClipboardCheck />
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Published Result Correction Requests
            </h2>

            <p className="text-sm text-slate-500">
              Review correction requests sent to you by the administrator.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Refreshing..." : "Refresh Requests"}
        </button>
      </div>

      {/* SUMMARY */}
      {!loading && !error && (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-700">
              Awaiting Your Response
            </p>

            <p className="mt-2 text-2xl font-bold text-amber-800">
              {pendingRequests.length}
            </p>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">
              Submitted for Review
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-800">
              {submittedRequests.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-600">
              Resolved / Cancelled
            </p>

            <p className="mt-2 text-2xl font-bold text-slate-800">
              {resolvedRequests.length}
            </p>
          </div>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />

          <p className="text-sm font-medium text-slate-600">
            Loading your correction requests...
          </p>
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <FaExclamationCircle className="mx-auto mb-3 text-2xl text-red-500" />

          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={handleRefresh}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && requests.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <FaClipboardCheck className="mx-auto mb-3 text-3xl text-slate-400" />

          <h3 className="font-semibold text-slate-800">
            No correction requests
          </h3>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
            Published result correction requests assigned to you will appear
            here. You can refresh this section to check for new requests.
          </p>
        </div>
      )}

      {/* REQUEST LIST */}
      {!loading && !error && requests.length > 0 && (
        <>
          <div className="mt-6 space-y-5">
            {paginatedRequests.map((request) => {
              const student = request.student || {};
              const allocation = request.allocation || {};
              const schoolClass = allocation.schoolClass || {};
              const subject = request.subject || allocation.subject || {};
              const academicSession = request.academicSession || {};

              const status = STATUS_CONFIG[request.status] || {
                label: request.status || "Unknown",
                className: "bg-slate-100 text-slate-600",
                icon: <FaClipboardCheck />,
              };

              const canRespond = ["pending_teacher", "returned"].includes(
                request.status,
              );

              return (
                <article
                  key={request._id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-amber-300 hover:shadow-sm sm:p-6"
                >
                  {/* CARD TOP */}
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.icon}
                          {status.label}
                        </span>

                        <span className="text-xs text-slate-400">
                          Requested{" "}
                          {formatDate(request.requestedAt || request.createdAt)}
                        </span>
                      </div>

                      <h3 className="mt-3 text-lg font-bold text-slate-900">
                        {subject.name || "Subject not available"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {schoolClass.name || "Class not available"}
                        {allocation.department?.name
                          ? ` • ${allocation.department.name}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  {/* STUDENT AND SESSION */}
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
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
                        <FaCalendarAlt />
                        Academic Period
                      </div>

                      <p className="mt-2 font-semibold text-slate-800">
                        {academicSession.name || "Session unavailable"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {TERM_LABELS[request.term] ||
                          request.term ||
                          "Term unavailable"}
                      </p>
                    </div>
                  </div>

                  {/* ORIGINAL SCORE */}
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                      <FaBookOpen />
                      Original Published Score
                    </div>

                    <p className="mt-2 text-sm font-semibold text-blue-900">
                      {formatScore(request.originalScore)}
                    </p>
                  </div>

                  {/* ADMIN REASON */}
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      Administrator's Correction Reason
                    </p>

                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-900">
                      {request.requestReason || "No reason was provided."}
                    </p>
                  </div>

                  {/* RETURN NOTE */}
                  {request.status === "returned" && request.adminReviewNote && (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                        Administrator's Review Note
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-800">
                        {request.adminReviewNote}
                      </p>
                    </div>
                  )}

                  {/* TEACHER RESPONSE INFORMATION */}
                  {request.status === "submitted" && (
                    <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                      <p className="text-sm font-semibold text-blue-800">
                        Your proposed correction has been submitted.
                      </p>

                      <p className="mt-1 text-xs leading-5 text-blue-700">
                        The administrator will review your proposed score before
                        any change is made to the published result.
                      </p>

                      {request.submittedAt && (
                        <p className="mt-2 text-xs text-blue-600">
                          Submitted on {formatDate(request.submittedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {request.status === "accepted" && request.proposedScore && (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        Accepted Proposed Score
                      </p>

                      <p className="mt-2 text-sm font-semibold text-emerald-900">
                        {formatScore(request.proposedScore)}
                      </p>
                    </div>
                  )}

                  {/* ACTION */}
                  <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-slate-500">
                      {canRespond
                        ? "Please review the original score and submit your proposed correction."
                        : "This request is currently not awaiting a teacher response."}
                    </p>

                    {canRespond && (
                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/teacher/subject-corrections/${request._id}`,
                          )
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
                      >
                        <FaClipboardCheck />
                        {request.status === "returned"
                          ? "Revise Correction"
                          : "Review Correction"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col gap-4 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">
                  {startIndex + 1}-{endIndex}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-slate-700">
                  {requests.length}
                </span>{" "}
                correction requests
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => goToPage(safeCurrentPage - 1)}
                  disabled={safeCurrentPage === 1}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <FaChevronLeft />
                  Previous
                </button>

                {Array.from(
                  { length: totalPages },
                  (_, index) => index + 1,
                ).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => goToPage(page)}
                    aria-current={safeCurrentPage === page ? "page" : undefined}
                    className={`h-9 min-w-9 rounded-lg px-3 text-sm font-semibold transition ${
                      safeCurrentPage === page
                        ? "bg-amber-600 text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => goToPage(safeCurrentPage + 1)}
                  disabled={safeCurrentPage === totalPages}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <FaChevronRight />
                </button>
              </div>
            </div>
          )}

          {totalPages <= 1 && (
            <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-400">
              Showing all {requests.length} correction request
              {requests.length !== 1 ? "s" : ""}.
            </p>
          )}
        </>
      )}
    </section>
  );
};

export default TeacherSubjectCorrectionRequests;
