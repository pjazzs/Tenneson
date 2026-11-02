import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChalkboardTeacher,
  FaEnvelope,
  FaIdBadge,
  FaBookOpen,
  FaSignOutAlt,
  FaUserCircle,
  FaCalendarAlt,
  FaClipboardCheck,
  FaCheckCircle,
  FaClock,
  FaLock,
  FaExclamationCircle,
} from "react-icons/fa";

import teacherApi from "../../api/teacherApi";
import useTeacherAuth from "../../hooks/useTeacherAuth";
import TeacherSubjectCorrectionRequests from "./TeacherSubjectCorrectionRequests";

const TERM_LABELS = {
  first: "First Term",
  second: "Second Term",
  third: "Third Term",
};

const getSubmissionStatus = (status) => {
  switch (status) {
    case "submitted":
      return {
        label: "Submitted",
        className: "bg-blue-100 text-blue-700",
        icon: <FaCheckCircle />,
      };

    case "draft":
      return {
        label: "Draft",
        className: "bg-amber-100 text-amber-700",
        icon: <FaClock />,
      };
    case "rejected":
      return {
        label: "Rejected",
        className: "bg-red-100 text-red-700",
        icon: <FaExclamationCircle />,
      };

    default:
      return {
        label: "Not Started",
        className: "bg-slate-100 text-slate-600",
        icon: <FaClipboardCheck />,
      };
  }
};

const TeacherDashboard = () => {
  console.log("UPDATED TEACHER DASHBOARD IS RUNNING");
  const navigate = useNavigate();

  const { teacher, updateTeacher, logoutTeacher } = useTeacherAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [assignments, setAssignments] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentRefresh, setAssignmentRefresh] = useState(0);

  // RESULT RESPONSIBILITY STATE
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");

  const [resultAssignments, setResultAssignments] = useState([]);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState("");
  const [resultsRefresh, setResultsRefresh] = useState(0);

  // --------------------------------------------------
  // AVAILABLE ACADEMIC SESSIONS FROM TEACHER ASSIGNMENTS
  // --------------------------------------------------

  const academicSessions = useMemo(() => {
    const sessionMap = new Map();

    assignments.forEach((assignment) => {
      const session = assignment.academicSession;

      if (session?._id) {
        sessionMap.set(session._id.toString(), session);
      }
    });

    return Array.from(sessionMap.values()).sort((a, b) =>
      (b.name || "").localeCompare(a.name || ""),
    );
  }, [assignments]);

  const selectedSession = academicSessions.find(
    (session) => session._id.toString() === selectedSessionId,
  );

  const availableTerms = selectedSession?.terms || [];

  // --------------------------------------------------
  // FETCH TEACHER PROFILE
  // --------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const fetchTeacherProfile = async () => {
      try {
        const response = await teacherApi.get("/teacher/me");

        if (isMounted && response.data.teacher) {
          updateTeacher(response.data.teacher);
        }
      } catch (err) {
        console.error(
          "Teacher profile error:",
          err.response?.data || err.message,
        );

        if (isMounted) {
          setError(
            err.response?.data?.message ||
              "Unable to load your profile. Please try again.",
          );

          if (err.response?.status === 401) {
            logoutTeacher();
            navigate("/teacher/login", { replace: true });
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchTeacherProfile();

    return () => {
      isMounted = false;
    };
  }, [updateTeacher, logoutTeacher, navigate]);

  // --------------------------------------------------
  // FETCH TEACHER'S TEACHING ASSIGNMENTS
  // --------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const fetchAssignments = async () => {
      setAssignmentsLoading(true);
      setAssignmentError("");

      try {
        const response = await teacherApi.get("/teacher/my-assignments");

        if (!isMounted) return;

        const fetchedAssignments = response.data.assignments || [];

        setAssignments(fetchedAssignments);

        // Select a default academic session only when
        // the teacher has not already selected one.
        if (fetchedAssignments.length > 0) {
          const sessions = Array.from(
            new Map(
              fetchedAssignments
                .filter((item) => item.academicSession?._id)
                .map((item) => [
                  item.academicSession._id.toString(),
                  item.academicSession,
                ]),
            ).values(),
          );

          const currentSelectionExists = sessions.some(
            (session) => session._id.toString() === selectedSessionId,
          );

          if (!currentSelectionExists) {
            const defaultSession =
              sessions.find((session) => session.isActive) || sessions[0];

            if (defaultSession) {
              setSelectedSessionId(defaultSession._id.toString());

              const defaultTerm =
                defaultSession.terms?.find((term) => term.isActive) ||
                defaultSession.terms?.[0];

              setSelectedTerm(defaultTerm?.key || "");
            }
          }
        } else {
          setSelectedSessionId("");
          setSelectedTerm("");
        }
      } catch (err) {
        console.error(
          "Teacher assignments error:",
          err.response?.data || err.message,
        );

        if (isMounted) {
          setAssignmentError(
            err.response?.data?.message ||
              "Unable to load your teaching assignments. Please try again.",
          );

          if (err.response?.status === 401) {
            logoutTeacher();
            navigate("/teacher/login", { replace: true });
          }
        }
      } finally {
        if (isMounted) {
          setAssignmentsLoading(false);
        }
      }
    };

    fetchAssignments();

    return () => {
      isMounted = false;
    };
  }, [assignmentRefresh, logoutTeacher, navigate, selectedSessionId]);

  // --------------------------------------------------
  // FETCH RESULT RESPONSIBILITIES FOR SELECTED SESSION
  // AND TERM
  // --------------------------------------------------

  useEffect(() => {
    let isMounted = true;

    const fetchResultResponsibilities = async () => {
      if (!selectedSessionId || !selectedTerm) {
        setResultAssignments([]);
        setResultsLoading(false);
        setResultsError("");
        return;
      }

      setResultsLoading(true);
      setResultsError("");

      try {
        const response = await teacherApi.get("/teacher/my-subject-results", {
          params: {
            academicSessionId: selectedSessionId,
            term: selectedTerm,
          },
        });

        if (isMounted) {
          setResultAssignments(response.data.assignments || []);
        }
      } catch (err) {
        console.error(
          "Teacher result responsibilities error:",
          err.response?.data || err.message,
        );

        if (isMounted) {
          setResultAssignments([]);

          setResultsError(
            err.response?.data?.message ||
              "Unable to load your subject result responsibilities. Please try again.",
          );

          if (err.response?.status === 401) {
            logoutTeacher();
            navigate("/teacher/login", { replace: true });
          }
        }
      } finally {
        if (isMounted) {
          setResultsLoading(false);
        }
      }
    };

    fetchResultResponsibilities();

    return () => {
      isMounted = false;
    };
  }, [
    selectedSessionId,
    selectedTerm,
    resultsRefresh,
    logoutTeacher,
    navigate,
  ]);

  // --------------------------------------------------
  // HANDLERS
  // --------------------------------------------------

  const handleLogout = () => {
    logoutTeacher();
    navigate("/teacher/login", { replace: true });
  };

  const handleRetryAssignments = () => {
    setAssignmentRefresh((previous) => previous + 1);
  };

  const handleRetryResults = () => {
    setResultsRefresh((previous) => previous + 1);
  };

  const handleSessionChange = (event) => {
    const sessionId = event.target.value;

    setSelectedSessionId(sessionId);

    const session = academicSessions.find(
      (item) => item._id.toString() === sessionId,
    );

    const defaultTerm =
      session?.terms?.find((term) => term.isActive) || session?.terms?.[0];

    setSelectedTerm(defaultTerm?.key || "");
  };

  const handleTermChange = (event) => {
    setSelectedTerm(event.target.value);
  };

  // --------------------------------------------------
  // DISPLAY VALUES
  // --------------------------------------------------

  const displayName = teacher?.fullName || "Teacher";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  const totalResultAssignments = resultAssignments.length;
  const rejectedAssignments = resultAssignments.filter(
    (item) => item.isResultOwner && item.submission?.status === "rejected",
  );

  const ownedResponsibilities = resultAssignments.filter(
    (item) => item.isResultOwner,
  ).length;

  const submittedResponsibilities = resultAssignments.filter(
    (item) => item.submission?.status === "submitted",
  ).length;

  const totalEligibleStudents = resultAssignments.reduce(
    (total, item) => total + (item.submission?.eligibleStudents || 0),
    0,
  );

  const totalCompletedScores = resultAssignments.reduce(
    (total, item) => total + (item.submission?.studentsWithScores || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-xl text-white">
              <FaChalkboardTeacher />
            </div>

            <div>
              <h1 className="text-lg font-bold text-slate-900">Tenneson</h1>

              <p className="text-xs text-slate-500">Teacher Portal</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <FaSignOutAlt />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* WELCOME */}
        <section className="mb-8 overflow-hidden rounded-3xl bg-linear-to-r from-emerald-700 to-teal-600 p-6 text-white shadow-lg shadow-emerald-100 sm:p-9">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="mb-2 text-sm font-medium text-emerald-100">
                TEACHER WORKSPACE
              </p>

              <h2 className="text-2xl font-bold sm:text-3xl">
                Welcome, {displayName}
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50 sm:text-base">
                Manage your teaching responsibilities and access your assigned
                academic resources from one place.
              </p>
            </div>

            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-2xl font-bold text-white backdrop-blur-sm">
              {initials || <FaUserCircle />}
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* PUBLISHED RESULT CORRECTION REQUESTS */}
        <TeacherSubjectCorrectionRequests />

        {/* PROFILE SUMMARY */}
        <section className="mb-8">
          <div className="mb-5">
            <h2 className="text-xl font-bold text-slate-900">Your Profile</h2>

            <p className="mt-1 text-sm text-slate-500">
              Your teacher account information.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
                <FaUserCircle />
              </div>

              <p className="text-sm text-slate-500">Full Name</p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {loading ? "Loading..." : displayName}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">
                <FaEnvelope />
              </div>

              <p className="text-sm text-slate-500">Email Address</p>

              <p className="mt-2 break-all text-lg font-bold text-slate-900">
                {loading ? "Loading..." : teacher?.email || "Not available"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-lg text-violet-700">
                <FaIdBadge />
              </div>

              <p className="text-sm text-slate-500">Employee ID</p>

              <p className="mt-2 text-lg font-bold text-slate-900">
                {loading ? "Loading..." : teacher?.employeeId || "Not assigned"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-lg text-green-700">
                <FaBookOpen />
              </div>

              <p className="text-sm text-slate-500">Account Status</p>

              <p className="mt-2">
                {loading ? (
                  <span className="font-semibold text-slate-500">
                    Checking...
                  </span>
                ) : teacher?.isActive ? (
                  <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-700">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                    Inactive
                  </span>
                )}
              </p>
            </div>
          </div>
        </section>

        {/* TEACHING WORKSPACE */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
                <FaBookOpen />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Teaching Workspace
                </h2>

                <p className="text-sm text-slate-500">
                  Your classes, subjects, and academic responsibilities.
                </p>
              </div>
            </div>

            {!assignmentsLoading && !assignmentError && (
              <span className="inline-flex w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
                {assignments.length}{" "}
                {assignments.length === 1 ? "Assignment" : "Assignments"}
              </span>
            )}
          </div>

          {/* ASSIGNMENT LOADING */}
          {assignmentsLoading && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />

              <p className="text-sm font-medium text-slate-600">
                Loading your teaching assignments...
              </p>
            </div>
          )}

          {/* ASSIGNMENT ERROR */}
          {!assignmentsLoading && assignmentError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm text-red-700">{assignmentError}</p>

              <button
                type="button"
                onClick={handleRetryAssignments}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}

          {/* NO ASSIGNMENTS */}
          {!assignmentsLoading &&
            !assignmentError &&
            assignments.length === 0 && (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <FaChalkboardTeacher className="mx-auto mb-3 text-3xl text-slate-400" />

                <h3 className="font-semibold text-slate-800">
                  No teaching assignments yet
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  Your assigned classes and subjects will appear here once an
                  administrator assigns them to your account.
                </p>
              </div>
            )}

          {/* ASSIGNMENT CARDS */}
          {!assignmentsLoading &&
            !assignmentError &&
            assignments.length > 0 && (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {assignments.map((assignment) => {
                  const allocation = assignment.allocation || {};
                  const schoolClass = allocation.schoolClass || {};
                  const department = allocation.department;
                  const subject = allocation.subject || {};
                  const academicSession = assignment.academicSession || {};

                  return (
                    <div
                      key={assignment._id}
                      className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-emerald-300 hover:shadow-md"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-lg text-emerald-700">
                          <FaBookOpen />
                        </div>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Active
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">
                        {subject.name || "Subject not available"}
                      </h3>

                      <div className="mt-4 space-y-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Class
                          </p>

                          <p className="mt-1 font-semibold text-slate-700">
                            {schoolClass.name || "Class not available"}
                          </p>
                        </div>

                        {department && (
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              Department
                            </p>

                            <p className="mt-1 font-semibold text-slate-700">
                              {department.name}
                            </p>
                          </div>
                        )}

                        <div className="border-t border-slate-100 pt-3">
                          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                            <FaCalendarAlt />
                            Academic Session
                          </p>

                          <p className="mt-1 font-semibold text-slate-700">
                            {academicSession.name || "Session not available"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </section>

        {/* SUBJECT RESULT RESPONSIBILITIES */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">
                <FaClipboardCheck />
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Subject Result Responsibilities
                </h2>

                <p className="text-sm text-slate-500">
                  View your designated result-submission responsibilities and
                  submission progress.
                </p>
              </div>
            </div>

            {selectedSession && selectedTerm && (
              <div className="flex flex-col gap-3 sm:flex-row">
                {/* ACADEMIC SESSION */}
                <div>
                  <label
                    htmlFor="result-session"
                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Academic Session
                  </label>

                  <select
                    id="result-session"
                    value={selectedSessionId}
                    onChange={handleSessionChange}
                    className="w-full min-w-44 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    {academicSessions.map((session) => (
                      <option key={session._id} value={session._id}>
                        {session.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* TERM */}
                <div>
                  <label
                    htmlFor="result-term"
                    className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Term
                  </label>

                  <select
                    id="result-term"
                    value={selectedTerm}
                    onChange={handleTermChange}
                    className="w-full min-w-36 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  >
                    {availableTerms.map((term) => (
                      <option key={term.key} value={term.key}>
                        {term.name || TERM_LABELS[term.key]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* NO SESSION OR TERM */}
          {!assignmentsLoading &&
            !assignmentError &&
            assignments.length > 0 &&
            (!selectedSession || !selectedTerm) && (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-start gap-3">
                  <FaExclamationCircle className="mt-0.5 shrink-0 text-amber-600" />

                  <div>
                    <h3 className="font-semibold text-amber-800">
                      Academic session or term unavailable
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-amber-700">
                      The academic session assigned to you does not currently
                      have a configured term. Please contact the administrator.
                    </p>
                  </div>
                </div>
              </div>
            )}

          {/* SUMMARY */}

          {/* REJECTED RESULT NOTIFICATIONS */}
          {!resultsLoading &&
            !resultsError &&
            rejectedAssignments.length > 0 && (
              <div className="mt-6 space-y-4">
                {rejectedAssignments.map((item) => {
                  const allocation = item.allocation || {};
                  const schoolClass = allocation.schoolClass || {};
                  const subject = allocation.subject || {};
                  const submission = item.submission || {};

                  return (
                    <div
                      key={`rejected-${item.assignmentId}`}
                      className="rounded-xl border border-red-200 bg-red-50 p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                            <FaExclamationCircle />
                          </div>

                          <div>
                            <h3 className="font-bold text-red-800">
                              Result Submission Rejected
                            </h3>

                            <p className="mt-1 text-sm text-red-700">
                              Your submitted result for{" "}
                              <strong>{subject.name || "Subject"}</strong> in{" "}
                              <strong>
                                {schoolClass.name || "Class not available"}
                              </strong>{" "}
                              requires correction.
                            </p>

                            <div className="mt-3 space-y-1 text-sm text-red-800">
                              <p>
                                <strong>Term:</strong>{" "}
                                {TERM_LABELS[selectedTerm] || selectedTerm}
                              </p>

                              <p>
                                <strong>Reason for rejection:</strong>{" "}
                                {submission.rejectionReason ||
                                  "No rejection reason was provided."}
                              </p>

                              {submission.rejectedAt && (
                                <p className="text-xs text-red-600">
                                  Rejected on{" "}
                                  {new Date(
                                    submission.rejectedAt,
                                  ).toLocaleDateString("en-GB", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/teacher/subject-results/${allocation._id}?academicSessionId=${selectedSessionId}&term=${selectedTerm}`,
                            )
                          }
                          className="shrink-0 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                        >
                          Correct Result
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          {!resultsLoading && !resultsError && resultAssignments.length > 0 && (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Assigned Subjects</p>

                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {totalResultAssignments}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-700">
                  Your Responsibilities
                </p>

                <p className="mt-2 text-2xl font-bold text-emerald-800">
                  {ownedResponsibilities}
                </p>
              </div>

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-sm text-blue-700">Submitted Subjects</p>

                <p className="mt-2 text-2xl font-bold text-blue-800">
                  {submittedResponsibilities}
                </p>
              </div>

              <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                <p className="text-sm text-violet-700">
                  Completed Student Scores
                </p>

                <p className="mt-2 text-2xl font-bold text-violet-800">
                  {totalCompletedScores}
                  <span className="ml-1 text-sm font-medium text-violet-600">
                    / {totalEligibleStudents}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* RESULTS LOADING */}
          {resultsLoading && (
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-10 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />

              <p className="text-sm font-medium text-slate-600">
                Loading subject result responsibilities...
              </p>
            </div>
          )}

          {/* RESULTS ERROR */}
          {!resultsLoading && resultsError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm text-red-700">{resultsError}</p>

              <button
                type="button"
                onClick={handleRetryResults}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}

          {/* NO RESPONSIBILITIES */}
          {!resultsLoading &&
            !resultsError &&
            selectedSession &&
            selectedTerm &&
            resultAssignments.length === 0 && (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                <FaClipboardCheck className="mx-auto mb-3 text-3xl text-slate-400" />

                <h3 className="font-semibold text-slate-800">
                  No subject assignments for this selection
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
                  You do not have any active teaching assignments for{" "}
                  {TERM_LABELS[selectedTerm] || selectedTerm} in{" "}
                  {selectedSession.name}.
                </p>
              </div>
            )}

          {/* RESPONSIBILITY CARDS */}
          {!resultsLoading && !resultsError && resultAssignments.length > 0 && (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {resultAssignments.map((item) => {
                const allocation = item.allocation || {};
                const schoolClass = allocation.schoolClass || {};
                const department = allocation.department;
                const subject = allocation.subject || {};
                const submission = item.submission || {};

                const status = getSubmissionStatus(submission.status);

                const eligibleStudents = submission.eligibleStudents || 0;

                const completedScores = submission.studentsWithScores || 0;

                const progress =
                  eligibleStudents > 0
                    ? Math.round((completedScores / eligibleStudents) * 100)
                    : 0;

                return (
                  <div
                    key={item.assignmentId}
                    className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-md"
                  >
                    {/* CARD HEADER */}
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700">
                        <FaBookOpen />
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900">
                      {subject.name || "Subject not available"}
                    </h3>

                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Class
                        </p>

                        <p className="mt-1 font-semibold text-slate-700">
                          {schoolClass.name || "Class not available"}
                        </p>
                      </div>

                      {department && (
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            Department
                          </p>

                          <p className="mt-1 font-semibold text-slate-700">
                            {department.name}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* RESPONSIBILITY */}
                    <div className="mt-5 border-t border-slate-100 pt-4">
                      {item.isResultOwner ? (
                        <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3">
                          <FaCheckCircle className="mt-0.5 shrink-0 text-emerald-600" />

                          <div>
                            <p className="text-sm font-semibold text-emerald-800">
                              You are responsible
                            </p>

                            <p className="mt-1 text-xs leading-5 text-emerald-700">
                              You are the designated teacher responsible for
                              submitting this subject's results.
                            </p>
                          </div>
                        </div>
                      ) : item.responsibilityId ? (
                        <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3">
                          <FaLock className="mt-0.5 shrink-0 text-amber-600" />

                          <div>
                            <p className="text-sm font-semibold text-amber-800">
                              Another teacher is responsible
                            </p>

                            <p className="mt-1 text-xs leading-5 text-amber-700">
                              You can view this subject's result status, but you
                              are not designated to submit its results.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-lg bg-slate-100 p-3">
                          <FaExclamationCircle className="mt-0.5 shrink-0 text-slate-500" />

                          <div>
                            <p className="text-sm font-semibold text-slate-700">
                              No result teacher designated
                            </p>

                            <p className="mt-1 text-xs leading-5 text-slate-600">
                              An administrator has not yet designated a teacher
                              for this subject's result submission.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* STUDENT SCORE PROGRESS */}
                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Student Score Progress
                        </p>

                        <span className="text-sm font-bold text-slate-700">
                          {completedScores}/{eligibleStudents}
                        </span>
                      </div>

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <p className="mt-2 text-xs text-slate-500">
                        {progress}% of students have complete CA1, CA2 and
                        examination scores.
                      </p>
                    </div>

                    {/* SUBMISSION INFORMATION */}
                    {submission.submittedAt && (
                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <p className="text-xs text-slate-400">Submitted on</p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {new Date(submission.submittedAt).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            },
                          )}
                        </p>
                      </div>
                    )}

                    {/* OWNERSHIP / EDITABILITY */}
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs font-medium text-slate-500">
                        {item.canEdit
                          ? "Editing permitted"
                          : item.isResultOwner
                            ? "Submission locked"
                            : "View status only"}
                      </span>

                      {item.canEdit ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                          <FaCheckCircle />
                          Can submit
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                          <FaLock />
                          Restricted
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/teacher/subject-results/${item.allocation._id}?academicSessionId=${selectedSessionId}&term=${selectedTerm}`,
                        )
                      }
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      <FaClipboardCheck />
                      Open Result Sheet
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        <p className="mt-1 text-xs text-gray-600">Tenneson Teacher Portal</p>
        Created by PjazzDev
      </footer>
    </div>
  );
};

export default TeacherDashboard;
