import { useEffect, useState } from "react";
import { getPromotions } from "../../api/promotionApi";
import ApplyPromotion from "./ApplyPromotion";

const Promotions = () => {
  const [promotions, setPromotions] = useState([]);

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [searchInput, setSearchInput] = useState("");
  const [decision, setDecision] = useState("");
  const [fromClass, setFromClass] = useState("");
  const [toClass, setToClass] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Refresh History
  |--------------------------------------------------------------------------
  |
  | Incrementing this value allows ApplyPromotion to tell this page
  | that a promotion has just been applied.
  |
  */

  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  /*
  |--------------------------------------------------------------------------
  | Fetch Promotion History
  |--------------------------------------------------------------------------
  |
  | Search is debounced here instead of using another effect that
  | synchronously updates page state.
  |
  */

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

        if (decision) {
          params.decision = decision;
        }

        if (fromClass) {
          params.fromClass = fromClass;
        }

        if (toClass) {
          params.toClass = toClass;
        }

        const data = await getPromotions(params);

        if (cancelled) return;

        setPromotions(data.promotions || []);

        setPagination(
          data.pagination || {
            page,
            limit: 10,
            total: 0,
            totalPages: 1,
          },
        );
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Failed to fetch promotion history:",
          err.response?.data || err.message,
        );

        setError(
          err.response?.data?.message || "Failed to load promotion history.",
        );

        setPromotions([]);
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
  }, [page, searchInput, decision, fromClass, toClass, historyRefreshKey]);

  /*
  |--------------------------------------------------------------------------
  | Promotion Applied Callback
  |--------------------------------------------------------------------------
  |
  | ApplyPromotion calls this after a successful application.
  | This causes the history request to run again.
  |
  */

  const handlePromotionApplied = () => {
    setHistoryRefreshKey((current) => current + 1);
  };

  /*
  |--------------------------------------------------------------------------
  | Search
  |--------------------------------------------------------------------------
  */

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
    setPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | Decision Filter
  |--------------------------------------------------------------------------
  */

  const handleDecisionChange = (event) => {
    setDecision(event.target.value);
    setPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | From Class Filter
  |--------------------------------------------------------------------------
  */

  const handleFromClassChange = (event) => {
    setFromClass(event.target.value);
    setPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | To Class Filter
  |--------------------------------------------------------------------------
  */

  const handleToClassChange = (event) => {
    setToClass(event.target.value);
    setPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | Reset Filters
  |--------------------------------------------------------------------------
  */

  const handleResetFilters = () => {
    setSearchInput("");
    setDecision("");
    setFromClass("");
    setToClass("");
    setPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage((currentPage) => currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (page < pagination.totalPages) {
      setPage((currentPage) => currentPage + 1);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  const hasFilters = Boolean(
    searchInput.trim() || decision || fromClass || toClass,
  );

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
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

    if (value === "graduated") {
      return (
        <span className="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
          Graduated
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-300">
        {value || "-"}
      </span>
    );
  };

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 text-white sm:p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Promotions</h1>

        <p className="mt-1 text-sm text-slate-400">
          Review student promotion decisions and manage promotion history.
        </p>
      </div>

      {/* ================================================================
          STEP 6C — APPLY PROMOTION
          ================================================================ */}

      <ApplyPromotion onPromotionApplied={handlePromotionApplied} />

      {/* ================================================================
          PROMOTION HISTORY
          ================================================================ */}

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">
              Promotion History
            </h2>

            <p className="text-sm text-slate-400">
              Search and filter student promotion records.
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
              htmlFor="promotion-search"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Search
            </label>

            <input
              id="promotion-search"
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Name or student ID..."
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Decision */}
          <div>
            <label
              htmlFor="promotion-decision"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Decision
            </label>

            <select
              id="promotion-decision"
              value={decision}
              onChange={handleDecisionChange}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Decisions</option>
              <option value="promoted">Promoted</option>
              <option value="repeat">Repeat</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>

          {/* From Class */}
          <div>
            <label
              htmlFor="promotion-from-class"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              From Class
            </label>

            <select
              id="promotion-from-class"
              value={fromClass}
              onChange={handleFromClassChange}
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

          {/* To Class */}
          <div>
            <label
              htmlFor="promotion-to-class"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              To Class
            </label>

            <select
              id="promotion-to-class"
              value={toClass}
              onChange={handleToClassChange}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Classes</option>
              <option value="JSS2">JSS2</option>
              <option value="JSS3">JSS3</option>
              <option value="SS1">SS1</option>
              <option value="SS2">SS2</option>
              <option value="SS3">SS3</option>
              <option value="Graduated">Graduated</option>
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

      {/* Promotion History Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Student
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  From
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  To
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Decision
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Session
                </th>

                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Applied At
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/10 bg-slate-950/30">
              {loading ? (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    Loading promotion history...
                  </td>
                </tr>
              ) : promotions.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    <div className="text-sm font-medium text-slate-300">
                      No promotion records found.
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {hasFilters
                        ? "Try adjusting your search or filters."
                        : "Promotion records will appear here once promotions are applied."}
                    </p>
                  </td>
                </tr>
              ) : (
                promotions.map((promotion) => {
                  const student = promotion.student || {};
                  const fromSession = promotion.fromSession || {};
                  const toSession = promotion.toSession || {};

                  return (
                    <tr
                      key={promotion._id}
                      className="transition hover:bg-white/5"
                    >
                      {/* Student */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="font-medium text-white">
                          {student.firstName || ""} {student.lastName || ""}
                        </div>

                        <div className="text-xs text-slate-500">
                          {student.studentId || "-"}
                        </div>
                      </td>

                      {/* From */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                        <div className="font-medium">
                          {promotion.fromClass || "-"}
                        </div>

                        <div className="text-xs text-slate-500">
                          {fromSession.name || "-"}
                        </div>
                      </td>

                      {/* To */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                        <div className="font-medium">
                          {promotion.toClass || "-"}
                        </div>

                        <div className="text-xs text-slate-500">
                          {toSession.name || "-"}
                        </div>
                      </td>

                      {/* Decision */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {getDecisionBadge(promotion.decision)}
                      </td>

                      {/* Session */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                        {fromSession.name || "-"}
                      </td>

                      {/* Applied At */}
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                        {formatDate(promotion.appliedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && promotions.length > 0 && (
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
              total record
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

export default Promotions;
