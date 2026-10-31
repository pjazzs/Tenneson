import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FaArrowLeft,
  FaBookOpen,
  FaCheckCircle,
  FaClipboardCheck,
  FaExclamationCircle,
  FaLock,
  FaSave,
  FaSignOutAlt,
} from "react-icons/fa";

import teacherApi from "../../api/teacherApi";
import useTeacherAuth from "../../hooks/useTeacherAuth";

const TERM_LABELS = {
  first: "First Term",
  second: "Second Term",
  third: "Third Term",
};

const SCORE_FIELDS = [
  { key: "ca1", label: "CA 1", maximum: 20 },
  { key: "ca2", label: "CA 2", maximum: 10 },
  { key: "exam", label: "Examination", maximum: 70 },
];

function formatError(error) {
  const data = error.response?.data;

  let message = data?.message || "Something went wrong. Please try again.";

  if (data?.incompleteStudents?.length) {
    const names = data.incompleteStudents
      .slice(0, 8)
      .map((student) => student.studentName || student.studentId)
      .join(", ");

    message += ` Incomplete students: ${names}${
      data.incompleteStudents.length > 8 ? ", and others." : "."
    }`;
  }

  return message;
}

function TeacherSubjectResultEntry() {
  const navigate = useNavigate();
  const { allocationId } = useParams();
  const [searchParams] = useSearchParams();

  const academicSessionId = searchParams.get("academicSessionId") || "";
  const term = searchParams.get("term") || "";

  const { logoutTeacher } = useTeacherAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [allocation, setAllocation] = useState(null);
  const [academicSession, setAcademicSession] = useState(null);
  const [studentResults, setStudentResults] = useState([]);

  const [status, setStatus] = useState("not_started");
  const [isResultOwner, setIsResultOwner] = useState(false);
  const [canEdit, setCanEdit] = useState(false);

  const handleUnauthorized = useCallback(
    (err) => {
      if (err.response?.status === 401) {
        logoutTeacher();
        navigate("/teacher/login", { replace: true });
        return true;
      }

      return false;
    },
    [logoutTeacher, navigate],
  );

  const loadSubjectResults = useCallback(async () => {
    if (!allocationId || !academicSessionId || !TERM_LABELS[term]) {
      setError("The subject, academic session or term information is invalid.");
      setLoading(false);
      return;
    }

    try {
      const response = await teacherApi.get(
        `/teacher/subject-results/${allocationId}`,
        {
          params: {
            academicSessionId,
            term,
          },
        },
      );

      const data = response.data;

      setAllocation(data.allocation || null);
      setAcademicSession(data.academicSession || null);
      setStudentResults(data.studentResults || []);
      setStatus(data.status || "not_started");
      setIsResultOwner(Boolean(data.isResultOwner));
      setCanEdit(Boolean(data.canEdit));
      setError("");
    } catch (err) {
      console.error(
        "Teacher subject result loading error:",
        err.response?.data || err.message,
      );

      if (!handleUnauthorized(err)) {
        setError(formatError(err));
      }
    } finally {
      setLoading(false);
    }
  }, [allocationId, academicSessionId, term, handleUnauthorized]);

  const handleRetry = () => {
    setLoading(true);
    setError("");
    setNotice("");
    loadSubjectResults();
  };

  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        loadSubjectResults();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadSubjectResults]);

  const completedStudents = useMemo(
    () =>
      studentResults.filter(
        (student) =>
          student.offered !== false &&
          student.ca1 !== null &&
          student.ca1 !== undefined &&
          student.ca2 !== null &&
          student.ca2 !== undefined &&
          student.exam !== null &&
          student.exam !== undefined,
      ).length,
    [studentResults],
  );

  const eligibleStudents = useMemo(
    () => studentResults.filter((student) => student.offered !== false).length,
    [studentResults],
  );

  const incompleteStudents = eligibleStudents - completedStudents;

  const completionPercentage =
    eligibleStudents > 0
      ? Math.round((completedStudents / eligibleStudents) * 100)
      : 0;

  const updateStudentField = (studentId, field, value) => {
    setStudentResults((previous) =>
      previous.map((student) =>
        student.student === studentId
          ? {
              ...student,
              [field]:
                field === "teacherComment"
                  ? value
                  : value === ""
                    ? null
                    : Number(value),
            }
          : student,
      ),
    );

    setNotice("");
    setError("");
  };

  const handleSaveDraft = async () => {
    if (!canEdit || saving || submitting) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const payload = {
        academicSessionId,
        term,
        studentResults: studentResults.map((student) => ({
          student: student.student,
          ca1: student.ca1,
          ca2: student.ca2,
          exam: student.exam,
          teacherComment: student.teacherComment || "",
        })),
      };

      const response = await teacherApi.put(
        `/teacher/subject-results/${allocationId}/draft`,
        payload,
      );

      setStatus(response.data.submission?.status || "draft");
      setCanEdit(true);
      setNotice(response.data.message || "Draft saved successfully.");
    } catch (err) {
      console.error(
        "Teacher result draft save error:",
        err.response?.data || err.message,
      );

      if (!handleUnauthorized(err)) {
        setError(formatError(err));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitResults = async () => {
    if (!canEdit || saving || submitting) return;

    if (incompleteStudents > 0) {
      setError(
        `You still have ${incompleteStudents} student(s) with incomplete scores. Complete all CA1, CA2 and examination scores before submitting.`,
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to submit these subject results? You will not be able to edit them after submission.",
    );

    if (!confirmed) return;

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const response = await teacherApi.post(
        `/teacher/subject-results/${allocationId}/submit`,
        {
          academicSessionId,
          term,
        },
      );

      setStatus("submitted");
      setCanEdit(false);
      setNotice(
        response.data.message || "Subject results submitted successfully.",
      );
    } catch (err) {
      console.error(
        "Teacher result submission error:",
        err.response?.data || err.message,
      );

      if (!handleUnauthorized(err)) {
        setError(formatError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    logoutTeacher();
    navigate("/teacher/login", { replace: true });
  };

  const subject = allocation?.subject?.name || "Subject Result Entry";
  const schoolClass = allocation?.schoolClass?.name || "";
  const department = allocation?.department?.name || "";

  const statusLabel =
    status === "submitted"
      ? "Submitted"
      : status === "draft"
        ? "Draft"
        : "Not Started";

  const statusClass =
    status === "submitted"
      ? "bg-blue-100 text-blue-700"
      : status === "draft"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Tenneson</h1>
            <p className="text-xs text-slate-500">Teacher Portal</p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <FaSignOutAlt />
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/teacher/dashboard")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <FaArrowLeft />
          Back to Dashboard
        </button>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
            <div>
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
                <FaBookOpen />
              </div>

              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Subject Result Entry
              </p>

              <h2 className="mt-1 text-2xl font-bold text-slate-900">
                {subject}
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {[
                  schoolClass,
                  department,
                  academicSession?.name,
                  TERM_LABELS[term],
                ]
                  .filter(Boolean)
                  .join(" • ")}
              </p>
            </div>

            <span
              className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${statusClass}`}
            >
              {status === "submitted" ? (
                <FaCheckCircle />
              ) : (
                <FaClipboardCheck />
              )}
              {statusLabel}
            </span>
          </div>

          {!loading && (
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Eligible Students</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {eligibleStudents}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">Completed Scores</p>
                <p className="mt-1 text-2xl font-bold text-emerald-800">
                  {completedStudents}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-4">
                <p className="text-sm text-amber-700">Incomplete Scores</p>
                <p className="mt-1 text-2xl font-bold text-amber-800">
                  {incompleteStudents}
                </p>
              </div>
            </div>
          )}

          {!loading && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-500">
                <span>Score completion</span>
                <span>{completionPercentage}%</span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <FaExclamationCircle className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {notice && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <FaCheckCircle className="mt-0.5 shrink-0" />
            <p>{notice}</p>
          </div>
        )}

        {!loading && !isResultOwner && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <FaLock className="mt-0.5 shrink-0" />
            <p>
              You are assigned to this subject, but you are not the designated
              teacher responsible for submitting its results. You can view the
              scores, but you cannot edit or submit them.
            </p>
          </div>
        )}

        {!loading && isResultOwner && status === "submitted" && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            <FaLock className="mt-0.5 shrink-0" />
            <p>
              These results have been submitted. Editing and further submission
              are locked.
            </p>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
            <p className="text-sm font-medium text-slate-600">
              Loading student result sheet...
            </p>
          </div>
        ) : error && studentResults.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">
              The result sheet could not be loaded.
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-4 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Try Again
            </button>
          </div>
        ) : studentResults.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <FaExclamationCircle className="mx-auto mb-3 text-3xl text-slate-400" />
            <h3 className="font-semibold text-slate-800">
              No eligible students found
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              There are currently no eligible students for this subject,
              academic session and term.
            </p>
          </div>
        ) : (
          <>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 p-5 sm:p-6">
                <h3 className="font-bold text-slate-900">
                  Student Score Sheet
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Enter scores within the permitted ranges: CA1 (0–20), CA2
                  (0–10), Examination (0–70).
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-225 border-collapse text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-4">#</th>
                      <th className="px-4 py-4">Student</th>
                      <th className="px-4 py-4">Student ID</th>
                      <th className="px-4 py-4">CA1 / 20</th>
                      <th className="px-4 py-4">CA2 / 10</th>
                      <th className="px-4 py-4">Exam / 70</th>
                      <th className="px-4 py-4">Total / 100</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {studentResults.map((student, index) => {
                      const complete =
                        student.offered === false ||
                        (student.ca1 !== null &&
                          student.ca1 !== undefined &&
                          student.ca2 !== null &&
                          student.ca2 !== undefined &&
                          student.exam !== null &&
                          student.exam !== undefined);

                      const total =
                        (Number(student.ca1) || 0) +
                        (Number(student.ca2) || 0) +
                        (Number(student.exam) || 0);

                      return (
                        <tr
                          key={student.student}
                          className="align-top hover:bg-slate-50/70"
                        >
                          <td className="px-4 py-4 text-sm text-slate-500">
                            {index + 1}
                          </td>

                          <td className="px-4 py-4">
                            <p className="min-w-40 font-semibold text-slate-800">
                              {student.studentName}
                            </p>
                            {student.offered === false && (
                              <span className="mt-1 inline-block text-xs text-slate-400">
                                Not offering this subject
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-4 text-sm text-slate-600">
                            {student.studentId}
                          </td>

                          {SCORE_FIELDS.map((field) => (
                            <td className="px-4 py-4" key={field.key}>
                              <input
                                type="number"
                                min="0"
                                max={field.maximum}
                                step="any"
                                value={student[field.key] ?? ""}
                                disabled={!canEdit || student.offered === false}
                                onChange={(event) => {
                                  const value = event.target.value;

                                  if (
                                    value !== "" &&
                                    (Number(value) < 0 ||
                                      Number(value) > field.maximum)
                                  ) {
                                    return;
                                  }

                                  updateStudentField(
                                    student.student,
                                    field.key,
                                    value,
                                  );
                                }}
                                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                              />
                            </td>
                          ))}

                          <td className="px-4 py-4">
                            <span className="font-bold text-slate-800">
                              {total}
                            </span>
                          </td>

                          <td className="px-4 py-4">
                            {student.offered === false ? (
                              <span className="text-xs font-semibold text-slate-400">
                                Excluded
                              </span>
                            ) : complete ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <FaCheckCircle />
                                Complete
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                                <FaExclamationCircle />
                                Incomplete
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 bg-slate-50 p-5">
                <p className="mb-2 text-sm font-semibold text-slate-700">
                  Teacher Comments
                </p>

                <div className="space-y-3">
                  {studentResults.map((student) => (
                    <div
                      key={student.student}
                      className="grid gap-2 sm:grid-cols-[minmax(180px,240px)_1fr] sm:items-center"
                    >
                      <label
                        htmlFor={`comment-${student.student}`}
                        className="text-sm text-slate-600"
                      >
                        {student.studentName}
                      </label>

                      <input
                        id={`comment-${student.student}`}
                        type="text"
                        value={student.teacherComment || ""}
                        disabled={!canEdit || student.offered === false}
                        onChange={(event) =>
                          updateStudentField(
                            student.student,
                            "teacherComment",
                            event.target.value,
                          )
                        }
                        placeholder="Optional comment"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {canEdit && (
              <div className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:p-6">
                <div>
                  <p className="font-semibold text-slate-800">
                    Ready to save or submit?
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Save a draft to continue later. Submission locks this
                    subject's scores.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={saving || submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-600 px-5 py-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaSave />
                    {saving ? "Saving Draft..." : "Save Draft"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmitResults}
                    disabled={saving || submitting || incompleteStudents > 0}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FaCheckCircle />
                    {submitting ? "Submitting..." : "Submit Results"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        Tenneson Teacher Portal
        <p className="mt-1">Created by PjazzDev</p>
      </footer>
    </div>
  );
}

export default TeacherSubjectResultEntry;
