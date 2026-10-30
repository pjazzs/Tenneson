import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  getResultCorrections,
  getResultCorrection,
  submitResultCorrection,
  approveResultCorrection,
  rejectResultCorrection,
  publishResultCorrection,
} from "../../api/resultApi";

const PAGE_LIMIT = 10;

const STATUS_OPTIONS = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "published",
  "cancelled",
];

const getStatusStyle = (status) => {
  const styles = {
    draft: "bg-gray-100 text-gray-700",
    submitted: "bg-blue-100 text-blue-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    published: "bg-purple-100 text-purple-700",
    cancelled: "bg-orange-100 text-orange-700",
  };

  return styles[status?.toLowerCase()] || "bg-gray-100 text-gray-600";
};

const formatLabel = (value) => {
  if (!value) return "—";

  return String(value)
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getStudent = (correction) => {
  return (
    correction?.student ||
    correction?.result?.student ||
    correction?.originalResult?.student ||
    {}
  );
};

const getStudentName = (student) => {
  const name = [student?.firstName, student?.otherName, student?.lastName]
    .filter(Boolean)
    .join(" ");

  return name || "Unknown Student";
};

const getSession = (correction) => {
  return (
    correction?.academicSession ||
    correction?.result?.academicSession ||
    correction?.originalResult?.academicSession ||
    {}
  );
};

const getClass = (correction) => {
  return (
    correction?.currentClass ||
    correction?.result?.currentClass ||
    correction?.originalResult?.currentClass ||
    getStudent(correction)?.currentClass ||
    "—"
  );
};

const getTerm = (correction) => {
  return (
    correction?.term ||
    correction?.result?.term ||
    correction?.originalResult?.term ||
    "—"
  );
};

const getDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString();
};

function ResultCorrections({ refreshKey = 0 }) {
  const navigate = useNavigate();

  const [corrections, setCorrections] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    totalPages: 1,
  });

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [selectedCorrection, setSelectedCorrection] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchCorrections = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {
        page,
        limit: PAGE_LIMIT,
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      const response = await getResultCorrections(params);

      setCorrections(response?.corrections || []);

      setPagination(
        response?.pagination || {
          page,
          limit: PAGE_LIMIT,
          total: 0,
          totalPages: 1,
        },
      );
    } catch (err) {
      console.error(
        "Failed to fetch result corrections:",
        err.response?.data || err.message,
      );

      setError(
        err.response?.data?.message || "Unable to load result corrections.",
      );

      setCorrections([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        fetchCorrections();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [fetchCorrections, refreshKey]);

  const handleFilterChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handleOpenCorrection = (revisionId) => {
    navigate("/results/entry", {
      state: {
        correctionRevisionId: revisionId,
      },
    });
  };

  const handleViewCorrection = async (revisionId) => {
    try {
      setDetailsLoading(true);

      const response = await getResultCorrection(revisionId);

      const revision = response?.revision || response?.correction || response;

      setSelectedCorrection(revision);
    } catch (err) {
      window.alert(
        err.response?.data?.message || "Unable to load correction details.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleAction = async (correction, action) => {
    const revisionId = correction?._id;

    if (!revisionId || actionLoadingId) return;

    try {
      setActionLoadingId(revisionId);

      if (action === "submit") {
        const confirmed = window.confirm(
          "Submit this correction for Principal review? The original published result will remain unchanged.",
        );

        if (!confirmed) return;

        await submitResultCorrection(revisionId);
      }

      if (action === "approve") {
        const principalComment = window.prompt(
          "Enter the Principal's comment for this correction:",
        );

        if (principalComment === null) return;

        if (!principalComment.trim()) {
          window.alert("A Principal comment is required.");
          return;
        }

        const payload = {
          principalComment: principalComment.trim(),
        };

        const term = String(getTerm(correction)).toLowerCase();

        if (term.includes("third")) {
          const decision = window.prompt(
            'Enter "promoted" or "repeat" for Third Term:',
          );

          if (decision === null) return;

          const normalizedDecision = decision.trim().toLowerCase();

          if (!["promoted", "repeat"].includes(normalizedDecision)) {
            window.alert('Enter either "promoted" or "repeat".');
            return;
          }

          payload.principalDecision = normalizedDecision;
        }

        await approveResultCorrection(revisionId, payload);
      }

      if (action === "reject") {
        const rejectionReason = window.prompt(
          "Enter the reason for rejecting this correction:",
        );

        if (rejectionReason === null) return;

        if (!rejectionReason.trim()) {
          window.alert("A rejection reason is required.");
          return;
        }

        await rejectResultCorrection(revisionId, rejectionReason.trim());
      }

      if (action === "publish") {
        const confirmed = window.confirm(
          "Publish this correction? This will update the official published result visible to the student. The original result will remain published.",
        );

        if (!confirmed) return;

        await publishResultCorrection(revisionId);
      }

      await fetchCorrections();

      if (selectedCorrection?._id === revisionId) {
        const response = await getResultCorrection(revisionId);

        setSelectedCorrection(
          response?.revision || response?.correction || response,
        );
      }

      window.alert("Correction action completed successfully.");
    } catch (err) {
      console.error(
        "Correction action failed:",
        err.response?.data || err.message,
      );

      window.alert(
        err.response?.data?.message ||
          err.message ||
          "The correction action failed.",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderActions = (correction) => {
    const status = correction?.status?.toLowerCase();
    const isBusy = actionLoadingId === correction?._id;

    return (
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <>
            <button
              type="button"
              onClick={() => handleOpenCorrection(correction._id)}
              className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              Open
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleAction(correction, "submit")}
              className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {isBusy ? "Processing..." : "Submit"}
            </button>
          </>
        )}

        {status === "submitted" && (
          <>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleAction(correction, "approve")}
              className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isBusy ? "Processing..." : "Approve"}
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => handleAction(correction, "reject")}
              className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}

        {status === "approved" && (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => handleAction(correction, "publish")}
            className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {isBusy ? "Publishing..." : "Publish"}
          </button>
        )}

        {status === "rejected" && (
          <button
            type="button"
            onClick={() => handleOpenCorrection(correction._id)}
            className="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            Open
          </button>
        )}

        {["rejected", "published", "cancelled"].includes(status) && (
          <button
            type="button"
            onClick={() => handleViewCorrection(correction._id)}
            className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
          >
            View
          </button>
        )}
      </div>
    );
  };

  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            Result Corrections
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage corrections separately from original results.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={handleFilterChange}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
          >
            <option value="">All correction statuses</option>

            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {formatLabel(status)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={fetchCorrections}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={fetchCorrections}
            className="ml-2 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-500">
          Loading result corrections...
        </div>
      ) : corrections.length === 0 ? (
        <div className="rounded-lg bg-gray-50 px-4 py-10 text-center">
          <p className="font-medium text-gray-700">
            No result corrections found.
          </p>

          <p className="mt-1 text-sm text-gray-500">
            New correction drafts and their subsequent workflow statuses will
            appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "Student",
                    "Class",
                    "Session",
                    "Term",
                    "Reason",
                    "Status",
                    "Created",
                    "Actions",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {corrections.map((correction) => {
                  const student = getStudent(correction);
                  const session = getSession(correction);

                  return (
                    <tr key={correction._id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="font-medium text-gray-800">
                          {getStudentName(student)}
                        </div>

                        <div className="text-xs text-gray-500">
                          {student?.studentId || "No student ID"}
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {getClass(correction)}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {session?.name || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatLabel(getTerm(correction))}
                      </td>

                      <td className="max-w-xs px-4 py-3 text-gray-600">
                        <span className="line-clamp-2">
                          {correction?.reason || "—"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                            correction?.status,
                          )}`}
                        >
                          {formatLabel(correction?.status)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {getDate(correction?.createdAt)}
                      </td>

                      <td className="min-w-45 px-4 py-3">
                        {renderActions(correction)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center">
            <p className="text-sm text-gray-500">
              Showing {corrections.length} of {pagination.total || 0}{" "}
              corrections
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="text-sm text-gray-600">
                Page {pagination.page || page} of {pagination.totalPages || 1}
              </span>

              <button
                type="button"
                disabled={page >= (pagination.totalPages || 1) || loading}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

      {selectedCorrection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">
                Correction Details
              </h3>

              <button
                type="button"
                onClick={() => setSelectedCorrection(null)}
                className="text-2xl leading-none text-gray-500 hover:text-gray-800"
                aria-label="Close"
              >
                &times;
              </button>
            </div>

            {detailsLoading ? (
              <p className="py-6 text-center text-gray-500">
                Loading correction details...
              </p>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-500">Student</p>
                  <p className="font-semibold text-gray-800">
                    {getStudentName(getStudent(selectedCorrection))}
                  </p>
                </div>

                <div>
                  <p className="text-gray-500">Correction status</p>
                  <span
                    className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(
                      selectedCorrection.status,
                    )}`}
                  >
                    {formatLabel(selectedCorrection.status)}
                  </span>
                </div>

                <div>
                  <p className="text-gray-500">Reason for correction</p>
                  <p className="mt-1 whitespace-pre-wrap text-gray-800">
                    {selectedCorrection.reason || "No reason provided."}
                  </p>
                </div>

                {selectedCorrection.rejectionReason && (
                  <div>
                    <p className="text-gray-500">Rejection reason</p>
                    <p className="mt-1 whitespace-pre-wrap text-red-700">
                      {selectedCorrection.rejectionReason}
                    </p>
                  </div>
                )}

                {selectedCorrection.principalComment && (
                  <div>
                    <p className="text-gray-500">Principal's comment</p>
                    <p className="mt-1 whitespace-pre-wrap text-gray-800">
                      {selectedCorrection.principalComment}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-gray-500">Created</p>
                  <p className="text-gray-800">
                    {getDate(selectedCorrection.createdAt)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCorrection(null)}
                  className="mt-3 w-full rounded-lg bg-gray-800 px-4 py-2.5 font-medium text-white hover:bg-gray-900"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default ResultCorrections;
