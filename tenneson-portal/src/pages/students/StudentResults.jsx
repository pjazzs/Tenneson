import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCalendar,
  FiChevronRight,
  FiRefreshCw,
  FiFileText,
} from "react-icons/fi";

import studentApi from "../../api/studentApi";
import useStudentAuth from "../../hooks/useStudentAuth";

function StudentResults() {
  const navigate = useNavigate();
  const { logoutStudent } = useStudentAuth();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await studentApi.get("/results/my");

      setResults(response.data?.results || []);
    } catch (err) {
      console.error("Unable to fetch student results:", err);

      if (err.response?.status === 401) {
        logoutStudent();
        navigate("/student/login", { replace: true });
        return;
      }

      setError(
        err.response?.data?.message ||
          "Unable to load your results. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [logoutStudent, navigate]);

  useEffect(() => {
    let cancelled = false;

    const loadResults = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await studentApi.get("/results/my");

        if (cancelled) return;

        setResults(response.data?.results || []);
      } catch (err) {
        if (cancelled) return;

        console.error("Unable to fetch student results:", err);

        if (err.response?.status === 401) {
          logoutStudent();
          navigate("/student/login", { replace: true });
          return;
        }

        setError(
          err.response?.data?.message ||
            "Unable to load your results. Please try again.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadResults();

    return () => {
      cancelled = true;
    };
  }, [logoutStudent, navigate]);

  const formatTerm = (term) => {
    const terms = {
      first: "First Term",
      second: "Second Term",
      third: "Third Term",
    };

    return terms[term] || term || "Term";
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined) {
      return "—";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
      return "—";
    }

    return `${number.toFixed(2)}%`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/student/dashboard")}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition"
          >
            <FiArrowLeft />
            Back
          </button>

          <button
            onClick={fetchResults}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition disabled:opacity-50"
          >
            <FiRefreshCw className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Heading */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <FiFileText size={22} />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">My Results</h1>

              <p className="text-slate-400 mt-1">
                View your published academic results.
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

            <button
              onClick={fetchResults}
              className="mt-4 px-4 py-2 rounded-xl bg-red-500/10 text-red-300 hover:bg-red-500/20 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && results.length === 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-10 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500">
              <FiFileText size={28} />
            </div>

            <h2 className="text-xl font-semibold mt-5">No Published Results</h2>

            <p className="text-slate-400 mt-2 max-w-md mx-auto">
              Your published academic results will appear here when they are
              released by the school.
            </p>
          </div>
        )}

        {/* Results */}
        {!loading && !error && results.length > 0 && (
          <div className="space-y-4">
            {results.map((result) => (
              <button
                key={result._id}
                onClick={() => navigate(`/student/results/${result._id}`)}
                className="w-full text-left rounded-3xl border border-slate-800 bg-slate-900 hover:border-slate-700 hover:bg-slate-900/80 transition p-5 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 shrink-0 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <FiBookOpen size={22} />
                    </div>

                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        {result.academicSession?.name || "Academic Session"}
                      </h2>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-400">
                        <span className="inline-flex items-center gap-1.5">
                          <FiCalendar size={14} />
                          {formatTerm(result.term)}
                        </span>

                        {result.currentClass && (
                          <span>{result.currentClass}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-5">
                    <div className="sm:text-right">
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        Overall
                      </p>

                      <p className="text-2xl font-bold text-blue-400">
                        {formatPercentage(result.overallPercentage)}
                      </p>
                    </div>

                    <FiChevronRight size={22} className="text-slate-500" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default StudentResults;
