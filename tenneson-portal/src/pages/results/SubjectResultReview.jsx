import { useEffect, useState } from "react";
import { FaClipboardCheck, FaEye, FaFilter, FaSyncAlt } from "react-icons/fa";

import { getSubjectResultSubmissions } from "../../api/subjectResultReviewApi";
import { getAcademicSessions } from "../../api/academicSessionApi";
import { useNavigate } from "react-router-dom";

const SubjectResultReview = () => {
  const [submissions, setSubmissions] = useState([]);
  const [academicSessions, setAcademicSessions] = useState([]);

  const [status, setStatus] = useState("");
  const [academicSessionId, setAcademicSessionId] = useState("");
  const [term, setTerm] = useState("");

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  /*
  |--------------------------------------------------------------------------
  | HELPERS
  |--------------------------------------------------------------------------
  */

  const formatLabel = (value) => {
    if (!value) return "—";

    return String(value)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (character) => character.toUpperCase());
  };

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusStyle = (value) => {
    const styles = {
      draft: "bg-slate-500/10 text-slate-300 border-slate-500/20",
      submitted: "bg-amber-500/10 text-amber-300 border-amber-500/20",
      approved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
      rejected: "bg-red-500/10 text-red-300 border-red-500/20",
    };

    return (
      styles[value] || "bg-slate-500/10 text-slate-300 border-slate-500/20"
    );
  };

  const getTeacherName = (submission) => {
    return (
      submission?.responsibility?.teacherAssignment?.teacher?.fullName ||
      submission?.submittedByTeacher?.fullName ||
      submission?.createdByTeacher?.fullName ||
      "Unknown Teacher"
    );
  };

  const getAllocationDetails = (submission) => {
    const allocation = submission?.allocation;

    return {
      schoolClass: allocation?.schoolClass?.name || "Unknown Class",
      department: allocation?.department?.name || "General",
      subject: allocation?.subject?.name || "Unknown Subject",
      subjectCode: allocation?.subject?.code || "",
    };
  };

  /*
  |--------------------------------------------------------------------------
  | FETCH ACADEMIC SESSIONS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      try {
        const response = await getAcademicSessions();

        if (!cancelled) {
          setAcademicSessions(response?.academicSessions || []);
        }
      } catch (err) {
        console.error(
          "Failed to load academic sessions:",
          err.response?.data || err.message,
        );
      }
    };

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, [page, status, academicSessionId, term, refreshKey]);

  /*
  |--------------------------------------------------------------------------
  | FETCH SUBJECT RESULT SUBMISSIONS
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;

    const loadSubmissions = async () => {
      try {
        const params = {
          page,
          limit: 20,
        };

        if (status) params.status = status;
        if (academicSessionId) {
          params.academicSessionId = academicSessionId;
        }
        if (term) params.term = term;

        const response = await getSubjectResultSubmissions(params);

        if (cancelled) return;

        setSubmissions(response?.submissions || []);

        setPagination(
          response?.pagination || {
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        );

        setError("");
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Subject result submissions error:",
          err.response?.data || err.message,
        );

        setError(
          err.response?.data?.message ||
            "Failed to load subject result submissions.",
        );

        setSubmissions([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSubmissions();

    return () => {
      cancelled = true;
    };
  }, [page, status, academicSessionId, term, refreshKey]);
  /*
  |--------------------------------------------------------------------------
  | FILTER HANDLERS
  |--------------------------------------------------------------------------
  */

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  const handleSessionChange = (event) => {
    setAcademicSessionId(event.target.value);
    setPage(1);
  };

  const handleTermChange = (event) => {
    setTerm(event.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setStatus("");
    setAcademicSessionId("");
    setTerm("");
    setPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | PAGINATION
  |--------------------------------------------------------------------------
  */

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage((current) => current - 1);
    }
  };

  const handleNextPage = () => {
    if (page < pagination.totalPages) {
      setPage((current) => current + 1);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | MAIN UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 text-white sm:p-6">
      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold sm:text-3xl">
            <FaClipboardCheck />
            Subject Result Review
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Review teacher-submitted subject score sheets before accepting them.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            setRefreshKey((current) => current + 1);
          }}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-3 font-semibold transition hover:bg-slate-700 disabled:opacity-50"
        >
          <FaSyncAlt className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* SUMMARY */}

      <div className="rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm text-slate-400">Total matching submissions</p>

        <p className="mt-2 text-3xl font-bold">{pagination.total}</p>
      </div>

      {/* FILTERS */}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="mb-4 flex items-center gap-2">
          <FaFilter className="text-green-400" />
          <h2 className="font-semibold">Filter Submissions</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* STATUS */}

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Submission Status
            </label>

            <select
              value={status}
              onChange={handleStatusChange}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-green-500"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* SESSION */}

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Academic Session
            </label>

            <select
              value={academicSessionId}
              onChange={handleSessionChange}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-green-500"
            >
              <option value="">All Sessions</option>

              {academicSessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.name}
                </option>
              ))}
            </select>
          </div>

          {/* TERM */}

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Academic Term
            </label>

            <select
              value={term}
              onChange={handleTermChange}
              className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-green-500"
            >
              <option value="">All Terms</option>
              <option value="first">First Term</option>
              <option value="second">Second Term</option>
              <option value="third">Third Term</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={handleResetFilters}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
          >
            Reset Filters
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* SUBMISSIONS */}

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold">Teacher Submissions</h2>
          <p className="mt-1 text-xs text-slate-500">
            Showing {submissions.length} of {pagination.total} submissions
          </p>
        </div>

        {loading ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">
            Loading subject result submissions...
          </div>
        ) : submissions.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <FaClipboardCheck className="mx-auto mb-4 text-4xl text-slate-600" />

            <h3 className="font-semibold text-slate-300">
              No submissions found
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              There are no subject result submissions matching these filters.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE */}

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-4">Class</th>
                    <th className="px-5 py-4">Department</th>
                    <th className="px-5 py-4">Subject</th>
                    <th className="px-5 py-4">Teacher</th>
                    <th className="px-5 py-4">Session / Term</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Submitted</th>
                    <th className="px-5 py-4">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {submissions.map((submission) => {
                    const allocation = getAllocationDetails(submission);

                    return (
                      <tr
                        key={submission._id}
                        className="transition hover:bg-white/5"
                      >
                        <td className="px-5 py-4 font-medium">
                          {allocation.schoolClass}
                        </td>

                        <td className="px-5 py-4 text-slate-300">
                          {allocation.department}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-white">
                            {allocation.subject}
                          </p>

                          {allocation.subjectCode && (
                            <p className="mt-1 text-xs text-slate-500">
                              {allocation.subjectCode}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-slate-300">
                          {getTeacherName(submission)}
                        </td>

                        <td className="px-5 py-4">
                          <p>{submission.academicSession?.name || "—"}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatLabel(submission.term)} Term
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusStyle(
                              submission.status,
                            )}`}
                          >
                            {formatLabel(submission.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-slate-400">
                          {formatDate(submission.submittedAt)}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            onClick={() =>
                              navigate(
                                `/subject-result-review/${submission._id}`,
                              )
                            }
                            className="..."
                          >
                            <FaEye />
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS */}

            <div className="space-y-3 p-4 md:hidden">
              {submissions.map((submission) => {
                const allocation = getAllocationDetails(submission);

                return (
                  <div
                    key={submission._id}
                    className="rounded-xl border border-white/10 bg-slate-900/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-white">
                          {allocation.subject}
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                          {allocation.schoolClass} · {allocation.department}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                          submission.status,
                        )}`}
                      >
                        {formatLabel(submission.status)}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Teacher</span>
                        <span className="text-right text-slate-300">
                          {getTeacherName(submission)}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Session</span>
                        <span className="text-right text-slate-300">
                          {submission.academicSession?.name || "—"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Term</span>
                        <span className="text-right text-slate-300">
                          {formatLabel(submission.term)} Term
                        </span>
                      </div>

                      <div className="flex justify-between gap-3">
                        <span className="text-slate-500">Submitted</span>
                        <span className="text-right text-slate-300">
                          {formatDate(submission.submittedAt)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/subject-result-review/${submission._id}`)
                      }
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 active:bg-green-800"
                    >
                      <FaEye />
                      Review Submission
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* PAGINATION */}

      {!loading && pagination.totalPages > 1 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Page {pagination.page} of {pagination.totalPages}
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePreviousPage}
              disabled={page <= 1}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <button
              type="button"
              onClick={handleNextPage}
              disabled={page >= pagination.totalPages}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectResultReview;
