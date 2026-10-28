import { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaArrowRight, FaCheckCircle } from "react-icons/fa";

import { getResults, getResult } from "../../../api/resultApi";
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
  const [previousTermResults, setPreviousTermResults] = useState({
    first: null,
    second: null,
  });

  const [previousTermsLoading, setPreviousTermsLoading] = useState(false);
  const [previousTermsError, setPreviousTermsError] = useState("");

  const currentTermKey = String(term || "")
    .trim()
    .toLowerCase()
    .replace(/\s*term\s*/g, "");

  const termsToRetrieve = useMemo(() => {
    if (currentTermKey === "second") return ["first"];
    if (currentTermKey === "third") return ["first", "second"];
    return [];
  }, [currentTermKey]);

  /*
  |--------------------------------------------------------------------------
  | Retrieve Previous-Term Results
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;

    const retrievePreviousTermResults = async () => {
      setPreviousTermResults({
        first: null,
        second: null,
      });
      setPreviousTermsError("");

      const studentId = selectedStudent?.studentId;
      const sessionId = academicSession?._id;

      if (!studentId || !sessionId || termsToRetrieve.length === 0) {
        setPreviousTermsLoading(false);
        return;
      }

      setPreviousTermsLoading(true);

      const retrieved = {
        first: null,
        second: null,
      };

      try {
        for (const previousTerm of termsToRetrieve) {
          const response = await getResults({
            studentId,
            academicSessionId: sessionId,
            term: previousTerm,
            page: 1,
            limit: 100,
          });

          const results = Array.isArray(response?.results)
            ? response.results
            : [];

          const matchingResult = results.find((result) => {
            const resultStudentId =
              typeof result.student === "object"
                ? result.student?.studentId
                : result.student;

            const resultSessionId =
              typeof result.academicSession === "object"
                ? result.academicSession?._id
                : result.academicSession;

            return (
              String(resultStudentId || "") === String(studentId) &&
              String(resultSessionId || "") === String(sessionId) &&
              String(result.term || "").toLowerCase() === previousTerm &&
              ["approved", "published"].includes(
                String(result.status || "").toLowerCase(),
              )
            );
          });

          if (!matchingResult?._id) continue;

          const detailResponse = await getResult(matchingResult._id);
          const fullResult = detailResponse?.result;

          if (
            fullResult &&
            String(fullResult.term || "").toLowerCase() === previousTerm &&
            ["approved", "published"].includes(
              String(fullResult.status || "").toLowerCase(),
            )
          ) {
            retrieved[previousTerm] = fullResult;
          }
        }

        if (!cancelled) {
          setPreviousTermResults(retrieved);
        }
      } catch (fetchError) {
        console.error("Failed to retrieve previous-term results:", fetchError);

        if (!cancelled) {
          setPreviousTermResults(retrieved);
          setPreviousTermsError(
            "Previous-term scores could not be loaded. Current-term score entry is still available.",
          );
        }
      } finally {
        if (!cancelled) {
          setPreviousTermsLoading(false);
        }
      }
    };

    retrievePreviousTermResults();

    return () => {
      cancelled = true;
    };
  }, [selectedStudent?.studentId, academicSession?._id, termsToRetrieve]);

  /*
  |--------------------------------------------------------------------------
  | Current-Term Total and Score Validation
  |--------------------------------------------------------------------------
  */

  const getTotal = (entry) => {
    const ca1 = Number(entry.ca1) || 0;
    const ca2 = Number(entry.ca2) || 0;
    const exam = Number(entry.exam) || 0;

    return ca1 + ca2 + exam;
  };

  const hasCompleteScores = (entry) => {
    const values = [entry.ca1, entry.ca2, entry.exam];

    return values.every(
      (value) =>
        value !== "" &&
        value !== null &&
        value !== undefined &&
        Number.isFinite(Number(value)),
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Previous-Term Subject Lookup
  |--------------------------------------------------------------------------
  */

  const getPreviousSubjectResult = (previousTerm, entry) => {
    const result = previousTermResults[previousTerm];

    if (!result || !entry?.subjectId) return null;

    return (
      result.subjectResults?.find((item) => {
        const subject =
          item.subject && typeof item.subject === "object"
            ? item.subject._id
            : item.subject;

        const subjectId = subject || item.subjectId;

        return String(subjectId || "") === String(entry.subjectId);
      }) || null
    );
  };

  const getPreviousSubjectInfo = (previousTerm, entry) => {
    const subjectResult = getPreviousSubjectResult(previousTerm, entry);

    if (!subjectResult || subjectResult.offered !== true) {
      return {
        offered: false,
        total: null,
      };
    }

    const total = Number(subjectResult.total);

    if (
      subjectResult.total === null ||
      subjectResult.total === undefined ||
      subjectResult.total === "" ||
      !Number.isFinite(total)
    ) {
      return {
        offered: false,
        total: null,
      };
    }

    return {
      offered: true,
      total,
    };
  };

  const getPreviousSubjectScore = (previousTerm, entry) => {
    const previous = getPreviousSubjectInfo(previousTerm, entry);

    return previous.offered ? previous.total : null;
  };

  /*
  |--------------------------------------------------------------------------
  | Third-Term Cumulative Score and Weighted Average
  |--------------------------------------------------------------------------
  |
  | cumulativeScore = sum of applicable term totals.
  | weightedAverage = cumulativeScore / number of applicable terms.
  |
  | Previous-term results count only if the subject was offered and
  | the saved total is valid. A valid score of 0 is included.
  |--------------------------------------------------------------------------
  */

  const getThirdTermCalculation = (entry) => {
    let cumulativeScore = 0;
    let termsOffered = 0;

    // An offered current-term subject must have all scores entered
    // before its third-term score contributes to the calculation.
    if (entry.offered && hasCompleteScores(entry)) {
      cumulativeScore += getTotal(entry);
      termsOffered += 1;
    }

    // Include eligible previous-term scores even if the subject
    // is not offered in the current third term.
    for (const previousTerm of ["first", "second"]) {
      const previous = getPreviousSubjectInfo(previousTerm, entry);

      if (previous.offered && Number.isFinite(previous.total)) {
        cumulativeScore += previous.total;
        termsOffered += 1;
      }
    }

    if (termsOffered === 0) {
      return {
        cumulativeScore: null,
        weightedAverage: null,
        termsOffered: 0,
      };
    }

    cumulativeScore =
      Math.round((cumulativeScore + Number.EPSILON) * 100) / 100;

    const weightedAverage =
      Math.round((cumulativeScore / termsOffered + Number.EPSILON) * 100) / 100;

    return {
      cumulativeScore,
      weightedAverage,
      termsOffered,
    };
  };

  /*
  |--------------------------------------------------------------------------
  | Grade and Remark
  |--------------------------------------------------------------------------
  */

  const getGrade = (entry) => {
    if (currentTermKey === "third") {
      // Calculate the grade from all valid available term scores.
      // Previous-term scores can produce a grade before third-term
      // scores are entered.
      const { weightedAverage } = getThirdTermCalculation(entry);

      if (!Number.isFinite(weightedAverage)) {
        return {
          grade: null,
          remark: "",
        };
      }

      return calculateResultGrade(weightedAverage);
    }

    // Preserve first- and second-term grading behavior.
    if (!entry.offered || !hasCompleteScores(entry)) {
      return {
        grade: null,
        remark: "",
      };
    }

    return calculateResultGrade(getTotal(entry));
  };

  /*
  |--------------------------------------------------------------------------
  | Overall Result Summary
  |--------------------------------------------------------------------------
  */

  const overallSummary = useMemo(() => {
    let totalScore = 0;
    let totalPossibleScore = 0;

    if (currentTermKey === "third") {
      for (const previousTerm of ["first", "second"]) {
        const result = previousTermResults[previousTerm];

        if (!Array.isArray(result?.subjectResults)) continue;

        result.subjectResults.forEach((subjectResult) => {
          if (subjectResult.offered !== true) return;

          const total = Number(subjectResult.total);

          if (
            subjectResult.total === null ||
            subjectResult.total === undefined ||
            subjectResult.total === "" ||
            !Number.isFinite(total)
          ) {
            return;
          }

          totalScore += total;
          totalPossibleScore += 100;
        });
      }
    }

    scoreEntries.forEach((entry) => {
      if (!entry.offered) return;

      // Avoid treating incomplete current-term scores as a completed
      // zero score in the overall summary.
      if (!hasCompleteScores(entry)) return;

      totalScore += getTotal(entry);
      totalPossibleScore += 100;
    });

    const overallPercentage =
      totalPossibleScore === 0 ? 0 : (totalScore / totalPossibleScore) * 100;

    return {
      totalScore: Math.round((totalScore + Number.EPSILON) * 100) / 100,
      totalPossibleScore,
      overallPercentage,
    };
  }, [scoreEntries, previousTermResults, currentTermKey]);

  /*
  |--------------------------------------------------------------------------
  | Update Scores
  |--------------------------------------------------------------------------
  */

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

    if (!Number.isFinite(numericValue)) return;

    const limits = {
      ca1: 20,
      ca2: 10,
      exam: 70,
    };

    const max = limits[field];

    if (numericValue < 0 || numericValue > max) return;

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

  const isSecondTerm = currentTermKey === "second";
  const isThirdTerm = currentTermKey === "third";
  const showFirstTermColumn = currentTermKey !== "first";

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

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
              {overallSummary.overallPercentage.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Phase Progress Indicator */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
                <FaCheckCircle />
              </div>

              <span className="hidden text-sm font-medium text-emerald-400 sm:block">
                Selection
              </span>
            </div>

            <div className="h-px flex-1 bg-emerald-500" />

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                2
              </div>

              <span className="text-sm font-medium text-white">Scores</span>
            </div>

            <div className="h-px flex-1 bg-slate-800" />

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold text-slate-500">
                3
              </div>

              <span className="hidden text-sm text-slate-500 sm:block">
                Attendance
              </span>
            </div>

            <div className="hidden h-px flex-1 bg-slate-800 md:block" />

            <div className="hidden shrink-0 items-center gap-2 md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold text-slate-500">
                4
              </div>

              <span className="text-sm text-slate-500">Affective</span>
            </div>

            <div className="hidden h-px flex-1 bg-slate-800 lg:block" />

            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold text-slate-500">
                5
              </div>

              <span className="text-sm text-slate-500">Psychomotor</span>
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
              {isThirdTerm ? "Cumulative Score" : "Total Score"}
            </div>

            <div className="mt-2 font-semibold text-white">
              {overallSummary.totalScore} / {overallSummary.totalPossibleScore}
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

        {/* Previous-Term Retrieval Status */}
        {termsToRetrieve.length > 0 && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              previousTermsError
                ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
                : "border-slate-800 bg-slate-900 text-slate-300"
            }`}
          >
            {previousTermsLoading ? (
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-blue-400" />
                Loading previous-term scores...
              </div>
            ) : previousTermsError ? (
              previousTermsError
            ) : (
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {termsToRetrieve.map((previousTerm) => (
                  <div key={previousTerm} className="flex items-center gap-2">
                    <FaCheckCircle
                      className={
                        previousTermResults[previousTerm]
                          ? "text-emerald-400"
                          : "text-slate-500"
                      }
                    />

                    <span>
                      {previousTerm === "first" ? "First" : "Second"} Term:{" "}
                      {previousTermResults[previousTerm]
                        ? "Previous result retrieved"
                        : "No approved or published result found"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Score Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-300 table-fixed">
              <thead className="border-b border-slate-800 bg-slate-950/70">
                <tr>
                  <th
                    className={`px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 ${
                      isThirdTerm
                        ? "w-[14%]"
                        : isSecondTerm
                          ? "w-[18%]"
                          : "w-[20%]"
                    }`}
                  >
                    Subject
                  </th>

                  {showFirstTermColumn && (
                    <th className="w-[8%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                      First Term
                    </th>
                  )}

                  {isThirdTerm && (
                    <th className="w-[8%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Second Term
                    </th>
                  )}

                  <th className="w-[7%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    CA1
                  </th>

                  <th className="w-[7%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    CA2
                  </th>

                  <th className="w-[7%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Exam
                  </th>

                  <th className="w-[8%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Term Total
                  </th>

                  {isThirdTerm && (
                    <>
                      <th className="w-[9%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Cumulative
                      </th>

                      <th className="w-[9%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Weighted Avg.
                      </th>
                    </>
                  )}

                  <th className="w-[7%] px-2 py-4 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Grade
                  </th>

                  <th className="w-[24%] px-3 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Teacher Comment
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {scoreEntries.map((entry, index) => {
                  const total = getTotal(entry);
                  const { grade, remark } = getGrade(entry);

                  const thirdTermCalculation = isThirdTerm
                    ? getThirdTermCalculation(entry)
                    : null;

                  const hasCumulativeScore =
                    thirdTermCalculation?.cumulativeScore !== null &&
                    thirdTermCalculation?.cumulativeScore !== undefined;

                  const hasWeightedAverage =
                    thirdTermCalculation?.weightedAverage !== null &&
                    thirdTermCalculation?.weightedAverage !== undefined;

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

                      {/* First Term Score */}
                      {showFirstTermColumn && (
                        <td className="px-2 py-4 text-center align-middle">
                          <div className="mx-auto flex h-10 w-14 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-slate-300">
                            {previousTermsLoading
                              ? "..."
                              : (getPreviousSubjectScore("first", entry) ??
                                "—")}
                          </div>
                        </td>
                      )}

                      {/* Second Term Score */}
                      {isThirdTerm && (
                        <td className="px-2 py-4 text-center align-middle">
                          <div className="mx-auto flex h-10 w-14 items-center justify-center rounded-lg bg-slate-800 text-sm font-semibold text-slate-300">
                            {previousTermsLoading
                              ? "..."
                              : (getPreviousSubjectScore("second", entry) ??
                                "—")}
                          </div>
                        </td>
                      )}

                      {/* CA1 */}
                      <td className="px-2 py-4 text-center align-middle">
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
                      <td className="px-2 py-4 text-center align-middle">
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
                      <td className="px-2 py-4 text-center align-middle">
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

                      {/* Current Term Total */}
                      <td className="px-2 py-4 text-center align-middle">
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

                      {/* Third-Term Cumulative Score */}
                      {isThirdTerm && (
                        <td className="px-2 py-4 text-center align-middle">
                          <div
                            className={`mx-auto flex h-10 w-16 items-center justify-center rounded-lg text-sm font-bold ${
                              hasCumulativeScore
                                ? "bg-slate-800 text-white"
                                : "bg-slate-900 text-slate-600"
                            }`}
                          >
                            {thirdTermCalculation.cumulativeScore ?? "—"}
                          </div>
                        </td>
                      )}

                      {/* Third-Term Weighted Average */}
                      {isThirdTerm && (
                        <td className="px-2 py-4 text-center align-middle">
                          <div
                            className={`mx-auto flex h-10 w-16 items-center justify-center rounded-lg text-sm font-bold ${
                              hasWeightedAverage
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-slate-900 text-slate-600"
                            }`}
                          >
                            {hasWeightedAverage
                              ? thirdTermCalculation.weightedAverage.toFixed(2)
                              : "—"}
                          </div>
                        </td>
                      )}

                      {/* Grade */}
                      <td className="px-2 py-4 text-center align-middle">
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
                <span className="font-semibold text-blue-400">
                  Term Total / 100
                </span>
                {isThirdTerm && (
                  <span className="ml-3 text-slate-400">
                    Grade is based on the weighted average.
                  </span>
                )}
              </div>

              <div className="text-slate-400">
                {isThirdTerm ? "Cumulative Overall" : "Overall"}:
                <span className="ml-2 font-bold text-white">
                  {overallSummary.totalScore} /{" "}
                  {overallSummary.totalPossibleScore}
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
