import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaChalkboardTeacher,
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaTimes,
  FaToggleOff,
  FaToggleOn,
  FaCheck,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

const initialForm = {
  teacher: "",
  academicSession: "",
  schoolClass: "",
  department: "",
};

const initialFilters = {
  teacherId: "",
  allocationId: "",
  academicSessionId: "",
  status: "active",
};

function TeacherAssignment() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Permissions
  const canView = hasPermission("teacher-assignments.view");
  const canCreate = hasPermission("teacher-assignments.create");
  const canUpdate = hasPermission("teacher-assignments.update");

  // Options
  const [teachers, setTeachers] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [academicSessions, setAcademicSessions] = useState([]);

  // Assignment records
  const [assignments, setAssignments] = useState([]);

  // Form
  const [formData, setFormData] = useState(initialForm);
  const [selectedAllocationIds, setSelectedAllocationIds] = useState([]);
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [filters, setFilters] = useState(initialFilters);

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalAssignments: 0,
    limit: 20,
  });

  // UI states
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const getErrorMessage = (err, fallback) =>
    err.response?.data?.message || err.message || fallback;

  // Build a readable allocation name.
  const getAllocationLabel = useCallback((allocation) => {
    const className = allocation.schoolClass?.name || "Unknown class";
    const departmentName = allocation.department?.name;
    const subjectName = allocation.subject?.name || "Unknown subject";
    const subjectCode = allocation.subject?.code;

    const department = departmentName ? ` (${departmentName})` : "";
    const code = subjectCode ? ` - ${subjectCode}` : "";

    return `${className}${department} - ${subjectName}${code}`;
  }, []);

  // Check whether an allocation and its linked records are active.
  const isAllocationUsable = useCallback((allocation) => {
    return Boolean(
      allocation?.isActive !== false &&
      allocation?.schoolClass?.isActive !== false &&
      allocation?.subject?.isActive !== false &&
      allocation?.department?.isActive !== false,
    );
  }, []);

  // Load teachers, sessions and subject allocations.
  useEffect(() => {
    if (!canView) return;

    let cancelled = false;

    const fetchOptions = async () => {
      try {
        const response = await api.get("/teacher-assignments/options");

        if (cancelled) return;

        const options = response.data.options || {};

        setTeachers(options.teachers || []);
        setAcademicSessions(options.academicSessions || []);
        setAllocations(options.allocations || []);
        setError("");
      } catch (err) {
        if (!cancelled) {
          console.error(
            "Teacher assignment options error:",
            err.response?.data || err.message,
          );

          setError(getErrorMessage(err, "Failed to load assignment options."));
        }
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
  }, [canView]);

  // Load assignment records.
  useEffect(() => {
    if (!canView) return;

    let cancelled = false;

    const loadAssignments = async () => {
      try {
        const params = {
          page: pagination.currentPage,
          limit: pagination.limit,
          status: filters.status,
          ...(filters.teacherId && { teacherId: filters.teacherId }),
          ...(filters.allocationId && {
            allocationId: filters.allocationId,
          }),
          ...(filters.academicSessionId && {
            academicSessionId: filters.academicSessionId,
          }),
        };

        const response = await api.get("/teacher-assignments", { params });

        if (cancelled) return;

        setAssignments(response.data.assignments || []);

        setPagination((previous) => ({
          ...previous,
          ...(response.data.pagination || {}),
        }));

        setError("");
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Teacher assignments fetch error:",
          err.response?.data || err.message,
        );

        setError(getErrorMessage(err, "Failed to load teacher assignments."));

        setAssignments([]);
      } finally {
        if (!cancelled) {
          setLoadingAssignments(false);
        }
      }
    };

    loadAssignments();

    return () => {
      cancelled = true;
    };
  }, [
    canView,
    filters.teacherId,
    filters.allocationId,
    filters.academicSessionId,
    filters.status,
    pagination.currentPage,
    pagination.limit,
    refreshKey,
  ]);

  // Get unique active classes from subject allocations.
  const usableAllocations = useMemo(
    () => allocations.filter(isAllocationUsable),
    [allocations, isAllocationUsable],
  );

  const classOptions = useMemo(() => {
    const classes = new Map();

    usableAllocations.forEach((allocation) => {
      const schoolClass = allocation.schoolClass;

      if (schoolClass?._id) {
        classes.set(schoolClass._id, schoolClass);
      }
    });

    return Array.from(classes.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [usableAllocations]);

  // Allocations belonging to the selected class.
  const selectedClassAllocations = useMemo(() => {
    if (!formData.schoolClass) return [];

    return usableAllocations.filter(
      (allocation) => allocation.schoolClass?._id === formData.schoolClass,
    );
  }, [formData.schoolClass, usableAllocations]);

  // Get departments available in the selected class.
  const departmentOptions = useMemo(() => {
    const departments = new Map();

    selectedClassAllocations.forEach((allocation) => {
      const department = allocation.department;

      if (department?._id) {
        departments.set(department._id, department);
      }
    });

    return Array.from(departments.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [selectedClassAllocations]);

  // Get the subjects available for the selected class and department.
  const visibleSubjectAllocations = useMemo(() => {
    if (!formData.schoolClass) return [];

    if (departmentOptions.length > 0) {
      if (!formData.department) return [];

      return selectedClassAllocations.filter(
        (allocation) => allocation.department?._id === formData.department,
      );
    }

    // Junior classes generally have no department.
    return selectedClassAllocations.filter(
      (allocation) => !allocation.department?._id,
    );
  }, [
    formData.schoolClass,
    formData.department,
    departmentOptions,
    selectedClassAllocations,
  ]);

  // Form handlers
  const openForm = () => {
    if (!canCreate) return;

    setError("");
    setSuccess("");
    setFormData(initialForm);
    setSelectedAllocationIds([]);
    setShowForm(true);
  };

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setFormData(initialForm);
    setSelectedAllocationIds([]);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "schoolClass" && { department: "" }),
    }));

    if (name === "schoolClass" || name === "department") {
      setSelectedAllocationIds([]);
    }
  };

  const handleSubjectSelection = (allocationId) => {
    setSelectedAllocationIds((previous) =>
      previous.includes(allocationId)
        ? previous.filter((id) => id !== allocationId)
        : [...previous, allocationId],
    );
  };

  const handleSelectAllSubjects = () => {
    const visibleIds = visibleSubjectAllocations.map(
      (allocation) => allocation._id,
    );

    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedAllocationIds.includes(id));

    if (allSelected) {
      setSelectedAllocationIds((previous) =>
        previous.filter((id) => !visibleIds.includes(id)),
      );
    } else {
      setSelectedAllocationIds((previous) =>
        Array.from(new Set([...previous, ...visibleIds])),
      );
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));

    setPagination((previous) => ({
      ...previous,
      currentPage: 1,
    }));
  };

  // Create multiple teacher assignments.
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canCreate || saving) return;

    if (
      !formData.teacher ||
      !formData.academicSession ||
      !formData.schoolClass
    ) {
      setError("Please select a teacher, academic session and class.");
      return;
    }

    if (departmentOptions.length > 0 && !formData.department) {
      setError("Please select a department.");
      return;
    }

    if (selectedAllocationIds.length === 0) {
      setError("Please select at least one subject.");
      return;
    }

    // Ensure every selected subject belongs to the current selection.
    const selectedAllocations = visibleSubjectAllocations.filter(
      (allocation) =>
        selectedAllocationIds.includes(allocation._id) &&
        isAllocationUsable(allocation),
    );

    if (selectedAllocations.length !== selectedAllocationIds.length) {
      setError(
        "One or more selected subjects are no longer available. Please review your selection.",
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      // Each subject allocation is saved as its own assignment record.
      // This preserves the existing backend model and unique index.
      const results = await Promise.allSettled(
        selectedAllocations.map((allocation) =>
          api.post("/teacher-assignments", {
            teacher: formData.teacher,
            allocation: allocation._id,
            academicSession: formData.academicSession,
          }),
        ),
      );

      const successfulAssignments = results.filter(
        (result) => result.status === "fulfilled",
      );

      const failedAssignments = results
        .map((result, index) => ({
          result,
          allocation: selectedAllocations[index],
        }))
        .filter(({ result }) => result.status === "rejected");

      const successCount = successfulAssignments.length;
      const failureCount = failedAssignments.length;

      if (successCount > 0) {
        setSuccess(
          `${successCount} subject ${
            successCount === 1 ? "assignment was" : "assignments were"
          } created successfully.`,
        );

        // Refresh the table and show the new records.
        setPagination((previous) => ({
          ...previous,
          currentPage: 1,
        }));

        setRefreshKey((previous) => previous + 1);

        setShowForm(false);
        setFormData(initialForm);
        setSelectedAllocationIds([]);
      }

      if (failureCount > 0) {
        const firstFailure = failedAssignments[0];
        const failedSubject = getAllocationLabel(firstFailure.allocation);

        const failureMessage = getErrorMessage(
          firstFailure.result.reason,
          "An unexpected error occurred.",
        );

        setError(
          `${failureCount} subject ${
            failureCount === 1 ? "assignment failed" : "assignments failed"
          }. First failure: ${failedSubject} - ${failureMessage}`,
        );
      }

      if (successCount === 0 && failureCount === 0) {
        setError("No assignments were created.");
      }
    } catch (err) {
      console.error(
        "Teacher assignment creation error:",
        err.response?.data || err.message,
      );

      setError(getErrorMessage(err, "Failed to create teacher assignments."));
    } finally {
      setSaving(false);
    }
  };

  // Activate or deactivate an assignment.
  const toggleAssignmentStatus = async (assignment) => {
    if (!canUpdate || !assignment?._id) return;

    const nextStatus = !assignment.isActive;

    const teacherName = assignment.teacher?.fullName || "this teacher";

    const confirmed = window.confirm(
      `Are you sure you want to ${
        nextStatus ? "activate" : "deactivate"
      } the assignment for ${teacherName}?`,
    );

    if (!confirmed) return;

    try {
      setActionId(assignment._id);
      setError("");
      setSuccess("");

      const response = await api.patch(
        `/teacher-assignments/${assignment._id}/status`,
        {
          isActive: nextStatus,
        },
      );

      setSuccess(
        response.data.message || "Assignment status updated successfully.",
      );

      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      console.error(
        "Assignment status update error:",
        err.response?.data || err.message,
      );

      setError(getErrorMessage(err, "Failed to update assignment status."));
    } finally {
      setActionId(null);
    }
  };

  // Date formatter
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

  const totalPages = Math.max(1, pagination.totalPages || 1);

  const allVisibleSubjectsSelected =
    visibleSubjectAllocations.length > 0 &&
    visibleSubjectAllocations.every((allocation) =>
      selectedAllocationIds.includes(allocation._id),
    );

  if (!canView) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <FaChalkboardTeacher className="mx-auto mb-5 text-5xl text-red-400" />

          <h1 className="mb-3 text-2xl font-bold text-white">Access Denied</h1>

          <p className="mb-6 text-gray-400">
            You do not have permission to view teacher assignments.
          </p>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-xl bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white sm:p-6">
      {/* HEADER */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold sm:text-3xl">
            <FaChalkboardTeacher />
            Teacher Assignment
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Assign teachers to multiple subjects, classes and academic sessions.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-xl bg-gray-600 px-4 py-3 transition hover:bg-gray-700"
          >
            <FaArrowLeft />
            Back
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={openForm}
              disabled={
                loadingOptions ||
                teachers.length === 0 ||
                usableAllocations.length === 0 ||
                academicSessions.length === 0
              }
              className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FaPlus />
              New Assignment
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK */}
      {error && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>{error}</span>

          <button type="button" onClick={() => setError("")}>
            <FaTimes />
          </button>
        </div>
      )}

      {success && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          <span>{success}</span>

          <button type="button" onClick={() => setSuccess("")}>
            <FaTimes />
          </button>
        </div>
      )}

      {/* SUMMARY */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-gray-400">Assignments in current view</p>

          <p className="mt-2 text-3xl font-bold">
            {pagination.totalAssignments}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-gray-400">Current page</p>

          <p className="mt-2 text-3xl font-bold">
            {pagination.currentPage} / {totalPages}
          </p>
        </div>
      </div>

      {/* FILTERS */}
      <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4">
          <h2 className="font-semibold">Filter assignments</h2>

          <p className="mt-1 text-xs text-gray-400">
            Narrow the records by teacher, subject allocation, session or
            status.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <select
            name="teacherId"
            value={filters.teacherId}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-green-500"
          >
            <option value="">All teachers</option>

            {teachers.map((teacher) => (
              <option key={teacher._id} value={teacher._id}>
                {teacher.fullName}
              </option>
            ))}
          </select>

          <select
            name="allocationId"
            value={filters.allocationId}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-green-500"
          >
            <option value="">All subject allocations</option>

            {allocations.map((allocation) => (
              <option key={allocation._id} value={allocation._id}>
                {getAllocationLabel(allocation)}
              </option>
            ))}
          </select>

          <select
            name="academicSessionId"
            value={filters.academicSessionId}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-green-500"
          >
            <option value="">All academic sessions</option>

            {academicSessions.map((session) => (
              <option key={session._id} value={session._id}>
                {session.name}
                {!session.isActive ? " (Inactive)" : ""}
              </option>
            ))}
          </select>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-green-500"
          >
            <option value="active">Active assignments</option>
            <option value="inactive">Inactive assignments</option>
            <option value="all">All assignments</option>
          </select>
        </div>
      </div>

      {/* ASSIGNMENT TABLE */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="font-semibold">Assignment records</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-225">
            <thead>
              <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                <th className="p-4">Teacher</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Class</th>
                <th className="p-4">Department</th>
                <th className="p-4">Academic Session</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date Assigned</th>
                {canUpdate && <th className="p-4">Action</th>}
              </tr>
            </thead>

            <tbody>
              {loadingAssignments ? (
                <tr>
                  <td
                    colSpan={canUpdate ? 8 : 7}
                    className="p-12 text-center text-gray-400"
                  >
                    Loading teacher assignments...
                  </td>
                </tr>
              ) : assignments.length === 0 ? (
                <tr>
                  <td
                    colSpan={canUpdate ? 8 : 7}
                    className="p-12 text-center text-gray-400"
                  >
                    No teacher assignments found.
                  </td>
                </tr>
              ) : (
                assignments.map((assignment) => {
                  const allocation = assignment.allocation;

                  return (
                    <tr
                      key={assignment._id}
                      className="border-b border-white/10 transition hover:bg-white/5"
                    >
                      <td className="p-4">
                        <p className="font-semibold">
                          {assignment.teacher?.fullName || "Unknown teacher"}
                        </p>

                        <p className="mt-1 text-xs text-gray-400">
                          {assignment.teacher?.employeeId ||
                            assignment.teacher?.email ||
                            "-"}
                        </p>
                      </td>

                      <td className="p-4">
                        <p className="font-medium">
                          {allocation?.subject?.name || "Unknown subject"}
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          {allocation?.subject?.code || "-"}
                        </p>
                      </td>

                      <td className="p-4 text-sm">
                        {allocation?.schoolClass?.name || "-"}
                      </td>

                      <td className="p-4 text-sm">
                        {allocation?.department?.name || "None"}
                      </td>

                      <td className="p-4 text-sm">
                        {assignment.academicSession?.name || "-"}
                      </td>

                      <td className="p-4">
                        {assignment.isActive ? (
                          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-sm text-gray-400">
                        {formatDate(assignment.createdAt)}
                      </td>

                      {canUpdate && (
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => toggleAssignmentStatus(assignment)}
                            disabled={actionId === assignment._id}
                            title={
                              assignment.isActive
                                ? "Deactivate assignment"
                                : "Activate assignment"
                            }
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              assignment.isActive
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {assignment.isActive ? (
                              <FaToggleOff />
                            ) : (
                              <FaToggleOn />
                            )}

                            {assignment.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 px-4 py-4 sm:flex-row">
          <p className="text-sm text-gray-400">
            Showing {assignments.length} of {pagination.totalAssignments}{" "}
            assignments
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={
                loadingAssignments ||
                pagination.currentPage <= 1 ||
                totalPages <= 1
              }
              onClick={() =>
                setPagination((previous) => ({
                  ...previous,
                  currentPage: previous.currentPage - 1,
                }))
              }
              className="rounded-lg bg-slate-800 p-3 text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <FaChevronLeft />
            </button>

            <span className="text-sm text-gray-300">
              {pagination.currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={
                loadingAssignments || pagination.currentPage >= totalPages
              }
              onClick={() =>
                setPagination((previous) => ({
                  ...previous,
                  currentPage: previous.currentPage + 1,
                }))
              }
              className="rounded-lg bg-slate-800 p-3 text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      </div>

      {/* CREATE MULTIPLE ASSIGNMENTS MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Assign Multiple Subjects</h2>

                <p className="mt-1 text-sm text-gray-400">
                  Select a teacher and choose the subjects they will teach.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                aria-label="Close form"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* TEACHER */}
              <div>
                <label
                  htmlFor="teacher"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Teacher
                </label>

                <select
                  id="teacher"
                  name="teacher"
                  value={formData.teacher}
                  onChange={handleFormChange}
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-green-500 disabled:opacity-50"
                >
                  <option value="">Select teacher</option>

                  {teachers.map((teacher) => (
                    <option key={teacher._id} value={teacher._id}>
                      {teacher.fullName}
                      {teacher.employeeId ? ` (${teacher.employeeId})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* ACADEMIC SESSION */}
              <div>
                <label
                  htmlFor="academicSession"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Academic Session
                </label>

                <select
                  id="academicSession"
                  name="academicSession"
                  value={formData.academicSession}
                  onChange={handleFormChange}
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-green-500 disabled:opacity-50"
                >
                  <option value="">Select academic session</option>

                  {academicSessions.map((session) => (
                    <option key={session._id} value={session._id}>
                      {session.name}
                      {!session.isActive ? " (Inactive / Historical)" : ""}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-gray-500">
                  Historical sessions are available for record keeping.
                </p>
              </div>

              {/* CLASS */}
              <div>
                <label
                  htmlFor="schoolClass"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Class
                </label>

                <select
                  id="schoolClass"
                  name="schoolClass"
                  value={formData.schoolClass}
                  onChange={handleFormChange}
                  required
                  disabled={saving}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-green-500 disabled:opacity-50"
                >
                  <option value="">Select class</option>

                  {classOptions.map((schoolClass) => (
                    <option key={schoolClass._id} value={schoolClass._id}>
                      {schoolClass.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* DEPARTMENT */}
              {formData.schoolClass && departmentOptions.length > 0 && (
                <div>
                  <label
                    htmlFor="department"
                    className="mb-2 block text-sm font-medium text-gray-300"
                  >
                    Department
                  </label>

                  <select
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleFormChange}
                    required
                    disabled={saving}
                    className="w-full rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-white outline-none focus:border-green-500 disabled:opacity-50"
                  >
                    <option value="">Select department</option>

                    {departmentOptions.map((department) => (
                      <option key={department._id} value={department._id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* SUBJECT SELECTION */}
              {formData.schoolClass && (
                <div className="rounded-xl border border-white/10 bg-slate-800/60 p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Select Subjects</h3>

                      <p className="mt-1 text-xs text-gray-400">
                        Choose all the subjects this teacher will handle.
                      </p>
                    </div>

                    {visibleSubjectAllocations.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSelectAllSubjects}
                        disabled={saving}
                        className="text-sm font-semibold text-green-400 transition hover:text-green-300 disabled:opacity-50"
                      >
                        {allVisibleSubjectsSelected
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    )}
                  </div>

                  {departmentOptions.length > 0 && !formData.department ? (
                    <p className="rounded-lg bg-slate-900 p-4 text-sm text-gray-400">
                      Select a department to view its subjects.
                    </p>
                  ) : visibleSubjectAllocations.length === 0 ? (
                    <p className="rounded-lg bg-slate-900 p-4 text-sm text-gray-400">
                      No active subject allocations are available for this
                      selection.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {visibleSubjectAllocations.map((allocation) => {
                        const checked = selectedAllocationIds.includes(
                          allocation._id,
                        );

                        return (
                          <label
                            key={allocation._id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                              checked
                                ? "border-green-500 bg-green-500/10"
                                : "border-white/10 bg-slate-900 hover:border-white/20"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                handleSubjectSelection(allocation._id)
                              }
                              disabled={saving}
                              className="h-4 w-4 accent-green-500"
                            />

                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-medium text-white">
                                {allocation.subject?.name || "Unknown subject"}
                              </span>

                              <span className="mt-1 block text-xs text-gray-400">
                                {allocation.subject?.code || "No subject code"}
                              </span>
                            </span>

                            {checked && (
                              <FaCheck className="shrink-0 text-green-400" />
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                    <span className="text-sm text-gray-400">
                      Selected subjects
                    </span>

                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-300">
                      {selectedAllocationIds.length} selected
                    </span>
                  </div>
                </div>
              )}

              {/* FORM ACTIONS */}
              <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl bg-gray-700 px-5 py-3 font-semibold transition hover:bg-gray-600 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    loadingOptions ||
                    !formData.teacher ||
                    !formData.academicSession ||
                    !formData.schoolClass ||
                    (departmentOptions.length > 0 && !formData.department) ||
                    selectedAllocationIds.length === 0
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Assigning Subjects..."
                    : `Assign ${selectedAllocationIds.length || ""} Subject${
                        selectedAllocationIds.length === 1 ? "" : "s"
                      }`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TeacherAssignment;
