import { useEffect, useState } from "react";
import { getResults } from "../../api/resultApi";
import { applyPromotion } from "../../api/promotionApi";

const getDecisionLabel = (decision) => {
  if (decision === "promoted") {
    return "Promoted";
  }

  if (decision === "repeat") {
    return "Repeat";
  }

  return "Pending";
};

const getTargetClass = (currentClass, decision) => {
  if (decision === "repeat") {
    return currentClass;
  }

  const promotionMap = {
    JSS1: "JSS2",
    JSS2: "JSS3",
    JSS3: "SS1",
    SS1: "SS2",
    SS2: "SS3",
    SS3: "Graduated",
  };

  return promotionMap[currentClass] || "—";
};

function ApplyPromotion({ onPromotionApplied }) {
  const [results, setResults] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchEligibleResults = async (page = 1) => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await getResults({
        page,
        limit: 20,
        term: "third",
        status: "approved",
      });

      const eligibleResults = (response.results || []).filter(
        (result) =>
          result.principalDecision === "promoted" ||
          result.principalDecision === "repeat",
      );

      setResults(eligibleResults);

      setPagination(
        response.pagination || {
          page,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      );
    } catch (err) {
      console.error(
        "Failed to fetch eligible promotion results:",
        err.response?.data || err.message,
      );

      setError(
        err.response?.data?.message || "Unable to load eligible students.",
      );

      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEligibleResults(1);
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const handleApply = async (result) => {
    const student = result.student;

    const fullName = [student?.firstName, student?.lastName, student?.otherName]
      .filter(Boolean)
      .join(" ");

    const decision = getDecisionLabel(result.principalDecision);

    const confirmed = window.confirm(
      `Apply ${decision.toLowerCase()} for ${fullName} (${student?.studentId})?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setApplyingId(result._id);
      setError("");
      setSuccess("");

      const response = await applyPromotion(result._id);

      setSuccess(
        response.message || `${fullName} has been processed successfully.`,
      );

      await fetchEligibleResults(pagination.page);

      if (onPromotionApplied) {
        onPromotionApplied();
      }
    } catch (err) {
      console.error(
        "Failed to apply promotion:",
        err.response?.data || err.message,
      );

      setError(err.response?.data?.message || "Unable to apply promotion.");
    } finally {
      setApplyingId(null);
    }
  };

  const handlePrevious = () => {
    if (pagination.page <= 1) {
      return;
    }

    fetchEligibleResults(pagination.page - 1);
  };

  const handleNext = () => {
    if (pagination.page >= pagination.totalPages) {
      return;
    }

    fetchEligibleResults(pagination.page + 1);
  };

  return (
    <section className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6 text-white">
      <div className="mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Apply Promotion</h2>

            <p className="mt-1 text-sm text-slate-400">
              Process approved third-term results with a final principal
              decision.
            </p>
          </div>

          <button
            type="button"
            onClick={() => fetchEligibleResults(pagination.page)}
            disabled={loading}
            className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-white/10 bg-slate-900/50 px-4 py-10 text-center text-sm text-slate-400">
          Loading eligible students...
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-slate-900/50 px-4 py-10 text-center">
          <p className="text-sm font-medium text-slate-300">
            No students are currently ready for promotion.
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Students must have an approved third-term result and a final
            principal decision.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-white/10">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Student
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Class
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Session
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Decision
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Target
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10 bg-slate-950/30">
                {results.map((result) => {
                  const student = result.student;

                  const fullName = [
                    student?.firstName,
                    student?.lastName,
                    student?.otherName,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  const decision = result.principalDecision;

                  const currentClass =
                    result.currentClass || student?.currentClass;

                  const targetClass = getTargetClass(currentClass, decision);

                  return (
                    <tr
                      key={result._id}
                      className="transition hover:bg-white/5"
                    >
                      <td className="whitespace-nowrap px-4 py-4">
                        <div>
                          <p className="font-medium text-white">
                            {fullName || "Unknown student"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {student?.studentId || "—"}
                          </p>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-300">
                        {currentClass || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-300">
                        {result.academicSession?.name || "—"}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            decision === "promoted"
                              ? "bg-emerald-500/10 text-emerald-300"
                              : "bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {getDecisionLabel(decision)}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-200">
                        {targetClass}
                      </td>

                      <td className="whitespace-nowrap px-4 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleApply(result)}
                          disabled={applyingId === result._id}
                          className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {applyingId === result._id ? "Applying..." : "Apply"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
              <p className="text-sm text-slate-400">
                Page {pagination.page} of {pagination.totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={pagination.page <= 1}
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  disabled={pagination.page >= pagination.totalPages}
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default ApplyPromotion;
