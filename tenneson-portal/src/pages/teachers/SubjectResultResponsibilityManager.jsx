import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaHistory,
  FaSyncAlt,
  FaUserTie,
} from "react-icons/fa";

import api from "../../api/axios";

const TERMS = [
  { value: "first", label: "First Term" },
  { value: "second", label: "Second Term" },
  { value: "third", label: "Third Term" },
];

const initialOptions = {
  teachers: [],
  academicSessions: [],
  allocations: [],
};

const getErrorMessage = (err, fallback) =>
  err.response?.data?.message || err.message || fallback;

function SubjectResultResponsibilityManager() {
  const [options, setOptions] = useState(initialOptions);

  const [academicSessionId, setAcademicSessionId] = useState("");
  const [term, setTerm] = useState("first");
  const [allocationId, setAllocationId] = useState("");
  const [teacherAssignmentId, setTeacherAssignmentId] = useState("");
  const [reason, setReason] = useState("");

  const [responsibilities, setResponsibilities] = useState([]);
  const [currentResponsibility, setCurrentResponsibility] = useState(null);
  const [teacherAssignments, setTeacherAssignments] = useState([]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalResponsibilities, setTotalResponsibilities] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingResponsibilities, setLoadingResponsibilities] = useState(false);
  const [loadingCurrentResponsibility, setLoadingCurrentResponsibility] =
    useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Selected academic session
  const selectedSession = useMemo(
    () =>
      options.academicSessions.find(
        (session) => session._id === academicSessionId,
      ),
    [options.academicSessions, academicSessionId],
  );

  // Terms available in the selected academic session
  const availableTerms = useMemo(() => {
    if (!selectedSession?.terms?.length) {
      return TERMS;
    }

    const sessionTerms = TERMS.filter((item) =>
      selectedSession.terms.some(
        (sessionTerm) => sessionTerm.key === item.value,
      ),
    );

    return sessionTerms.length ? sessionTerms : TERMS;
  }, [selectedSession]);

  // Always use a term supported by the selected session
  const effectiveTerm = availableTerms.some((item) => item.value === term)
    ? term
    : availableTerms[0]?.value || "first";

  // Only show active allocations with active related records
  const activeAllocations = useMemo(() => {
    return options.allocations
      .filter(
        (allocation) =>
          allocation.isActive !== false &&
          allocation.schoolClass?.isActive !== false &&
          allocation.subject?.isActive !== false &&
          (!allocation.department || allocation.department.isActive !== false),
      )
      .sort((a, b) => {
        const classCompare = (a.schoolClass?.name || "").localeCompare(
          b.schoolClass?.name || "",
          undefined,
          { numeric: true, sensitivity: "base" },
        );

        if (classCompare !== 0) return classCompare;

        const departmentCompare = (a.department?.name || "").localeCompare(
          b.department?.name || "",
          undefined,
          { sensitivity: "base" },
        );

        if (departmentCompare !== 0) return departmentCompare;

        return (a.subject?.name || "").localeCompare(
          b.subject?.name || "",
          undefined,
          { sensitivity: "base" },
        );
      });
  }, [options.allocations]);

  // Current assignment ID comes from the independently fetched responsibility
  const currentAssignmentId =
    currentResponsibility?.teacherAssignment?._id || "";

  const getAllocationLabel = useCallback((allocation) => {
    if (!allocation) return "Unknown subject allocation";

    const className = allocation.schoolClass?.name || "Unknown class";
    const departmentName = allocation.department?.name;
    const subjectName = allocation.subject?.name || "Unknown subject";
    const subjectCode = allocation.subject?.code;

    return [
      className,
      departmentName ? `(${departmentName})` : "",
      "-",
      subjectName,
      subjectCode ? `(${subjectCode})` : "",
    ]
      .filter(Boolean)
      .join(" ");
  }, []);

  // Load academic sessions, teachers and subject allocations
  useEffect(() => {
    let cancelled = false;

    const fetchOptions = async () => {
      try {
        const response = await api.get("/teacher-assignments/options");

        if (cancelled) return;

        const loadedOptions = response.data.options || initialOptions;
        const sessions = loadedOptions.academicSessions || [];

        setOptions({
          teachers: loadedOptions.teachers || [],
          academicSessions: sessions,
          allocations: loadedOptions.allocations || [],
        });

        const activeSession = sessions.find((session) => session.isActive);
        const nextSessionId = activeSession?._id || sessions[0]?._id || "";

        setAcademicSessionId(nextSessionId);
        setLoadingResponsibilities(Boolean(nextSessionId));
        setError("");
      } catch (err) {
        if (cancelled) return;

        setError(
          getErrorMessage(err, "Failed to load responsibility options."),
        );
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    };

    fetchOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load paginated subject result responsibilities
  useEffect(() => {
    if (!academicSessionId || !effectiveTerm) return;

    let cancelled = false;

    const fetchResponsibilities = async () => {
      try {
        const response = await api.get(
          "/teacher-assignments/result-responsibilities",
          {
            params: {
              academicSessionId,
              term: effectiveTerm,
              page: currentPage,
              limit: pageSize,
            },
          },
        );

        if (cancelled) return;

        setResponsibilities(response.data.responsibilities || []);

        setTotalResponsibilities(response.data.totalResponsibilities || 0);

        setTotalPages(response.data.pagination?.totalPages || 0);

        setError("");
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Result responsibilities fetch error:",
          err.response?.data || err.message,
        );

        setResponsibilities([]);
        setTotalResponsibilities(0);
        setTotalPages(0);

        setError(
          getErrorMessage(
            err,
            "Failed to load subject result responsibilities.",
          ),
        );
      } finally {
        if (!cancelled) {
          setLoadingResponsibilities(false);
        }
      }
    };

    fetchResponsibilities();

    return () => {
      cancelled = true;
    };
  }, [academicSessionId, effectiveTerm, currentPage, pageSize, refreshKey]);

  // Fetch the selected allocation's responsibility independently.
  // This does not depend on the current pagination page.
  useEffect(() => {
    if (!allocationId || !academicSessionId || !effectiveTerm) return;

    let cancelled = false;

    const fetchCurrentResponsibility = async () => {
      try {
        const response = await api.get(
          "/teacher-assignments/result-responsibilities",
          {
            params: {
              academicSessionId,
              term: effectiveTerm,
              allocationId,
              page: 1,
              limit: 1,
            },
          },
        );

        if (cancelled) return;

        const selectedResponsibility =
          response.data.responsibilities?.find(
            (item) => item.allocation?._id === allocationId,
          ) || null;

        setCurrentResponsibility(selectedResponsibility);
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Selected allocation responsibility error:",
          err.response?.data || err.message,
        );

        setCurrentResponsibility(null);

        setError(
          getErrorMessage(
            err,
            "Failed to check the current responsible teacher.",
          ),
        );
      } finally {
        if (!cancelled) {
          setLoadingCurrentResponsibility(false);
        }
      }
    };

    fetchCurrentResponsibility();

    return () => {
      cancelled = true;
    };
  }, [allocationId, academicSessionId, effectiveTerm, refreshKey]);

  // Load eligible teacher assignments for the selected allocation
  useEffect(() => {
    if (!allocationId || !academicSessionId) return;

    let cancelled = false;

    const fetchTeacherAssignments = async () => {
      try {
        const response = await api.get("/teacher-assignments", {
          params: {
            allocationId,
            academicSessionId,
            status: "active",
            page: 1,
            limit: 100,
          },
        });

        if (cancelled) return;

        const assignments = response.data.assignments || [];

        setTeacherAssignments(assignments);

        // Select the current responsible teacher when available
        const existingOwner = assignments.find(
          (assignment) => assignment._id === currentAssignmentId,
        );

        setTeacherAssignmentId(existingOwner?._id || "");
        setError("");
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Eligible teacher assignments error:",
          err.response?.data || err.message,
        );

        setTeacherAssignments([]);

        setError(
          getErrorMessage(
            err,
            "Failed to load teacher assignments for this subject.",
          ),
        );
      } finally {
        if (!cancelled) {
          setLoadingAssignments(false);
        }
      }
    };

    fetchTeacherAssignments();

    return () => {
      cancelled = true;
    };
  }, [allocationId, academicSessionId, currentAssignmentId]);

  // Academic session selection
  const handleSessionChange = (event) => {
    const nextSessionId = event.target.value;

    setAcademicSessionId(nextSessionId);
    setAllocationId("");
    setTeacherAssignmentId("");
    setTeacherAssignments([]);
    setCurrentResponsibility(null);
    setResponsibilities([]);

    setCurrentPage(1);
    setTotalResponsibilities(0);
    setTotalPages(0);

    setReason("");

    setLoadingAssignments(false);
    setLoadingCurrentResponsibility(false);
    setLoadingResponsibilities(Boolean(nextSessionId));

    setSuccess("");
    setError("");
  };

  // Academic term selection
  const handleTermChange = (event) => {
    const nextTerm = event.target.value;

    setTerm(nextTerm);
    setAllocationId("");
    setTeacherAssignmentId("");
    setTeacherAssignments([]);
    setCurrentResponsibility(null);
    setResponsibilities([]);

    setCurrentPage(1);
    setTotalResponsibilities(0);
    setTotalPages(0);

    setReason("");

    setLoadingAssignments(false);
    setLoadingCurrentResponsibility(false);
    setLoadingResponsibilities(Boolean(academicSessionId));

    setSuccess("");
    setError("");
  };

  // Subject allocation selection
  const handleAllocationChange = (event) => {
    const nextAllocationId = event.target.value;

    setAllocationId(nextAllocationId);
    setTeacherAssignmentId("");
    setTeacherAssignments([]);
    setCurrentResponsibility(null);
    setReason("");

    setLoadingAssignments(Boolean(nextAllocationId));
    setLoadingCurrentResponsibility(Boolean(nextAllocationId));

    setSuccess("");
    setError("");
  };

  // Designate or reassign the responsible teacher
  const handleDesignation = async (event) => {
    event.preventDefault();

    if (saving) return;

    if (!academicSessionId || !effectiveTerm || !allocationId) {
      setError("Select an academic session, term and subject allocation.");
      return;
    }

    if (loadingCurrentResponsibility) {
      setError("Please wait while the current designation is being checked.");
      return;
    }

    if (!teacherAssignmentId) {
      setError("Select a teacher assignment.");
      return;
    }

    if (
      currentAssignmentId &&
      currentAssignmentId !== teacherAssignmentId &&
      !reason.trim()
    ) {
      setError("Please provide a reason for changing the designated teacher.");
      return;
    }

    const isReassignment =
      Boolean(currentAssignmentId) &&
      currentAssignmentId !== teacherAssignmentId;

    const confirmed = window.confirm(
      isReassignment
        ? "Are you sure you want to change the teacher responsible for submitting this subject's results?"
        : "Are you sure you want to designate this teacher for subject result submission?",
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api.put(
        `/teacher-assignments/result-responsibilities/${allocationId}`,
        {
          academicSession: academicSessionId,
          term: effectiveTerm,
          teacherAssignment: teacherAssignmentId,
          reason: reason.trim(),
        },
      );

      setSuccess(
        response.data.message ||
          "Subject result responsibility updated successfully.",
      );

      setReason("");
      setLoadingResponsibilities(true);
      setLoadingCurrentResponsibility(true);
      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      console.error(
        "Subject result responsibility update error:",
        err.response?.data || err.message,
      );

      setError(
        getErrorMessage(err, "Failed to update subject result responsibility."),
      );
    } finally {
      setSaving(false);
    }
  };

  // Date formatting
  const formatDate = (date) => {
    if (!date) return "-";

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) return "-";

    return value.toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getTeacherName = (responsibility) =>
    responsibility?.teacherAssignment?.teacher?.fullName || "Unknown teacher";

  const getAssignmentLabel = (assignment) => {
    const teacherName = assignment.teacher?.fullName || "Unknown teacher";
    const employeeId = assignment.teacher?.employeeId;

    return employeeId ? `${teacherName} (${employeeId})` : teacherName;
  };

  const isReassignment =
    Boolean(currentAssignmentId) && currentAssignmentId !== teacherAssignmentId;

  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-3 text-xl font-bold">
            <FaUserTie className="text-green-400" />
            Subject Result Responsibility
          </h2>

          <p className="mt-2 max-w-3xl text-sm text-gray-400">
            Designate one teacher to prepare and submit results for each subject
            allocation, academic session and term.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoadingResponsibilities(true);

            if (allocationId) {
              setLoadingCurrentResponsibility(true);
            }

            setRefreshKey((previous) => previous + 1);
          }}
          disabled={loadingResponsibilities || loadingOptions}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FaSyncAlt
            className={loadingResponsibilities ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {(error || success) && (
        <div
          className={`mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${
            error
              ? "border-red-500/20 bg-red-500/10 text-red-300"
              : "border-green-500/20 bg-green-500/10 text-green-300"
          }`}
        >
          {error ? (
            <FaExclamationTriangle className="mt-0.5 shrink-0" />
          ) : (
            <FaCheckCircle className="mt-0.5 shrink-0" />
          )}

          <span>{error || success}</span>
        </div>
      )}

      {loadingOptions ? (
        <div className="rounded-xl bg-slate-900 p-8 text-center text-sm text-gray-400">
          Loading sessions, teachers and subject allocations...
        </div>
      ) : (
        <>
          {/* SESSION AND TERM FILTERS */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="responsibilitySession"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Academic Session
              </label>

              <select
                id="responsibilitySession"
                value={academicSessionId}
                onChange={handleSessionChange}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-green-500"
              >
                <option value="">Select academic session</option>

                {options.academicSessions.map((session) => (
                  <option key={session._id} value={session._id}>
                    {session.name}
                    {!session.isActive ? " (Inactive)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="responsibilityTerm"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Academic Term
              </label>

              <select
                id="responsibilityTerm"
                value={effectiveTerm}
                onChange={handleTermChange}
                disabled={!academicSessionId}
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-green-500 disabled:opacity-50"
              >
                {availableTerms.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DESIGNATION FORM */}
          <form
            onSubmit={handleDesignation}
            className="mb-8 rounded-xl border border-white/10 bg-slate-900/70 p-4 sm:p-5"
          >
            <div className="mb-5">
              <h3 className="font-semibold">
                Designate a Result Submission Teacher
              </h3>

              <p className="mt-1 text-xs text-gray-400">
                Only teachers with an active assignment for the selected subject
                and session can be designated.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div>
                <label
                  htmlFor="responsibilityAllocation"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Subject Allocation
                </label>

                <select
                  id="responsibilityAllocation"
                  value={allocationId}
                  onChange={handleAllocationChange}
                  disabled={!academicSessionId || !effectiveTerm}
                  required
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-green-500 disabled:opacity-50"
                >
                  <option value="">Select class and subject</option>

                  {activeAllocations.map((allocation) => (
                    <option key={allocation._id} value={allocation._id}>
                      {getAllocationLabel(allocation)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="responsibilityTeacher"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Responsible Teacher
                </label>

                <select
                  id="responsibilityTeacher"
                  value={teacherAssignmentId}
                  onChange={(event) =>
                    setTeacherAssignmentId(event.target.value)
                  }
                  disabled={
                    !allocationId ||
                    loadingAssignments ||
                    loadingCurrentResponsibility ||
                    teacherAssignments.length === 0
                  }
                  required
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-green-500 disabled:opacity-50"
                >
                  <option value="">
                    {loadingCurrentResponsibility
                      ? "Checking current designation..."
                      : loadingAssignments
                        ? "Loading assigned teachers..."
                        : teacherAssignments.length === 0
                          ? "No active teacher assignments"
                          : "Select responsible teacher"}
                  </option>

                  {teacherAssignments.map((assignment) => (
                    <option key={assignment._id} value={assignment._id}>
                      {getAssignmentLabel(assignment)}
                      {assignment._id === currentAssignmentId
                        ? " (Current)"
                        : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loadingCurrentResponsibility && allocationId && (
              <p className="mt-3 text-xs text-gray-400">
                Checking the existing responsibility for this allocation...
              </p>
            )}

            {currentResponsibility && (
              <div className="mt-4 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-200">
                <p className="font-semibold">Current responsible teacher</p>

                <p className="mt-1">{getTeacherName(currentResponsibility)}</p>

                <p className="mt-1 text-xs text-blue-200/70">
                  Designated {formatDate(currentResponsibility.createdAt)}
                </p>
              </div>
            )}

            {isReassignment && (
              <div className="mt-4">
                <label
                  htmlFor="reassignmentReason"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Reason for reassignment
                </label>

                <textarea
                  id="reassignmentReason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={3}
                  maxLength={500}
                  required
                  placeholder="Explain why responsibility is being transferred to another teacher..."
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-green-500"
                />

                <p className="mt-1 text-right text-xs text-gray-500">
                  {reason.length}/500 characters
                </p>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-xl text-xs text-gray-500">
                Once a subject result has been submitted, the system prevents
                responsibility from being transferred to another teacher.
              </p>

              <button
                type="submit"
                disabled={
                  saving ||
                  loadingAssignments ||
                  loadingCurrentResponsibility ||
                  !academicSessionId ||
                  !allocationId ||
                  !teacherAssignmentId ||
                  (isReassignment && !reason.trim()) ||
                  (currentAssignmentId === teacherAssignmentId &&
                    Boolean(currentAssignmentId))
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : loadingCurrentResponsibility
                    ? "Checking designation..."
                    : isReassignment
                      ? "Change Responsible Teacher"
                      : currentResponsibility
                        ? "Teacher Already Designated"
                        : "Designate Teacher"}
              </button>
            </div>
          </form>

          {/* EXISTING RESPONSIBILITIES */}
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Designated Result Teachers</h3>

                <p className="mt-1 text-xs text-gray-400">
                  {selectedSession?.name || "Selected session"} ·{" "}
                  {TERMS.find((item) => item.value === effectiveTerm)?.label ||
                    effectiveTerm}
                </p>
              </div>

              <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-300">
                {totalResponsibilities} designated
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-190">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-900 text-left text-xs uppercase tracking-wide text-gray-400">
                    <th className="p-4">Subject / Class</th>
                    <th className="p-4">Responsible Teacher</th>
                    <th className="p-4">Designated By</th>
                    <th className="p-4">Date Designated</th>
                    <th className="p-4">History</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingResponsibilities ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-10 text-center text-sm text-gray-400"
                      >
                        Loading designated result teachers...
                      </td>
                    </tr>
                  ) : responsibilities.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-10 text-center text-sm text-gray-400"
                      >
                        No result teachers have been designated for this session
                        and term.
                      </td>
                    </tr>
                  ) : (
                    responsibilities.map((item) => (
                      <tr
                        key={item._id}
                        className="border-b border-white/10 last:border-0 hover:bg-white/3"
                      >
                        <td className="p-4">
                          <p className="font-medium">
                            {item.allocation?.subject?.name ||
                              "Unknown subject"}
                          </p>

                          <p className="mt-1 text-xs text-gray-400">
                            {item.allocation?.schoolClass?.name ||
                              "Unknown class"}
                            {item.allocation?.department?.name
                              ? ` · ${item.allocation.department.name}`
                              : ""}
                          </p>
                        </td>

                        <td className="p-4">
                          <p className="font-medium">{getTeacherName(item)}</p>

                          <p className="mt-1 text-xs text-gray-400">
                            {item.teacherAssignment?.teacher?.employeeId ||
                              item.teacherAssignment?.teacher?.email ||
                              "-"}
                          </p>
                        </td>

                        <td className="p-4 text-sm text-gray-300">
                          {item.assignedBy?.fullName ||
                            item.updatedBy?.fullName ||
                            "-"}
                        </td>

                        <td className="p-4 text-sm text-gray-400">
                          {formatDate(item.createdAt)}
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center gap-2 text-sm text-gray-300">
                            <FaHistory className="text-gray-500" />
                            {item.assignmentHistory?.length || 0} changes
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION CONTROLS */}
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                <span>
                  {totalResponsibilities === 0
                    ? "Showing 0 results"
                    : `Showing ${(currentPage - 1) * pageSize + 1}-${Math.min(
                        currentPage * pageSize,
                        totalResponsibilities,
                      )} of ${totalResponsibilities}`}
                </span>

                <div className="flex items-center gap-2">
                  <label htmlFor="responsibilityPageSize">Rows per page</label>

                  <select
                    id="responsibilityPageSize"
                    value={pageSize}
                    onChange={(event) => {
                      setLoadingResponsibilities(true);
                      setPageSize(Number(event.target.value));
                      setCurrentPage(1);
                    }}
                    disabled={loadingResponsibilities}
                    className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1.5 text-white outline-none focus:border-green-500 disabled:opacity-50"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoadingResponsibilities(true);
                    setCurrentPage((previous) => Math.max(1, previous - 1));
                  }}
                  disabled={loadingResponsibilities || currentPage <= 1}
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-gray-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="min-w-24 text-center text-sm text-gray-400">
                  Page {totalPages === 0 ? 0 : currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => {
                    setLoadingResponsibilities(true);
                    setCurrentPage((previous) =>
                      Math.min(totalPages, previous + 1),
                    );
                  }}
                  disabled={
                    loadingResponsibilities ||
                    totalPages === 0 ||
                    currentPage >= totalPages
                  }
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-gray-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default SubjectResultResponsibilityManager;
