import { useMemo } from "react";
import { FaArrowLeft, FaArrowRight, FaCheckCircle } from "react-icons/fa";

import calculateResultGrade from "../../../utils/resultGrade";

const ResultScoreEntry = ({
  selectedStudent,
  academicSession,
  term,
  scoreEntries,
  onScoreEntriesChange,
  onBack,
  onContinue,
  error,
}) => {
  const getTotal = (entry) => {
    const ca1 = Number(entry.ca1) || 0;
    const ca2 = Number(entry.ca2) || 0;
    const exam = Number(entry.exam) || 0;

    return ca1 + ca2 + exam;
  };

  const getGrade = (entry) => {
    if (entry.ca1 === "" || entry.ca2 === "" || entry.exam === "") {
      return {
        grade: null,
        remark: "",
      };
    }

    const total = getTotal(entry);

    return calculateResultGrade(total);
  };

  const totalScore = useMemo(() => {
    return scoreEntries.reduce((sum, entry) => {
      if (!entry.offered) return sum;
      return sum + getTotal(entry);
    }, 0);
  }, [scoreEntries]);

  const totalPossibleScore = useMemo(() => {
    return scoreEntries.reduce((sum, entry) => {
      if (!entry.offered) return sum;
      return sum + 100;
    }, 0);
  }, [scoreEntries]);

  const overallPercentage = useMemo(() => {
    if (totalPossibleScore === 0) return 0;

    return (totalScore / totalPossibleScore) * 100;
  }, [totalScore, totalPossibleScore]);

  const handleScoreChange = (index, field, value) => {
    if (value === "") {
      onScoreEntriesChange(
        scoreEntries.map((entry, entryIndex) =>
          entryIndex === index
            ? {
                ...entry,
                [field]: "",
              }
            : entry,
        ),
      );

      return;
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return;
    }

    const limits = {
      ca1: 20,
      ca2: 10,
      exam: 70,
    };

    const max = limits[field];

    if (numericValue < 0 || numericValue > max) {
      return;
    }

    onScoreEntriesChange(
      scoreEntries.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              [field]: numericValue,
            }
          : entry,
      ),
    );
  };

  const handleCommentChange = (index, value) => {
    onScoreEntriesChange(
      scoreEntries.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              teacherComment: value,
            }
          : entry,
      ),
    );
  };

  const handleOfferedChange = (index, checked) => {
    onScoreEntriesChange(
      scoreEntries.map((entry, entryIndex) =>
        entryIndex === index
          ? {
              ...entry,
              offered: checked,
            }
          : entry,
      ),
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-400">
              <span>Result Entry</span>
              <span>/</span>
              <span>Scores</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight">
              Subject Scores
            </h1>

            <p className="mt-1 text-sm text-slate-400">
              Enter CA and examination scores for the selected student.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">
              Overall Percentage
            </div>

            <div className="mt-1 text-xl font-bold text-blue-400">
              {overallPercentage.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Student / Session Information */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Student
            </div>

            <div className="mt-2 font-semibold text-white">
              {selectedStudent?.firstName} {selectedStudent?.lastName}
            </div>

            <div className="mt-1 text-sm text-slate-400">
              {selectedStudent?.studentId}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Academic Session
            </div>

            <div className="mt-2 font-semibold text-white">
              {academicSession?.name || "—"}
            </div>

            <div className="mt-1 text-sm capitalize text-slate-400">
              {term || "—"} Term
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total Score
            </div>

            <div className="mt-2 font-semibold text-white">
              {totalScore} / {totalPossibleScore}
            </div>

            <div className="mt-1 text-sm text-slate-400">
              {scoreEntries.length} subject
              {scoreEntries.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Score Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed overflow-hidden">
              <thead className="border-b border-slate-800 bg-slate-950/70">
                <tr>
                  <th className="w-[19%] px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Subject
                  </th>

                  <th className="w-[8%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    CA1
                  </th>

                  <th className="w-[8%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    CA2
                  </th>

                  <th className="w-[8%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Exam
                  </th>

                  <th className="w-[9%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Total
                  </th>

                  <th className="w-[8%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Grade
                  </th>

                  <th className="w-[40%] px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Teacher Comment
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {scoreEntries.map((entry, index) => {
                  const total = getTotal(entry);
                  const { grade, remark } = getGrade(entry);

                  return (
                    <tr
                      key={entry.subjectId}
                      className="transition-colors hover:bg-slate-800/40"
                    >
                      {/* Subject */}
                      <td className="px-3 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={entry.offered}
                              onChange={(event) =>
                                handleOfferedChange(index, event.target.checked)
                              }
                              className="peer sr-only"
                            />

                            <div className="h-5 w-5 rounded border border-slate-700 bg-slate-950 transition peer-checked:border-blue-500 peer-checked:bg-blue-500">
                              <FaCheckCircle
                                className={`h-full w-full p-0.5 text-white transition ${
                                  entry.offered ? "opacity-100" : "opacity-0"
                                }`}
                              />
                            </div>
                          </label>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">
                              {entry.subjectName}
                            </div>

                            {entry.subjectCode && (
                              <div className="mt-0.5 text-xs text-slate-500">
                                {entry.subjectCode}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* CA1 */}
                      <td className="px-2 py-4 align-middle text-center">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={entry.ca1}
                          disabled={!entry.offered}
                          onChange={(event) =>
                            handleScoreChange(index, "ca1", event.target.value)
                          }
                          className="mx-auto block w-full max-w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-center text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                          placeholder="0"
                        />
                      </td>

                      {/* CA2 */}
                      <td className="px-2 py-4 align-middle text-center">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={entry.ca2}
                          disabled={!entry.offered}
                          onChange={(event) =>
                            handleScoreChange(index, "ca2", event.target.value)
                          }
                          className="mx-auto block w-full max-w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-center text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                          placeholder="0"
                        />
                      </td>

                      {/* Exam */}
                      <td className="px-2 py-4 align-middle text-center">
                        <input
                          type="number"
                          min="0"
                          max="70"
                          value={entry.exam}
                          disabled={!entry.offered}
                          onChange={(event) =>
                            handleScoreChange(index, "exam", event.target.value)
                          }
                          className="mx-auto block w-full max-w-16 rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-center text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                          placeholder="0"
                        />
                      </td>

                      {/* Total */}
                      <td className="px-2 py-4 align-middle text-center">
                        <div
                          className={`mx-auto flex h-10 w-14 items-center justify-center rounded-lg text-sm font-bold ${
                            entry.offered
                              ? "bg-slate-800 text-white"
                              : "bg-slate-900 text-slate-600"
                          }`}
                        >
                          {entry.offered ? total : "—"}
                        </div>
                      </td>

                      {/* Grade */}
                      <td className="px-2 py-4 align-middle text-center">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div
                            className={`mx-auto flex h-10 w-12 items-center justify-center rounded-lg text-sm font-bold ${
                              grade === "F"
                                ? "bg-red-500/10 text-red-400"
                                : grade
                                  ? "bg-blue-500/10 text-blue-400"
                                  : "bg-slate-900 text-slate-600"
                            }`}
                          >
                            {grade || "—"}
                          </div>

                          {remark && (
                            <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                              {remark}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Teacher Comment */}
                      <td className="px-3 py-4 align-middle">
                        <input
                          type="text"
                          value={entry.teacherComment}
                          disabled={!entry.offered}
                          onChange={(event) =>
                            handleCommentChange(index, event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                          placeholder="Enter teacher comment..."
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="border-t border-slate-800 bg-slate-950/50 px-4 py-4">
            <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="text-slate-400">
                Scores:
                <span className="ml-2 font-semibold text-white">CA1 / 20</span>
                <span className="mx-2 text-slate-700">+</span>
                <span className="font-semibold text-white">CA2 / 10</span>
                <span className="mx-2 text-slate-700">+</span>
                <span className="font-semibold text-white">Exam / 70</span>
                <span className="mx-2 text-slate-700">=</span>
                <span className="font-semibold text-blue-400">Total / 100</span>
              </div>

              <div className="text-slate-400">
                Overall:
                <span className="ml-2 font-bold text-white">
                  {totalScore} / {totalPossibleScore}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <FaArrowLeft />
            Back
          </button>

          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Continue
            <FaArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultScoreEntry;
