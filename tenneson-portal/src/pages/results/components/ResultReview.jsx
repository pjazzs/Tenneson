import calculateResultGrade from "../../../utils/resultGrade";
import { FaArrowLeft, FaArrowRight, FaEdit } from "react-icons/fa";

const formatValue = (value) => {
  if (value === "" || value === null || value === undefined) {
    return "—";
  }

  return value;
};

const TERM_NAMES = {
  first: "First Term",
  second: "Second Term",
  third: "Third Term",
};

const ResultReview = ({
  selectedStudent,
  academicSession,
  term,
  scoreEntries = [],
  onTeacherCommentChange,
  previousTermResults = { first: null, second: null },
  attendance,
  affectiveDomain,
  psychomotorDomain,
  conduct,
  sports = [],
  clubs = [],
  specialReport,
  comments,
  onBack,
  onEditSection,
  onContinue,
  error,
  successMessage,
}) => {
  const canEditTeacherComments = typeof onTeacherCommentChange === "function";

  const currentTermKey = String(term || "")
    .trim()
    .toLowerCase()
    .replace(/\s*term\s*/g, "");

  const showFirstTerm = ["second", "third"].includes(currentTermKey);
  const showSecondTerm = currentTermKey === "third";

  const getPreviousTermTotal = (previousTerm, entry) => {
    const result = previousTermResults?.[previousTerm];

    if (!result || !entry?.subjectId) {
      return "—";
    }

    const subjectResult = result.subjectResults?.find((item) => {
      const subject =
        item.subject && typeof item.subject === "object"
          ? item.subject._id
          : item.subject;

      return (
        String(subject || item.subjectId || "") === String(entry.subjectId)
      );
    });

    if (!subjectResult || subjectResult.offered !== true) {
      return "—";
    }

    const total = Number(subjectResult.total);

    if (
      subjectResult.total === null ||
      subjectResult.total === undefined ||
      subjectResult.total === "" ||
      !Number.isFinite(total)
    ) {
      return "—";
    }

    return total;
  };

  const totalSubjects = scoreEntries.length;

  const completedSubjects = scoreEntries.filter(
    (entry) =>
      !entry.offered ||
      (entry.ca1 !== "" &&
        entry.ca1 !== null &&
        entry.ca1 !== undefined &&
        entry.ca2 !== "" &&
        entry.ca2 !== null &&
        entry.ca2 !== undefined &&
        entry.exam !== "" &&
        entry.exam !== null &&
        entry.exam !== undefined),
  ).length;

  const affectiveFields = [
    { key: "punctuality", label: "Punctuality" },
    { key: "attentiveness", label: "Attentiveness" },
    { key: "neatness", label: "Neatness" },
    { key: "politeness", label: "Politeness" },
    { key: "reliability", label: "Reliability" },
    { key: "honesty", label: "Honesty" },
    { key: "initiative", label: "Initiative" },
    { key: "attitudeToWork", label: "Attitude to Work" },
  ];

  const psychomotorFields = [
    { key: "sportingActivities", label: "Sporting Activities" },
    { key: "handWriting", label: "Handwriting" },
    { key: "fluency", label: "Fluency" },
    { key: "drawingAndPainting", label: "Drawing & Painting" },
    { key: "musicalAbility", label: "Musical Ability" },
  ];

  const termName = TERM_NAMES[currentTermKey] || term;

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 text-sm font-medium text-blue-400">
            Result Entry
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Review Result
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Carefully review all information before proceeding.
          </p>
        </div>

        {/* Student Summary */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Student Information</h2>
              <p className="mt-1 text-sm text-slate-400">
                Basic information for this result.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onEditSection("selection")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <FaEdit />
              Edit
            </button>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Student
              </p>
              <p className="mt-1 font-semibold text-white">
                {selectedStudent?.firstName} {selectedStudent?.lastName}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Student ID
              </p>
              <p className="mt-1 font-semibold text-white">
                {formatValue(selectedStudent?.studentId)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Academic Session
              </p>
              <p className="mt-1 font-semibold text-white">
                {formatValue(academicSession?.name)}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Term
              </p>
              <p className="mt-1 font-semibold text-white">
                {formatValue(termName)}
              </p>
            </div>
          </div>
        </section>

        {/* Scores */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Subject Scores</h2>
              <p className="mt-1 text-sm text-slate-400">
                {completedSubjects} of {totalSubjects} subject entries
                completed.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onEditSection("scores")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <FaEdit />
              Edit
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="overflow-x-auto">
              <table className="w-full min-w-225 text-left">
                <thead className="bg-slate-950/80">
                  <tr className="border-b border-white/10">
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Subject
                    </th>

                    {showFirstTerm && (
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                        First Term
                      </th>
                    )}

                    {showSecondTerm && (
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Second Term
                      </th>
                    )}

                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                      CA1
                    </th>

                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                      CA2
                    </th>

                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Exam
                    </th>

                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Total
                    </th>

                    {showSecondTerm && (
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Cumulative Score
                      </th>
                    )}

                    {showSecondTerm && (
                      <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Weighted Average
                      </th>
                    )}

                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Grade
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {scoreEntries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={
                          6 + (showFirstTerm ? 1 : 0) + (showSecondTerm ? 2 : 0)
                        }
                        className="px-4 py-8 text-center text-sm text-slate-500"
                      >
                        No subjects have been entered.
                      </td>
                    </tr>
                  ) : (
                    scoreEntries.map((entry) => {
                      const isThirdTerm = currentTermKey === "third";

                      const scoresComplete =
                        entry.ca1 !== "" &&
                        entry.ca1 !== null &&
                        entry.ca1 !== undefined &&
                        entry.ca2 !== "" &&
                        entry.ca2 !== null &&
                        entry.ca2 !== undefined &&
                        entry.exam !== "" &&
                        entry.exam !== null &&
                        entry.exam !== undefined;

                      const currentTotal = scoresComplete
                        ? Number(entry.ca1) +
                          Number(entry.ca2) +
                          Number(entry.exam)
                        : null;

                      const previousFirstTotal = getPreviousTermTotal(
                        "first",
                        entry,
                      );

                      const previousSecondTotal = getPreviousTermTotal(
                        "second",
                        entry,
                      );

                      let cumulativeScore = null;
                      let weightedAverage = null;
                      let termsOffered = 0;

                      if (isThirdTerm) {
                        let cumulative = 0;

                        if (
                          entry.offered &&
                          scoresComplete &&
                          Number.isFinite(currentTotal)
                        ) {
                          cumulative += currentTotal;
                          termsOffered += 1;
                        }

                        for (const previousTotal of [
                          previousFirstTotal,
                          previousSecondTotal,
                        ]) {
                          if (
                            previousTotal !== "—" &&
                            Number.isFinite(Number(previousTotal))
                          ) {
                            cumulative += Number(previousTotal);
                            termsOffered += 1;
                          }
                        }

                        if (termsOffered > 0) {
                          cumulativeScore =
                            Math.round((cumulative + Number.EPSILON) * 100) /
                            100;

                          weightedAverage =
                            Math.round(
                              (cumulativeScore / termsOffered +
                                Number.EPSILON) *
                                100,
                            ) / 100;
                        }
                      }

                      const displayedTotal =
                        entry.offered && scoresComplete ? currentTotal : "—";

                      const gradeResult = isThirdTerm
                        ? weightedAverage !== null
                          ? calculateResultGrade(weightedAverage)
                          : null
                        : entry.offered && scoresComplete
                          ? calculateResultGrade(currentTotal)
                          : null;

                      const grade =
                        gradeResult?.grade || (entry.offered ? "—" : "N/A");

                      const remark = gradeResult?.remark || "";

                      return (
                        <tr
                          key={entry.subjectId}
                          className="border-b border-white/5 last:border-b-0"
                        >
                          <td className="px-4 py-4">
                            <p className="text-sm font-medium text-white">
                              {entry.subjectName}
                            </p>

                            {entry.subjectCode && (
                              <p className="mt-1 text-xs text-slate-500">
                                {entry.subjectCode}
                              </p>
                            )}
                          </td>

                          {showFirstTerm && (
                            <td className="px-3 py-4 text-center text-sm font-semibold text-slate-300">
                              {formatValue(previousFirstTotal)}
                            </td>
                          )}

                          {showSecondTerm && (
                            <td className="px-3 py-4 text-center text-sm font-semibold text-slate-300">
                              {formatValue(previousSecondTotal)}
                            </td>
                          )}

                          <td className="px-3 py-4 text-center text-sm text-slate-300">
                            {formatValue(entry.ca1)}
                          </td>

                          <td className="px-3 py-4 text-center text-sm text-slate-300">
                            {formatValue(entry.ca2)}
                          </td>

                          <td className="px-3 py-4 text-center text-sm text-slate-300">
                            {formatValue(entry.exam)}
                          </td>

                          <td className="px-3 py-4 text-center">
                            <span className="inline-flex min-w-12 items-center justify-center rounded-lg bg-blue-500/10 px-2 py-1 text-sm font-semibold text-blue-300">
                              {formatValue(displayedTotal)}
                            </span>
                          </td>

                          {showSecondTerm && (
                            <td className="px-3 py-4 text-center">
                              <span className="inline-flex min-w-12 items-center justify-center rounded-lg bg-violet-500/10 px-2 py-1 text-sm font-semibold text-violet-300">
                                {formatValue(cumulativeScore)}
                              </span>
                            </td>
                          )}

                          {showSecondTerm && (
                            <td className="px-3 py-4 text-center">
                              <span className="inline-flex min-w-12 items-center justify-center rounded-lg bg-emerald-500/10 px-2 py-1 text-sm font-semibold text-emerald-300">
                                {formatValue(weightedAverage)}
                              </span>
                            </td>
                          )}

                          <td className="px-3 py-4 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`inline-flex h-9 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-bold ${
                                  grade === "F"
                                    ? "bg-red-500/10 text-red-400"
                                    : grade === "D" || grade === "M"
                                      ? "bg-emerald-500/10 text-emerald-400"
                                      : grade === "P"
                                        ? "bg-blue-500/10 text-blue-400"
                                        : "bg-slate-800 text-slate-500"
                                }`}
                              >
                                {grade}
                              </span>

                              {remark && (
                                <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                                  {remark}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Subject Teacher Comments */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold">Subject Teacher Comments</h2>

            <p className="mt-1 text-sm text-slate-400">
              Add or update an optional comment for each subject. These comments
              will be saved with the compiled result.
            </p>
          </div>

          {!canEditTeacherComments && (
            <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
              Subject teacher comments are currently read-only because the
              comment update handler was not provided.
            </div>
          )}

          {scoreEntries.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-500">
              There are no subject entries to comment on.
            </p>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {scoreEntries.map((entry) => {
                const teacherComment = entry.teacherComment || "";

                return (
                  <div
                    key={entry.subjectId}
                    className="rounded-xl border border-white/10 bg-slate-950/60 p-4"
                  >
                    <label
                      htmlFor={`teacher-comment-${entry.subjectId}`}
                      className="mb-2 block text-sm font-semibold text-white"
                    >
                      {entry.subjectName}
                    </label>

                    <textarea
                      id={`teacher-comment-${entry.subjectId}`}
                      name={`teacherComment-${entry.subjectId}`}
                      value={teacherComment}
                      onChange={(event) =>
                        onTeacherCommentChange?.(
                          entry.subjectId,
                          event.target.value,
                        )
                      }
                      placeholder="Add an optional teacher comment..."
                      rows={3}
                      maxLength={1000}
                      disabled={!canEditTeacherComments}
                      className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <p className="mt-2 text-right text-xs text-slate-500">
                      {teacherComment.length}/1000 characters
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Attendance */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Attendance</h2>
              <p className="mt-1 text-sm text-slate-400">
                Student attendance for the term.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onEditSection("attendance")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <FaEdit />
              Edit
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                School Opened
              </p>
              <p className="mt-2 text-2xl font-bold text-white">
                {formatValue(attendance?.daysSchoolOpened)}
              </p>
            </div>

            <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Days Present
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-400">
                {formatValue(attendance?.daysPresent)}
              </p>
            </div>

            <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Days Absent
              </p>
              <p className="mt-2 text-2xl font-bold text-red-400">
                {formatValue(attendance?.daysAbsent)}
              </p>
            </div>
          </div>
        </section>

        {/* Affective Domain */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Affective Domain</h2>
              <p className="mt-1 text-sm text-slate-400">
                Behavioural and social development assessment.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onEditSection("affective")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <FaEdit />
              Edit
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {affectiveFields.map((field) => (
              <div
                key={field.key}
                className="rounded-xl border border-white/10 bg-slate-950/60 p-4"
              >
                <p className="text-xs text-slate-400">{field.label}</p>
                <p className="mt-2 text-xl font-bold text-white">
                  {formatValue(affectiveDomain?.[field.key])}
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    /5
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Psychomotor Domain */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Psychomotor Domain</h2>
              <p className="mt-1 text-sm text-slate-400">
                Practical and physical skill assessment.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onEditSection("psychomotor")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <FaEdit />
              Edit
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {psychomotorFields.map((field) => (
              <div
                key={field.key}
                className="rounded-xl border border-white/10 bg-slate-950/60 p-4"
              >
                <p className="text-xs text-slate-400">{field.label}</p>
                <p className="mt-2 text-xl font-bold text-white">
                  {formatValue(psychomotorDomain?.[field.key])}
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    /5
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Conduct */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Conduct</h2>
              <p className="mt-1 text-sm text-slate-400">
                Overall conduct assessment.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onEditSection("conduct")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <FaEdit />
              Edit
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Conduct
            </p>
            <p className="mt-2 text-lg font-semibold capitalize text-white">
              {formatValue(conduct)}
            </p>
          </div>
        </section>

        {/* Additional Information */}
        <section className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Additional Information</h2>
              <p className="mt-1 text-sm text-slate-400">
                Extracurricular activities and result comments.
              </p>
            </div>

            <button
              type="button"
              onClick={() => onEditSection("additional")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <FaEdit />
              Edit
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Sports */}
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Sports
              </p>

              {sports.length === 0 ? (
                <p className="text-sm text-slate-500">No sports entered.</p>
              ) : (
                <div className="space-y-2">
                  {sports.map((sport, index) => (
                    <div
                      key={`${sport.event}-${index}`}
                      className="rounded-xl border border-blue-500/10 bg-blue-500/5 p-3"
                    >
                      <p className="text-sm font-semibold text-blue-300">
                        {sport.event}
                      </p>

                      {sport.remark && (
                        <p className="mt-1 text-xs text-slate-400">
                          {sport.remark}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Clubs */}
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Clubs & Societies
              </p>

              {clubs.length === 0 ? (
                <p className="text-sm text-slate-500">No clubs entered.</p>
              ) : (
                <div className="space-y-2">
                  {clubs.map((club, index) => (
                    <div
                      key={`${club.organization}-${index}`}
                      className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-3"
                    >
                      <p className="text-sm font-semibold text-emerald-300">
                        {club.organization}
                      </p>

                      {club.officeHeld && (
                        <p className="mt-1 text-xs text-slate-400">
                          Office: {club.officeHeld}
                        </p>
                      )}

                      {club.significantContribution && (
                        <p className="mt-1 text-xs text-slate-400">
                          Contribution: {club.significantContribution}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Special Report */}
            <div>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Special Report
              </p>

              <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {formatValue(specialReport)}
                </p>
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                  Class Teacher's Comment
                </p>

                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {formatValue(comments?.classTeacher)}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                  Performance Comment
                </p>

                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {formatValue(comments?.performance)}
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                  Principal's Comment
                </p>

                <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {formatValue(comments?.principal)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Success */}
        {successMessage && (
          <div className="mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {successMessage}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Bottom Navigation */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            <FaArrowLeft />
            Back to Additional Information
          </button>

          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Proceed
            <FaArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultReview;
