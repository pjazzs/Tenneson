import { useEffect, useState } from "react";
import { getResults } from "../../api/resultApi";

const Results = () => {
  const [results, setResults] = useState([]);

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [searchInput, setSearchInput] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [currentClass, setCurrentClass] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const delay = searchInput.trim() ? 500 : 0;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const params = {
          page,
          limit: 10,
        };

        if (searchInput.trim()) {
          params.search = searchInput.trim();
        }

        if (term) {
          params.term = term;
        }

        if (status) {
          params.status = status;
        }

        if (currentClass) {
          params.currentClass = currentClass;
        }

        const response = await getResults(params);

        if (cancelled) {
          return;
        }

        setResults(response.results || []);

        setPagination(
          response.pagination || {
            page,
            limit: 10,
            total: 0,
            totalPages: 1,
          },
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to fetch results:",
          err.response?.data || err.message,
        );

        setError(err.response?.data?.message || "Failed to load results.");

        setResults([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, searchInput, term, status, currentClass]);

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
    setPage(1);
  };

  const handleTermChange = (event) => {
    setTerm(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  const handleClassChange = (event) => {
    setCurrentClass(event.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setTerm("");
    setStatus("");
    setCurrentClass("");
    setPage(1);
  };

  const handlePreviousPage = () => {
    if (page <= 1) {
      return;
    }

    setPage((currentPage) => currentPage - 1);
  };

  const handleNextPage = () => {
    if (page >= pagination.totalPages) {
      return;
    }

    setPage((currentPage) => currentPage + 1);
  };

  const hasFilters = Boolean(
    searchInput.trim() || term || status || currentClass,
  );

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (value) => {
    const styles = {
      draft: "bg-slate-500/10 text-slate-300",
      submitted: "bg-amber-500/10 text-amber-300",
      approved: "bg-emerald-500/10 text-emerald-300",
      published: "bg-blue-500/10 text-blue-300",
    };

    return (
      <span
        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
          styles[value] || "bg-slate-500/10 text-slate-300"
        }`}
      >
        {value ? value.charAt(0).toUpperCase() + value.slice(1) : "—"}
      </span>
    );
  };

  const getDecisionBadge = (value) => {
    if (value === "promoted") {
      return (
        <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          Promoted
        </span>
      );
    }

    if (value === "repeat") {
      return (
        <span className="inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
          Repeat
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400">
        Pending
      </span>
    );
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 text-white sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Results</h1>

        <p className="mt-1 text-sm text-slate-400">
          View and manage student academic results.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Result Records</h2>

            <p className="text-sm text-slate-400">
              Search and filter student results.
            </p>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-sm font-medium text-red-400 transition hover:text-red-300"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <label
              htmlFor="result-search"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Search
            </label>

            <input
              id="result-search"
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Name or student ID..."
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Term */}
          <div>
            <label
              htmlFor="result-term"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Term
            </label>

            <select
              id="result-term"
              value={term}
              onChange={handleTermChange}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Terms</option>
              <option value="first">First Term</option>
              <option value="second">Second Term</option>
              <option value="third">Third Term</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="result-status"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Status
            </label>

            <select
              id="result-status"
              value={status}
              onChange={handleStatusChange}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Class */}
          <div>
            <label
              htmlFor="result-class"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Class
            </label>

            <select
              id="result-class"
              value={currentClass}
              onChange={handleClassChange}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Classes</option>
              <option value="JSS1">JSS1</option>
              <option value="JSS2">JSS2</option>
              <option value="JSS3">JSS3</option>
              <option value="SS1">SS1</option>
              <option value="SS2">SS2</option>
              <option value="SS3">SS3</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Results table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Student
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Class
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Session
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Term
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Status
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Decision
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Created
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10 bg-slate-950/30">
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    Loading results...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="text-sm font-medium text-slate-300">
                      No results found.
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {hasFilters
                        ? "Try adjusting your search or filters."
                        : "Student results will appear here once they are created."}
                    </p>
                  </td>
                </tr>
              ) : (
                results.map((result) => {
                  const student = result.student || {};

                  const academicSession = result.academicSession || {};

                  const fullName = [
                    student.firstName,
                    student.lastName,
                    student.otherName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <tr
                      key={result._id}
                      className="transition hover:bg-white/5"
                    >
                      {/* Student */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-medium text-white">
                          {fullName || "Unknown student"}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {student.studentId || "—"}
                        </div>
                      </td>

                      {/* Class */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                        {result.currentClass || student.currentClass || "—"}
                      </td>

                      {/* Session */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                        {academicSession.name || "—"}
                      </td>

                      {/* Term */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                        {result.term
                          ? result.term.charAt(0).toUpperCase() +
                            result.term.slice(1) +
                            " Term"
                          : "—"}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {getStatusBadge(result.status)}
                      </td>

                      {/* Principal decision */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {getDecisionBadge(result.principalDecision)}
                      </td>

                      {/* Created */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                        {formatDate(result.createdAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && results.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-500">
              Showing page{" "}
              <span className="font-medium text-slate-300">
                {pagination.page}
              </span>{" "}
              of{" "}
              <span className="font-medium text-slate-300">
                {pagination.totalPages}
              </span>{" "}
              —{" "}
              <span className="font-medium text-slate-300">
                {pagination.total}
              </span>{" "}
              total result
              {pagination.total === 1 ? "" : "s"}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePreviousPage}
                disabled={page <= 1}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </button>

              <span className="px-2 text-sm text-slate-400">{page}</span>

              <button
                type="button"
                onClick={handleNextPage}
                disabled={page >= pagination.totalPages}
                className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Results;
