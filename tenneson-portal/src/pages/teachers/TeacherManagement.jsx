import { useCallback, useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaChalkboardTeacher,
  FaEdit,
  FaKey,
  FaPlus,
  FaSearch,
  FaTimes,
  FaToggleOff,
  FaToggleOn,
  FaCopy,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import api from "../../api/axios";
import useAuth from "../../hooks/useAuth";

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  employeeId: "",
};

const TeacherManagement = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const canView = hasPermission("teachers.view");
  const canCreate = hasPermission("teachers.create");
  const canUpdate = hasPermission("teachers.update");
  const canResetPassword = hasPermission("teachers.password-reset");

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("active");

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalTeachers: 0,
    limit: 10,
  });

  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const [credentials, setCredentials] = useState(null);

  const [copyMessage, setCopyMessage] = useState("");

  const getErrorMessage = (err, fallback) =>
    err.response?.data?.message || err.message || fallback;

  const fetchTeachers = useCallback(
    async (page = 1) => {
      if (!canView) {
        setTeachers([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await api.get("/teachers", {
          params: {
            page,
            limit: pagination.limit,
            search: search.trim(),
            status,
          },
        });

        setTeachers(response.data.teachers || []);

        setPagination(
          response.data.pagination || {
            currentPage: page,
            totalPages: 1,
            totalTeachers: 0,
            limit: 10,
          },
        );
      } catch (err) {
        console.error(
          "Teacher fetch error:",
          err.response?.data || err.message,
        );

        setError(getErrorMessage(err, "Failed to load teachers."));
        setTeachers([]);
      } finally {
        setLoading(false);
      }
    },
    [canView, pagination.limit, search, status],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeachers(1);
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchTeachers]);

  const closeForm = () => {
    if (saving) return;

    setShowForm(false);
    setEditingTeacher(null);
    setFormData(emptyForm);
  };

  const openCreateForm = () => {
    setError("");
    setSuccess("");
    setEditingTeacher(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (teacher) => {
    if (!canUpdate) return;

    setError("");
    setSuccess("");
    setEditingTeacher(teacher);

    setFormData({
      fullName: teacher.fullName || "",
      email: teacher.email || "",
      phone: teacher.phone || "",
      employeeId: teacher.employeeId || "",
    });

    setShowForm(true);
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (editingTeacher && !canUpdate) return;
    if (!editingTeacher && !canCreate) return;

    if (!formData.fullName.trim() || !formData.email.trim()) {
      setError("Full name and email address are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        employeeId: formData.employeeId.trim(),
      };

      if (editingTeacher) {
        const response = await api.patch(
          `/teachers/${editingTeacher._id}`,
          payload,
        );

        setSuccess(
          response.data.message || "Teacher profile updated successfully.",
        );

        setShowForm(false);
        setEditingTeacher(null);
        setFormData(emptyForm);

        await fetchTeachers(pagination.currentPage);
      } else {
        const response = await api.post("/teachers", payload);

        setCredentials(response.data.credentials || null);

        setSuccess(response.data.message || "Teacher created successfully.");

        setShowForm(false);
        setFormData(emptyForm);

        await fetchTeachers(1);
      }
    } catch (err) {
      console.error("Teacher save error:", err.response?.data || err.message);

      setError(getErrorMessage(err, "Failed to save teacher."));
    } finally {
      setSaving(false);
    }
  };

  const toggleTeacherStatus = async (teacher) => {
    if (!canUpdate || !teacher?._id) return;

    const nextStatus = !teacher.isActive;

    const confirmed = window.confirm(
      `Are you sure you want to ${
        nextStatus ? "activate" : "deactivate"
      } ${teacher.fullName}?`,
    );

    if (!confirmed) return;

    try {
      setActionId(teacher._id);
      setError("");
      setSuccess("");

      const response = await api.patch(`/teachers/${teacher._id}/status`, {
        isActive: nextStatus,
      });

      setSuccess(
        response.data.message || "Teacher status updated successfully.",
      );

      await fetchTeachers(pagination.currentPage);
    } catch (err) {
      console.error(
        "Teacher status update error:",
        err.response?.data || err.message,
      );

      setError(getErrorMessage(err, "Failed to update teacher status."));
    } finally {
      setActionId(null);
    }
  };

  const resetTeacherPassword = async (teacher) => {
    if (!canResetPassword || !teacher?._id || !teacher.isActive) return;

    const confirmed = window.confirm(
      `Reset the password for ${teacher.fullName}? Their existing login sessions will be invalidated.`,
    );

    if (!confirmed) return;

    try {
      setActionId(teacher._id);
      setError("");
      setSuccess("");
      setCredentials(null);

      const response = await api.patch(
        `/teachers/${teacher._id}/reset-password`,
      );

      setCredentials(response.data.credentials || null);

      setSuccess(
        response.data.message || "Teacher password reset successfully.",
      );
    } catch (err) {
      console.error(
        "Teacher password reset error:",
        err.response?.data || err.message,
      );

      setError(getErrorMessage(err, "Failed to reset teacher password."));
    } finally {
      setActionId(null);
    }
  };

  const copyCredentials = async () => {
    if (!credentials?.temporaryPassword) return;

    try {
      await navigator.clipboard.writeText(credentials.temporaryPassword);
      setCopyMessage("Temporary password copied successfully.");
    } catch {
      setCopyMessage(
        "Unable to copy automatically. Copy the password manually.",
      );
    }
  };

  const closeCredentials = () => {
    setCredentials(null);
    setCopyMessage("");
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
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-red-500/20 bg-slate-900 p-8 text-center">
          <FaChalkboardTeacher className="mx-auto mb-5 text-5xl text-red-400" />

          <h1 className="mb-3 text-2xl font-bold text-white">Access Denied</h1>

          <p className="mb-6 text-gray-400">
            You do not have permission to view teacher records.
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
            Teacher Management
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Create and manage teacher accounts and login credentials.
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
              onClick={openCreateForm}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold transition hover:bg-green-700"
            >
              <FaPlus />
              Add Teacher
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
          <p className="text-sm text-gray-400">Teachers in current view</p>
          <p className="mt-2 text-3xl font-bold">{pagination.totalTeachers}</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-gray-400">Current page</p>
          <p className="mt-2 text-3xl font-bold">
            {pagination.currentPage} / {pagination.totalPages || 1}
          </p>
        </div>
      </div>

      {/* SEARCH AND FILTER */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, phone or employee ID..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-white outline-none placeholder:text-gray-500 focus:border-green-500"
          />
        </div>

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-green-500"
        >
          <option value="active">Active Teachers</option>
          <option value="inactive">Inactive Teachers</option>
          <option value="all">All Teachers</option>
        </select>
      </div>

      {/* TEACHER TABLE */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
        <div className="overflow-x-auto">
          <table className="w-full min-w-212.5">
            <thead>
              <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                <th className="p-4">Teacher</th>
                <th className="p-4">Employee ID</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Status</th>
                <th className="p-4">Date Created</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-gray-400">
                    Loading teachers...
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center text-gray-400">
                    No teachers found.
                  </td>
                </tr>
              ) : (
                teachers.map((teacher) => (
                  <tr
                    key={teacher._id}
                    className="border-b border-white/10 transition hover:bg-white/5"
                  >
                    <td className="p-4">
                      <p className="font-semibold">{teacher.fullName}</p>
                      <p className="mt-1 text-sm text-gray-400">
                        {teacher.email}
                      </p>
                    </td>

                    <td className="p-4 text-sm">{teacher.employeeId || "-"}</td>

                    <td className="p-4 text-sm">{teacher.phone || "-"}</td>

                    <td className="p-4">
                      {teacher.isActive ? (
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
                      {formatDate(teacher.createdAt)}
                    </td>

                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {canUpdate && (
                          <>
                            <button
                              type="button"
                              title="Edit teacher"
                              onClick={() => openEditForm(teacher)}
                              disabled={actionId === teacher._id}
                              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm transition hover:bg-indigo-700 disabled:opacity-50"
                            >
                              <FaEdit />
                              Edit
                            </button>

                            <button
                              type="button"
                              title={
                                teacher.isActive
                                  ? "Deactivate teacher"
                                  : "Activate teacher"
                              }
                              onClick={() => toggleTeacherStatus(teacher)}
                              disabled={actionId === teacher._id}
                              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition disabled:opacity-50 ${
                                teacher.isActive
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-green-600 hover:bg-green-700"
                              }`}
                            >
                              {teacher.isActive ? (
                                <FaToggleOff />
                              ) : (
                                <FaToggleOn />
                              )}
                              {teacher.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </>
                        )}

                        {canResetPassword && teacher.isActive && (
                          <button
                            type="button"
                            title="Reset teacher password"
                            onClick={() => resetTeacherPassword(teacher)}
                            disabled={actionId === teacher._id}
                            className="flex items-center gap-2 rounded-lg bg-amber-600 px-3 py-2 text-sm transition hover:bg-amber-700 disabled:opacity-50"
                          >
                            <FaKey />
                            Reset Password
                          </button>
                        )}

                        {!canUpdate &&
                          !(canResetPassword && teacher.isActive) && (
                            <span className="text-sm text-gray-500">
                              No actions
                            </span>
                          )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 px-4 py-4 sm:flex-row">
          <p className="text-sm text-gray-400">
            Showing {teachers.length} of {pagination.totalTeachers} teachers
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={
                loading ||
                pagination.currentPage <= 1 ||
                pagination.totalPages <= 1
              }
              onClick={() => fetchTeachers(pagination.currentPage - 1)}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <span className="text-sm text-gray-300">
              {pagination.currentPage} / {pagination.totalPages || 1}
            </span>

            <button
              type="button"
              disabled={
                loading || pagination.currentPage >= pagination.totalPages
              }
              onClick={() => fetchTeachers(pagination.currentPage + 1)}
              className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {editingTeacher ? "Edit Teacher" : "Create Teacher"}
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  {editingTeacher
                    ? "Update the teacher's profile information."
                    : "Create a teacher account and generate temporary login credentials."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                <FaTimes />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Full Name
                </label>
                <input
                  name="fullName"
                  type="text"
                  value={formData.fullName}
                  onChange={handleFieldChange}
                  required
                  maxLength={120}
                  placeholder="Teacher's full name"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleFieldChange}
                  required
                  maxLength={254}
                  placeholder="teacher@example.com"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Phone Number
                </label>
                <input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleFieldChange}
                  maxLength={30}
                  placeholder="Phone number"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-green-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-gray-300">
                  Employee ID
                </label>
                <input
                  name="employeeId"
                  type="text"
                  value={formData.employeeId}
                  onChange={handleFieldChange}
                  maxLength={50}
                  placeholder="e.g. TCC/STAFF/001"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white uppercase outline-none focus:border-green-500"
                />
              </div>

              {!editingTeacher && (
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-200">
                  A temporary password will be generated automatically. The
                  teacher must change it after the first login.
                </div>
              )}

              {error && (
                <p className="rounded-lg bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-xl bg-slate-700 px-5 py-3 font-semibold hover:bg-slate-600 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-green-600 px-5 py-3 font-semibold hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingTeacher
                      ? "Update Teacher"
                      : "Create Teacher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEMPORARY CREDENTIALS MODAL */}
      {credentials && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Temporary Login Credentials
                </h2>
                <p className="mt-1 text-sm text-gray-400">
                  Share these credentials securely with the teacher.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCredentials}
                className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4 rounded-xl border border-white/10 bg-slate-950 p-4">
              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                  Email
                </p>
                <p className="break-all font-medium text-white">
                  {credentials.email}
                </p>
              </div>

              <div>
                <p className="mb-1 text-xs uppercase tracking-wide text-gray-500">
                  Temporary Password
                </p>
                <p className="break-all font-mono text-lg font-bold text-green-300">
                  {credentials.temporaryPassword}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
              The teacher must change this password after logging in for the
              first time. This password will not be displayed again after this
              window is closed.
            </div>

            <button
              type="button"
              onClick={copyCredentials}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold hover:bg-indigo-700"
            >
              <FaCopy />
              Copy Password
            </button>

            {copyMessage && (
              <p className="mt-2 text-center text-sm text-gray-300">
                {copyMessage}
              </p>
            )}

            <button
              type="button"
              onClick={closeCredentials}
              className="mt-3 w-full rounded-xl bg-slate-700 px-5 py-3 font-semibold hover:bg-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;
