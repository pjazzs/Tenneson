import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCalendar,
  FiChevronRight,
  FiFileText,
  FiTrendingUp,
  FiAward,
} from "react-icons/fi";

import studentApi from "../../api/studentApi";

function AcademicRecords() {
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const response = await studentApi.get("/results/my");

        setResults(response.data?.results || []);
      } catch (err) {
        console.error("Unable to fetch academic records:", err);

        if (err.response?.status === 401) {
          localStorage.removeItem("studentToken");
          localStorage.removeItem("student");

          navigate("/student/login", { replace: true });
          return;
        }

        setError(
          err.response?.data?.message ||
            "Unable to load your academic records.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, [navigate]);

  const statistics = useMemo(() => {
    if (!results.length) {
      return {
        totalResults: 0,
        average: 0,
        highest: 0,
      };
    }

    const percentages = results
      .map((result) => Number(result.overallPercentage))
      .filter((value) => Number.isFinite(value));

    const average = percentages.length
      ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length
      : 0;

    const highest = percentages.length ? Math.max(...percentages) : 0;

    return {
      totalResults: results.length,
      average,
      highest,
    };
  }, [results]);

  const formatTerm = (term) => {
    const terms = {
      first: "First Term",
      second: "Second Term",
      third: "Third Term",
    };

    return terms[term] || term || "Term";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => navigate("/student/dashboard")}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition"
          >
            <FiArrowLeft />
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Heading */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FiTrendingUp size={22} />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Academic Records
              </h1>

              <p className="text-slate-400 mt-1">
                An overview of your published academic performance.
              </p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Statistics */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Published Results</p>

                    <p className="text-3xl font-bold mt-2">
                      {statistics.totalResults}
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <FiFileText size={22} />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">
                      Average Performance
                    </p>

                    <p className="text-3xl font-bold mt-2">
                      {statistics.average.toFixed(2)}%
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <FiTrendingUp size={22} />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">
                      Highest Performance
                    </p>

                    <p className="text-3xl font-bold mt-2">
                      {statistics.highest.toFixed(2)}%
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                    <FiAward size={22} />
                  </div>
                </div>
              </div>
            </section>

            {/* Records */}
            <section className="mt-8">
              <div className="flex items-center gap-3 mb-4">
                <FiCalendar className="text-blue-400" />

                <h2 className="text-xl font-semibold">Academic History</h2>
              </div>

              {results.length === 0 ? (
                <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">
                  <FiBookOpen size={32} className="mx-auto text-slate-500" />

                  <h3 className="text-lg font-semibold mt-4">
                    No Academic Records Yet
                  </h3>

                  <p className="text-slate-400 mt-2">
                    Published results will appear here when available.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((result) => (
                    <button
                      key={result._id}
                      onClick={() => navigate(`/student/results/${result._id}`)}
                      className="w-full text-left rounded-3xl border border-slate-800 bg-slate-900 hover:border-slate-700 transition p-5 sm:p-6"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                            <FiBookOpen size={21} />
                          </div>

                          <div>
                            <h3 className="font-semibold">
                              {result.academicSession?.name ||
                                "Academic Session"}
                            </h3>

                            <p className="text-sm text-slate-400 mt-1">
                              {formatTerm(result.term)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-5">
                          <div className="sm:text-right">
                            <p className="text-xs text-slate-500 uppercase tracking-wide">
                              Performance
                            </p>

                            <p className="text-xl font-bold text-blue-400 mt-1">
                              {Number(result.overallPercentage || 0).toFixed(2)}
                              %
                            </p>
                          </div>

                          <FiChevronRight className="text-slate-500" />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default AcademicRecords;
