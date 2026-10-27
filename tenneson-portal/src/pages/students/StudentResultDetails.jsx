import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCalendar,
  FiUser,
  FiMessageSquare,
  FiAlertCircle,
  FiActivity,
  FiAward,
  FiClipboard,
} from "react-icons/fi";

import studentApi from "../../api/studentApi";

/**
 * Convert a field name such as "daysSchoolOpened" into
 * a readable label such as "Days School Opened".
 */
const formatLabel = (value) => {
  if (typeof value !== "string") return "";

  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

const isMeaningfulValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return false;
  }

  if (Array.isArray(value)) {
    return value.some(isMeaningfulValue);
  }

  if (typeof value === "object") {
    return Object.entries(value).some(
      ([key, nestedValue]) =>
        !["_id", "id", "__v", "createdAt", "updatedAt"].includes(key) &&
        isMeaningfulValue(nestedValue),
    );
  }

  return true;
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatDisplayValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  if (typeof value === "string") {
    return value;
  }

  return null;
};

/**
 * Render saved values without assuming that domains, sports,
 * clubs, or conduct use one particular data structure.
 */
function ResultDataValue({ value, depth = 0 }) {
  if (!isMeaningfulValue(value)) {
    return <span className="text-slate-500">—</span>;
  }

  const simpleValue = formatDisplayValue(value);

  if (simpleValue !== null) {
    return (
      <span className="text-slate-200 leading-7 wrap-break-word">
        {simpleValue}
      </span>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div
            key={item?._id || index}
            className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
          >
            {typeof item === "object" && item !== null ? (
              <ResultDataValue value={item} depth={depth + 1} />
            ) : (
              <ResultDataValue value={item} depth={depth + 1} />
            )}
          </div>
        ))}
      </div>
    );
  }

  const entries = Object.entries(value).filter(
    ([key, nestedValue]) =>
      !["_id", "id", "__v", "createdAt", "updatedAt"].includes(key) &&
      isMeaningfulValue(nestedValue),
  );

  if (!entries.length) {
    return <span className="text-slate-500">—</span>;
  }

  const isTopLevel = depth === 0;

  return (
    <div
      className={
        isTopLevel
          ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          : "space-y-3"
      }
    >
      {entries.map(([key, nestedValue]) => (
        <div
          key={key}
          className={
            isTopLevel
              ? "rounded-xl border border-slate-800 bg-slate-950/40 p-4"
              : "border-l-2 border-slate-700 pl-4"
          }
        >
          <p className="text-sm text-slate-400 mb-1">{formatLabel(key)}</p>

          <ResultDataValue value={nestedValue} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

/**
 * Display a result section only when it contains saved data.
 */
function ResultDataSection({ title, icon: Icon, value }) {
  if (!isMeaningfulValue(value)) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="flex items-center gap-3 mb-4">
        {Icon && <Icon className="text-blue-400" size={20} />}

        <h2 className="text-xl font-semibold">{title}</h2>
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
        <ResultDataValue value={value} />
      </div>
    </section>
  );
}

function StudentResultDetails() {
  const navigate = useNavigate();
  const { resultId } = useParams();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const hasResultId = Boolean(resultId);

  useEffect(() => {
    if (!hasResultId) return;

    let isMounted = true;

    const fetchResult = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await studentApi.get(`/results/my/${resultId}`);

        if (isMounted) {
          setResult(response.data?.result || null);
        }
      } catch (err) {
        console.error("Unable to fetch result:", err);

        if (!isMounted) return;

        if (err.response?.status === 401) {
          localStorage.removeItem("studentToken");
          localStorage.removeItem("student");

          navigate("/student/login", { replace: true });
          return;
        }

        setError(err.response?.data?.message || "Unable to load this result.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchResult();

    return () => {
      isMounted = false;
    };
  }, [resultId, navigate, hasResultId]);

  if (!hasResultId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <h1 className="text-xl font-semibold">No Result Selected</h1>

          <p className="text-slate-400 mt-2">Please select a result to view.</p>

          <button
            onClick={() => navigate("/student/results")}
            className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 transition"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  const formatTerm = (term) => {
    const terms = {
      first: "First Term",
      second: "Second Term",
      third: "Third Term",
    };

    return terms[term] || term || "Term";
  };

  const formatScore = (value) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    const number = Number(value);

    return Number.isFinite(number) ? number.toFixed(1) : "—";
  };

  const formatPercentage = (value) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    const number = Number(value);

    return Number.isFinite(number) ? `${number.toFixed(2)}%` : "—";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-slate-950 text-white px-4 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-red-500/10 text-red-400 flex items-center justify-center">
            <FiAlertCircle size={28} />
          </div>

          <h1 className="text-xl font-semibold mt-5">Unable to Load Result</h1>

          <p className="text-slate-400 mt-2">
            {error || "This result could not be found."}
          </p>

          <button
            onClick={() => navigate("/student/results")}
            className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 transition"
          >
            Back to Results
          </button>
        </div>
      </div>
    );
  }

  const student = result.student || {};

  const subjectResults = Array.isArray(result.subjectResults)
    ? result.subjectResults
    : [];

  const attendance = result.attendance || {};

  const academicSession = result.academicSession || {};

  // Support common date field names without assuming every result
  // document stores dates in the same location.

  const matchingTerm = Array.isArray(academicSession.terms)
    ? academicSession.terms.find(
        (term) =>
          term.key?.toLowerCase() === result.term?.toLowerCase() ||
          term.name?.toLowerCase() === result.term?.toLowerCase(),
      )
    : null;

  const closingDate =
    result.termDates?.closingDate ??
    result.closingDate ??
    result.termClosingDate ??
    matchingTerm?.closingDate ??
    matchingTerm?.endDate ??
    academicSession.closingDate ??
    academicSession.termClosingDate;

  const resumptionDate =
    result.termDates?.resumptionDate ??
    result.resumptionDate ??
    result.termResumptionDate ??
    matchingTerm?.resumptionDate ??
    academicSession.resumptionDate ??
    academicSession.termResumptionDate;

  const hasAttendance = isMeaningfulValue(result.attendance);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <button
            onClick={() => navigate("/student/results")}
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white transition"
          >
            <FiArrowLeft />
            Back to Results
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Result heading */}
        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                  <FiBookOpen size={24} />
                </div>

                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    {formatTerm(result.term)} Result
                  </h1>

                  <p className="text-slate-400 mt-1">
                    {academicSession.name || "Academic Session"}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:text-right">
              <p className="text-sm text-slate-400">Overall Percentage</p>

              <p className="text-4xl font-bold text-blue-400 mt-1">
                {formatPercentage(result.overallPercentage)}
              </p>
            </div>
          </div>
        </section>

        {/* Student information */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <FiUser />
              Student
            </div>

            <p className="mt-2 font-semibold">
              {[student.firstName, student.otherName, student.lastName]
                .filter(Boolean)
                .join(" ") || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <FiUser />
              Student ID
            </div>

            <p className="mt-2 font-semibold">{student.studentId || "—"}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <FiBookOpen />
              Class
            </div>

            <p className="mt-2 font-semibold">
              {student.currentClass || result.currentClass || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <FiCalendar />
              Term
            </div>

            <p className="mt-2 font-semibold">{formatTerm(result.term)}</p>
          </div>
        </section>

        {/* Term dates */}
        {(closingDate || resumptionDate) && (
          <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {closingDate && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <FiCalendar />
                  Term Closing Date
                </div>

                <p className="mt-2 font-semibold">{formatDate(closingDate)}</p>
              </div>
            )}

            {resumptionDate && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <FiCalendar />
                  Resumption Date
                </div>

                <p className="mt-2 font-semibold">
                  {formatDate(resumptionDate)}
                </p>
              </div>
            )}
          </section>
        )}

        {/* Summary */}
        <section className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Score</p>

            <p className="text-2xl font-bold mt-2">
              {result.totalScore ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total Obtainable</p>

            <p className="text-2xl font-bold mt-2">
              {result.totalObtainableMarks ?? "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Promotion Status</p>

            <p className="text-2xl font-bold mt-2 capitalize">
              {result.promotionStatus || "—"}
            </p>
          </div>
        </section>

        {/* Subject results */}
        <section className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <FiBookOpen className="text-blue-400" />

            <h2 className="text-xl font-semibold">Subject Results</h2>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-212.5">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/40">
                    <th className="text-left px-5 py-4 text-sm font-semibold text-slate-300">
                      Subject
                    </th>

                    <th className="text-center px-4 py-4 text-sm font-semibold text-slate-300">
                      CA 1
                    </th>

                    <th className="text-center px-4 py-4 text-sm font-semibold text-slate-300">
                      CA 2
                    </th>

                    <th className="text-center px-4 py-4 text-sm font-semibold text-slate-300">
                      Exam
                    </th>

                    <th className="text-center px-4 py-4 text-sm font-semibold text-slate-300">
                      Total
                    </th>

                    <th className="text-center px-4 py-4 text-sm font-semibold text-slate-300">
                      Grade
                    </th>

                    <th className="text-left px-5 py-4 text-sm font-semibold text-slate-300">
                      Remark
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {subjectResults.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-8 text-center text-slate-400"
                      >
                        No subject results are available for this term.
                      </td>
                    </tr>
                  ) : (
                    subjectResults.map((subject, index) => {
                      const subjectName =
                        subject.subjectName ||
                        subject.subject?.name ||
                        "Subject";

                      return (
                        <tr
                          key={
                            subject._id ||
                            subject.subject?._id ||
                            subject.subjectId ||
                            index
                          }
                          className="border-b border-slate-800 last:border-0"
                        >
                          <td className="px-5 py-4">
                            <div className="font-medium text-white">
                              {subjectName}
                            </div>

                            {subject.subjectCode && (
                              <div className="text-xs text-slate-500 mt-1">
                                {subject.subjectCode}
                              </div>
                            )}
                          </td>

                          <td className="text-center px-4 py-4 text-slate-300">
                            {subject.offered ? formatScore(subject.ca1) : "—"}
                          </td>

                          <td className="text-center px-4 py-4 text-slate-300">
                            {subject.offered ? formatScore(subject.ca2) : "—"}
                          </td>

                          <td className="text-center px-4 py-4 text-slate-300">
                            {subject.offered ? formatScore(subject.exam) : "—"}
                          </td>

                          <td className="text-center px-4 py-4 font-semibold">
                            {subject.offered ? formatScore(subject.total) : "—"}
                          </td>

                          <td className="text-center px-4 py-4">
                            <span className="inline-flex min-w-10 justify-center px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 font-semibold">
                              {subject.offered ? subject.grade || "—" : "—"}
                            </span>
                          </td>

                          <td className="px-5 py-4 text-slate-400">
                            {subject.offered
                              ? subject.remark || "—"
                              : "Not Offered"}
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

        {/* Attendance */}
        {hasAttendance && (
          <section className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <FiCalendar className="text-blue-400" />

              <h2 className="text-xl font-semibold">Attendance</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Days School Opened</p>

                <p className="text-2xl font-bold mt-2">
                  {attendance.daysSchoolOpened ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Days Present</p>

                <p className="text-2xl font-bold text-emerald-400 mt-2">
                  {attendance.daysPresent ?? 0}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">Days Absent</p>

                <p className="text-2xl font-bold text-red-400 mt-2">
                  {attendance.daysAbsent ?? 0}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Affective domain */}
        <ResultDataSection
          title="Affective Domain"
          icon={FiActivity}
          value={result.affectiveDomain}
        />

        {/* Psychomotor domain */}
        <ResultDataSection
          title="Psychomotor Domain"
          icon={FiActivity}
          value={result.psychomotorDomain}
        />

        {/* Conduct */}
        <ResultDataSection
          title="Conduct"
          icon={FiClipboard}
          value={result.conduct}
        />

        {/* Sports */}
        <ResultDataSection
          title="Sports"
          icon={FiAward}
          value={result.sports}
        />

        {/* Clubs and societies */}
        <ResultDataSection
          title="Clubs and Societies"
          icon={FiBookOpen}
          value={result.clubs}
        />

        {/* Special report */}
        <ResultDataSection
          title="Special Report"
          icon={FiMessageSquare}
          value={result.specialReport}
        />

        {/* Comments */}
        {(result.comments?.classTeacher ||
          result.comments?.principal ||
          result.performanceComment) && (
          <section className="mt-8">
            <div className="flex items-center gap-3 mb-4">
              <FiMessageSquare className="text-blue-400" />

              <h2 className="text-xl font-semibold">Comments</h2>
            </div>

            <div className="space-y-4">
              {result.comments?.classTeacher && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-sm text-slate-400">Class Teacher</p>

                  <p className="mt-2 text-slate-200 leading-7 whitespace-pre-wrap">
                    {result.comments.classTeacher}
                  </p>
                </div>
              )}

              {result.comments?.principal && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-sm text-slate-400">Principal</p>

                  <p className="mt-2 text-slate-200 leading-7 whitespace-pre-wrap">
                    {result.comments.principal}
                  </p>
                </div>
              )}

              {result.performanceComment && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-sm text-slate-400">Performance Comment</p>

                  <p className="mt-2 text-slate-200 leading-7 whitespace-pre-wrap">
                    {result.performanceComment}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default StudentResultDetails;
