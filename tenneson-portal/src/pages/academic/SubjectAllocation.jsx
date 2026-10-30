import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaBook,
  FaCheckCircle,
  FaChevronLeft,
  FaChevronRight,
  FaLayerGroup,
  FaPlus,
  FaSearch,
  FaTimes,
  FaToggleOff,
  FaToggleOn,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

const emptyFilters = {
  classId: "",
  departmentId: "",
  status: "active",
};

function SubjectAllocation() {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  // Permissions
  const canView = hasPermission("class-subject-allocations.view");
  const canCreate = hasPermission("class-subject-allocations.create");
  const canUpdate = hasPermission("class-subject-allocations.update");

  // Options
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [subjects, setSubjects] = useState([]);

  // Allocation form
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState("");

  // Allocation records
  const [allocations, setAllocations] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);

  // Pagination
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalAllocations: 0,
    limit: 20,
  });

  // UI state
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingAllocations, setLoadingAllocations] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [allocationReport, setAllocationReport] = useState(null);

  const getErrorMessage = (err, fallback) =>
    err.response?.data?.message || err.message || fallback;

  const currentClass = useMemo(
    () => classes.find((item) => item._id === selectedClass),
    [classes, selectedClass],
  );

  const selectedClassHasDepartments = Boolean(currentClass?.hasDepartments);

  const filteredSubjects = useMemo(() => {
    const search = subjectSearch.trim().toLowerCase();

    if (!search) return subjects;

    return subjects.filter(
      (subject) =>
        subject.name?.toLowerCase().includes(search) ||
        subject.code?.toLowerCase().includes(search),
    );
  }, [subjects, subjectSearch]);

  // Load classes, departments and subjects

  // Load allocation records
  const fetchAllocations = useCallback(
    async (page = 1) => {
      if (!canView) {
        setAllocations([]);
        setLoadingAllocations(false);
        return;
      }

      try {
        setLoadingAllocations(true);
        setError("");

        const params = {
          page,
          limit: pagination.limit,
          status: filters.status,
        };

        if (filters.classId) {
          params.classId = filters.classId;
        }

        if (filters.departmentId) {
          params.departmentId = filters.departmentId;
        }

        const response = await api.get("/class-subject-allocations", {
          params,
        });

        setAllocations(response.data.allocations || []);

        setPagination(
          response.data.pagination || {
            currentPage: page,
            totalPages: 1,
            totalAllocations: 0,
            limit: 20,
          },
        );
      } catch (err) {
        console.error(
          "Allocation fetch error:",
          err.response?.data || err.message,
        );

        setError(getErrorMessage(err, "Failed to load subject allocations."));

        setAllocations([]);
      } finally {
        setLoadingAllocations(false);
      }
    },
    [
      canView,
      filters.classId,
      filters.departmentId,
      filters.status,
      pagination.limit,
    ],
  );

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      try {
        setLoadingOptions(true);
        setError("");

        const response = await api.get("/class-subject-allocations/options");

        if (cancelled) return;

        const options = response.data.options || {};

        setClasses(options.classes || []);
        setDepartments(options.departments || []);
        setSubjects(options.subjects || []);
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Failed to load allocation options."));
        }
      } finally {
        if (!cancelled) {
          setLoadingOptions(false);
        }
      }
    };

    queueMicrotask(loadOptions);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAllocations = async () => {
      if (!canView) {
        setAllocations([]);
        setLoadingAllocations(false);
        return;
      }

      try {
        setLoadingAllocations(true);
        setError("");

        const params = {
          page: 1,
          limit: pagination.limit,
          status: filters.status,
        };

        if (filters.classId) params.classId = filters.classId;
        if (filters.departmentId) {
          params.departmentId = filters.departmentId;
        }

        const response = await api.get("/class-subject-allocations", {
          params,
        });

        if (cancelled) return;

        setAllocations(response.data.allocations || []);
        setPagination(
          response.data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalAllocations: 0,
            limit: 20,
          },
        );
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Failed to load subject allocations."));
          setAllocations([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAllocations(false);
        }
      }
    };

    queueMicrotask(loadAllocations);

    return () => {
      cancelled = true;
    };
  }, [
    canView,
    filters.classId,
    filters.departmentId,
    filters.status,
    pagination.limit,
  ]);

  // Reset department and selected subjects when class changes
  const handleClassChange = (event) => {
    setSelectedClass(event.target.value);
    setSelectedDepartment("");
    setSelectedSubjects([]);
    setAllocationReport(null);
    setError("");
    setSuccess("");
  };

  // Reset selected subjects when department changes
  const handleDepartmentChange = (event) => {
    setSelectedDepartment(event.target.value);
    setSelectedSubjects([]);
    setAllocationReport(null);
    setError("");
    setSuccess("");
  };

  const toggleSubject = (subjectId) => {
    setSelectedSubjects((previous) =>
      previous.includes(subjectId)
        ? previous.filter((id) => id !== subjectId)
        : [...previous, subjectId],
    );
  };

  const selectAllVisibleSubjects = () => {
    const visibleIds = filteredSubjects.map((subject) => subject._id);

    setSelectedSubjects((previous) => [
      ...new Set([...previous, ...visibleIds]),
    ]);
  };

  const clearSelectedSubjects = () => {
    setSelectedSubjects([]);
  };

  // Create selected allocations
  const handleCreateAllocations = async (event) => {
    event.preventDefault();

    if (!canCreate) return;

    if (!selectedClass) {
      setError("Please select a class.");
      return;
    }

    if (selectedClassHasDepartments && !selectedDepartment) {
      setError("Please select a department for this senior class.");
      return;
    }

    if (!selectedClassHasDepartments && selectedDepartment) {
      setError("Junior classes cannot have a department.");
      return;
    }

    if (selectedSubjects.length === 0) {
      setError("Please select at least one subject.");
      return;
    }

    const confirmed = window.confirm(
      `Allocate ${selectedSubjects.length} subject(s) to ${currentClass?.name}${
        selectedClassHasDepartments
          ? ` (${departments.find((d) => d._id === selectedDepartment)?.name || ""})`
          : ""
      }?`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      setAllocationReport(null);

      const results = await Promise.allSettled(
        selectedSubjects.map((subjectId) =>
          api.post("/class-subject-allocations", {
            schoolClass: selectedClass,
            department: selectedClassHasDepartments ? selectedDepartment : null,
            subject: subjectId,
          }),
        ),
      );

      const successful = [];
      const failed = [];

      results.forEach((result, index) => {
        const subject = subjects.find(
          (item) => item._id === selectedSubjects[index],
        );

        if (result.status === "fulfilled") {
          successful.push(subject?.name || "Unknown subject");
        } else {
          failed.push({
            name: subject?.name || "Unknown subject",
            message:
              result.reason?.response?.data?.message ||
              result.reason?.message ||
              "Allocation failed.",
          });
        }
      });

      setAllocationReport({ successful, failed });

      if (successful.length > 0) {
        setSuccess(
          `${successful.length} subject allocation(s) created successfully.`,
        );
      }

      if (failed.length > 0) {
        setError(
          `${failed.length} subject allocation(s) could not be created. Check the report below.`,
        );
      }

      setSelectedSubjects([]);

      await fetchAllocations(1);
    } catch (err) {
      console.error(
        "Allocation creation error:",
        err.response?.data || err.message,
      );

      setError(getErrorMessage(err, "Failed to create subject allocations."));
    } finally {
      setSaving(false);
    }
  };

  // Activate or deactivate allocation
  const toggleAllocationStatus = async (allocation) => {
    if (!canUpdate || !allocation?._id) return;

    const nextStatus = !allocation.isActive;

    const confirmed = window.confirm(
      `Are you sure you want to ${
        nextStatus ? "activate" : "deactivate"
      } the ${allocation.subject?.name || "subject"} allocation for ${
        allocation.schoolClass?.name || "this class"
      }?`,
    );

    if (!confirmed) return;

    try {
      setActionId(allocation._id);
      setError("");
      setSuccess("");

      const response = await api.patch(
        `/class-subject-allocations/${allocation._id}/status`,
        { isActive: nextStatus },
      );

      setSuccess(
        response.data.message || "Allocation status updated successfully.",
      );

      await fetchAllocations(pagination.currentPage);
    } catch (err) {
      console.error(
        "Allocation status error:",
        err.response?.data || err.message,
      );

      setError(getErrorMessage(err, "Failed to update allocation status."));
    } finally {
      setActionId(null);
    }
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const resetFilters = () => {
    setFilters(emptyFilters);
  };

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

  if (!canView) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <FaBook className="mx-auto mb-5 text-5xl text-red-400" />

          <h1 className="mb-3 text-2xl font-bold text-white">Access Denied</h1>

          <p className="mb-6 text-gray-400">
            You do not have permission to view subject allocations.
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
            <FaLayerGroup />
            Subject Allocation
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Allocate existing subjects to school classes and departments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 rounded-xl bg-gray-600 px-4 py-3 transition hover:bg-gray-700"
        >
          <FaArrowLeft />
          Back
        </button>
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

      {/* ALLOCATION REPORT */}
      {allocationReport && (
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-lg font-semibold">Allocation Summary</h2>

          {allocationReport.successful.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-green-300">
                <FaCheckCircle />
                Successfully allocated ({allocationReport.successful.length})
              </p>

              <div className="flex flex-wrap gap-2">
                {allocationReport.successful.map((name, index) => (
                  <span
                    key={`${name}-${index}`}
                    className="rounded-full bg-green-500/10 px-3 py-1 text-xs text-green-300"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {allocationReport.failed.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-red-300">
                Failed allocations ({allocationReport.failed.length})
              </p>

              <div className="space-y-2">
                {allocationReport.failed.map((item, index) => (
                  <div
                    key={`${item.name}-${index}`}
                    className="rounded-lg bg-red-500/10 p-3 text-sm"
                  >
                    <p className="font-semibold text-red-200">{item.name}</p>
                    <p className="mt-1 text-red-300/80">{item.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setAllocationReport(null)}
            className="mt-4 text-sm text-gray-400 hover:text-white"
          >
            Dismiss report
          </button>
        </div>
      )}

      {/* CREATE ALLOCATION */}
      {canCreate && (
        <section className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <div className="mb-6">
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <FaPlus className="text-green-400" />
              Create Subject Allocation
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              Choose a class, select its department where applicable, and
              allocate the subjects it offers.
            </p>
          </div>

          {loadingOptions ? (
            <p className="py-8 text-center text-gray-400">
              Loading classes, departments and subjects...
            </p>
          ) : (
            <form onSubmit={handleCreateAllocations} className="space-y-6">
              {/* CLASS AND DEPARTMENT */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    School Class
                  </label>

                  <select
                    value={selectedClass}
                    onChange={handleClassChange}
                    required
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-green-500"
                  >
                    <option value="">Select class</option>

                    {classes.map((schoolClass) => (
                      <option key={schoolClass._id} value={schoolClass._id}>
                        {schoolClass.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Department
                  </label>

                  <select
                    value={selectedDepartment}
                    onChange={handleDepartmentChange}
                    disabled={!selectedClassHasDepartments}
                    required={selectedClassHasDepartments}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-green-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">
                      {selectedClassHasDepartments
                        ? "Select department"
                        : selectedClass
                          ? "Not required for this class"
                          : "Select a class first"}
                    </option>

                    {selectedClassHasDepartments &&
                      departments.map((department) => (
                        <option key={department._id} value={department._id}>
                          {department.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {selectedClass && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
                  {selectedClassHasDepartments
                    ? "This is a senior class. A department is required before subjects can be allocated."
                    : "This is a junior class. Subjects will be allocated directly to the class without a department."}
                </div>
              )}

              {/* SUBJECT SELECTION */}
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">
                      Select Subjects
                    </h3>

                    <p className="mt-1 text-xs text-gray-400">
                      {selectedSubjects.length} subject(s) selected
                    </p>
                  </div>

                  <div className="flex gap-3 text-sm">
                    <button
                      type="button"
                      onClick={selectAllVisibleSubjects}
                      disabled={subjects.length === 0}
                      className="text-green-400 hover:text-green-300 disabled:opacity-40"
                    >
                      Select visible
                    </button>

                    <button
                      type="button"
                      onClick={clearSelectedSubjects}
                      disabled={selectedSubjects.length === 0}
                      className="text-gray-400 hover:text-white disabled:opacity-40"
                    >
                      Clear selection
                    </button>
                  </div>
                </div>

                <div className="relative mb-4">
                  <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

                  <input
                    type="search"
                    value={subjectSearch}
                    onChange={(event) => setSubjectSearch(event.target.value)}
                    placeholder="Search subjects by name or code..."
                    className="w-full rounded-xl border border-white/10 bg-slate-950 py-3 pl-11 pr-4 text-white outline-none placeholder:text-gray-500 focus:border-green-500"
                  />
                </div>

                {subjects.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-slate-950 p-6 text-center text-gray-400">
                    No active subjects are available. Add subjects to the
                    subject catalogue first.
                  </div>
                ) : filteredSubjects.length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-slate-950 p-6 text-center text-gray-400">
                    No subjects match your search.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredSubjects.map((subject) => {
                      const checked = selectedSubjects.includes(subject._id);

                      return (
                        <label
                          key={subject._id}
                          className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                            checked
                              ? "border-green-500 bg-green-500/10"
                              : "border-white/10 bg-slate-950 hover:border-white/20"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSubject(subject._id)}
                            className="h-4 w-4 accent-green-600"
                          />

                          <span className="min-w-0 flex-1">
                            <span className="block font-medium text-white">
                              {subject.name}
                            </span>

                            {subject.code && (
                              <span className="mt-1 block text-xs text-gray-500">
                                {subject.code}
                              </span>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SUBMIT */}
              <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-gray-400">
                  Existing subject records will be reused. No duplicate subjects
                  will be created.
                </p>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    loadingOptions ||
                    !selectedClass ||
                    (selectedClassHasDepartments && !selectedDepartment) ||
                    selectedSubjects.length === 0
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaPlus />

                  {saving
                    ? "Allocating subjects..."
                    : `Allocate ${selectedSubjects.length || ""} Subject(s)`}
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {/* EXISTING ALLOCATIONS */}
      <section>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">Existing Allocations</h2>

            <p className="mt-1 text-sm text-gray-400">
              View and manage subjects allocated to each class.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2">
            <p className="text-xs text-gray-400">Total matching records</p>
            <p className="text-xl font-bold">{pagination.totalAllocations}</p>
          </div>
        </div>

        {/* FILTERS */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <select
            name="classId"
            value={filters.classId}
            onChange={handleFilterChange}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-green-500"
          >
            <option value="">All classes</option>

            {classes.map((schoolClass) => (
              <option key={schoolClass._id} value={schoolClass._id}>
                {schoolClass.name}
              </option>
            ))}
          </select>

          <select
            name="departmentId"
            value={filters.departmentId}
            onChange={handleFilterChange}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-green-500"
          >
            <option value="">All departments</option>
            <option value="none">No department (Junior)</option>

            {departments.map((department) => (
              <option key={department._id} value={department._id}>
                {department.name}
              </option>
            ))}
          </select>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-green-500"
          >
            <option value="active">Active allocations</option>
            <option value="inactive">Inactive allocations</option>
            <option value="all">All allocations</option>
          </select>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-xl border border-white/10 bg-slate-800 px-4 py-3 text-sm text-gray-300 transition hover:bg-slate-700 hover:text-white"
        >
          Reset Filters
        </button>

        {/* ALLOCATION TABLE */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full min-w-190">
              <thead>
                <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                  <th className="p-4">Subject</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Date Allocated</th>
                  <th className="p-4">Status</th>
                  {canUpdate && <th className="p-4">Actions</th>}
                </tr>
              </thead>

              <tbody>
                {loadingAllocations ? (
                  <tr>
                    <td
                      colSpan={canUpdate ? 6 : 5}
                      className="p-12 text-center text-gray-400"
                    >
                      Loading allocations...
                    </td>
                  </tr>
                ) : allocations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canUpdate ? 6 : 5}
                      className="p-12 text-center"
                    >
                      <FaBook className="mx-auto mb-3 text-3xl text-gray-600" />

                      <p className="font-medium text-gray-300">
                        No subject allocations found.
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        Try changing your filters or create a new allocation.
                      </p>
                    </td>
                  </tr>
                ) : (
                  allocations.map((allocation) => (
                    <tr
                      key={allocation._id}
                      className="border-b border-white/10 transition hover:bg-white/5"
                    >
                      <td className="p-4">
                        <p className="font-semibold">
                          {allocation.subject?.name || "Unknown subject"}
                        </p>

                        {allocation.subject?.code && (
                          <p className="mt-1 text-xs text-gray-500">
                            {allocation.subject.code}
                          </p>
                        )}
                      </td>

                      <td className="p-4 text-sm">
                        {allocation.schoolClass?.name || "-"}
                      </td>

                      <td className="p-4 text-sm">
                        {allocation.department?.name || "None"}
                      </td>

                      <td className="p-4 text-sm text-gray-400">
                        {formatDate(allocation.createdAt)}
                      </td>

                      <td className="p-4">
                        {allocation.isActive ? (
                          <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300">
                            Inactive
                          </span>
                        )}
                      </td>

                      {canUpdate && (
                        <td className="p-4">
                          <button
                            type="button"
                            title={
                              allocation.isActive
                                ? "Deactivate allocation"
                                : "Activate allocation"
                            }
                            onClick={() => toggleAllocationStatus(allocation)}
                            disabled={actionId === allocation._id}
                            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition disabled:opacity-50 ${
                              allocation.isActive
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-green-600 hover:bg-green-700"
                            }`}
                          >
                            {allocation.isActive ? (
                              <FaToggleOff />
                            ) : (
                              <FaToggleOn />
                            )}

                            {allocation.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 px-4 py-4 sm:flex-row">
            <p className="text-sm text-gray-400">
              Showing {allocations.length} of {pagination.totalAllocations}{" "}
              allocations
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={loadingAllocations || pagination.currentPage <= 1}
                onClick={() => fetchAllocations(pagination.currentPage - 1)}
                className="rounded-lg bg-slate-800 p-3 text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Previous page"
              >
                <FaChevronLeft />
              </button>

              <span className="text-sm text-gray-300">
                {pagination.currentPage} / {pagination.totalPages || 1}
              </span>

              <button
                type="button"
                disabled={
                  loadingAllocations ||
                  pagination.currentPage >= pagination.totalPages
                }
                onClick={() => fetchAllocations(pagination.currentPage + 1)}
                className="rounded-lg bg-slate-800 p-3 text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Next page"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default SubjectAllocation;
