import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaEdit,
  FaPlus,
  FaTimes,
  FaSave,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import useAuth from "../../hooks/useAuth";

import {
  getAcademicSessions,
  getAcademicSession,
  createAcademicSession,
  updateAcademicSession,
} from "../../api/academicSessionApi";

const createEmptyTerm = (key, name) => ({
  key,
  name,
  startDate: "",
  endDate: "",
  closingDate: "",
  resumptionDate: "",
  isActive: key === "first",
});

const createEmptyForm = () => ({
  name: "",
  isActive: true,

  terms: [
    createEmptyTerm("first", "First Term"),
    createEmptyTerm("second", "Second Term"),
    createEmptyTerm("third", "Third Term"),
  ],
});

const AcademicSessions = () => {
  const navigate = useNavigate();
  const { admin } = useAuth();

  /*
  |--------------------------------------------------------------------------
  | PERMISSIONS
  |--------------------------------------------------------------------------
  */

  const isSuperAdmin = admin?.role === "super_admin";

  const hasPermission = (permission) => {
    if (isSuperAdmin) {
      return true;
    }

    return (
      Array.isArray(admin?.permissions) &&
      admin.permissions.includes(permission)
    );
  };

  const canView = hasPermission("academic-sessions.view");
  const canCreate = hasPermission("academic-sessions.create");
  const canUpdate = hasPermission("academic-sessions.update");

  /*
  |--------------------------------------------------------------------------
  | STATE
  |--------------------------------------------------------------------------
  */

  const [sessions, setSessions] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const [selectedSession, setSelectedSession] = useState(null);

  const [loadingSession, setLoadingSession] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | CREATE / EDIT FORM STATE
  |--------------------------------------------------------------------------
  */

  const [showForm, setShowForm] = useState(false);

  const [editingSessionId, setEditingSessionId] = useState(null);

  const [formData, setFormData] = useState(createEmptyForm());

  const [saving, setSaving] = useState(false);

  /*
  |--------------------------------------------------------------------------
  | FETCH SESSIONS
  |--------------------------------------------------------------------------
  */

  const fetchSessions = async () => {
    if (!canView) {
      setSessions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await getAcademicSessions();

      setSessions(response?.academicSessions || []);
    } catch (err) {
      console.error(
        "Academic sessions fetch error:",
        err.response?.data || err.message,
      );

      setError(
        err.response?.data?.message || "Failed to load academic sessions.",
      );

      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadSessions = async () => {
      if (!canView) {
        if (!cancelled) {
          setSessions([]);
          setLoading(false);
        }

        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getAcademicSessions();

        if (!cancelled) {
          setSessions(response?.academicSessions || []);
        }
      } catch (err) {
        console.error(
          "Academic sessions fetch error:",
          err.response?.data || err.message,
        );

        if (!cancelled) {
          setError(
            err.response?.data?.message || "Failed to load academic sessions.",
          );

          setSessions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSessions();

    return () => {
      cancelled = true;
    };
  }, [canView]);

  /*
  |--------------------------------------------------------------------------
  | VIEW SESSION
  |--------------------------------------------------------------------------
  */

  const handleViewSession = async (sessionId) => {
    if (!sessionId) {
      return;
    }

    try {
      setLoadingSession(true);
      setError("");

      const response = await getAcademicSession(sessionId);

      setSelectedSession(
        response?.academicSession || response?.session || null,
      );
    } catch (err) {
      console.error(
        "Academic session fetch error:",
        err.response?.data || err.message,
      );

      setError(
        err.response?.data?.message || "Failed to load academic session.",
      );
    } finally {
      setLoadingSession(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | FORM HELPERS
  |--------------------------------------------------------------------------
  */

  const formatInputDate = (date) => {
    if (!date) {
      return "";
    }

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return "";
    }

    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return "-";
    }

    return value.toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTerm = (session, key) => {
    return (
      session?.terms?.find((term) => term.key === key) || {
        key,
        name:
          key === "first"
            ? "First Term"
            : key === "second"
              ? "Second Term"
              : "Third Term",
      }
    );
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN CREATE FORM
  |--------------------------------------------------------------------------
  */

  const handleCreate = () => {
    setError("");
    setSuccessMessage("");

    setEditingSessionId(null);

    setFormData(createEmptyForm());

    setShowForm(true);
  };

  /*
  |--------------------------------------------------------------------------
  | OPEN EDIT FORM
  |--------------------------------------------------------------------------
  */

  const handleEdit = async (sessionId) => {
    if (!sessionId || !canUpdate) {
      return;
    }

    try {
      setError("");
      setSuccessMessage("");
      setLoadingSession(true);

      const response = await getAcademicSession(sessionId);

      const session = response?.academicSession || response?.session || null;

      if (!session) {
        throw new Error("Academic session not found.");
      }

      const terms = ["first", "second", "third"].map((key) => {
        const existingTerm = session.terms?.find((term) => term.key === key);

        const defaultName =
          key === "first"
            ? "First Term"
            : key === "second"
              ? "Second Term"
              : "Third Term";

        return {
          key,
          name: existingTerm?.name || defaultName,
          startDate: formatInputDate(existingTerm?.startDate),
          endDate: formatInputDate(existingTerm?.endDate),
          closingDate: formatInputDate(existingTerm?.closingDate),
          resumptionDate: formatInputDate(existingTerm?.resumptionDate),
          isActive: Boolean(existingTerm?.isActive),
        };
      });

      setEditingSessionId(session._id);

      setFormData({
        name: session.name || "",
        isActive: Boolean(session.isActive),
        terms,
      });

      setShowForm(true);
    } catch (err) {
      console.error(
        "Academic session edit fetch error:",
        err.response?.data || err.message,
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load academic session.",
      );
    } finally {
      setLoadingSession(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CLOSE FORM
  |--------------------------------------------------------------------------
  */

  const handleCloseForm = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingSessionId(null);
    setFormData(createEmptyForm());
  };

  /*
  |--------------------------------------------------------------------------
  | FORM FIELD CHANGE
  |--------------------------------------------------------------------------
  */

  const handleSessionFieldChange = (event) => {
    const { name, value, type, checked } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleTermChange = (termKey, field, value) => {
    setFormData((previous) => ({
      ...previous,

      terms: previous.terms.map((term) =>
        term.key === termKey
          ? {
              ...term,
              [field]: value,
            }
          : term,
      ),
    }));
  };

  /*
  |--------------------------------------------------------------------------
  | VALIDATE FORM
  |--------------------------------------------------------------------------
  */

  const validateForm = () => {
    if (!formData.name.trim()) {
      return "Academic session name is required.";
    }

    for (const term of formData.terms) {
      if (
        term.startDate &&
        term.endDate &&
        new Date(term.startDate) > new Date(term.endDate)
      ) {
        return `${term.name}: start date cannot be after the end date.`;
      }

      if (
        term.startDate &&
        term.closingDate &&
        new Date(term.startDate) > new Date(term.closingDate)
      ) {
        return `${term.name}: start date cannot be after the closing date.`;
      }

      // if (
      //   term.closingDate &&
      //   term.endDate &&
      //   new Date(term.closingDate) > new Date(term.endDate)
      // ) {
      //   return `${term.name}: closing date cannot be after the end date.`;
      // }
    }

    return "";
  };
  /*
  |--------------------------------------------------------------------------
  | SAVE SESSION
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        name: formData.name.trim(),

        isActive: Boolean(formData.isActive),

        terms: formData.terms.map((term) => ({
          key: term.key,
          name: term.name,

          startDate: term.startDate || null,
          endDate: term.endDate || null,
          closingDate: term.closingDate || null,
          resumptionDate: term.resumptionDate || null,

          isActive: Boolean(term.isActive),
        })),
      };

      if (editingSessionId) {
        await updateAcademicSession(editingSessionId, payload);

        setSuccessMessage("Academic session updated successfully.");
      } else {
        await createAcademicSession(payload);

        setSuccessMessage("Academic session created successfully.");
      }

      setShowForm(false);
      setEditingSessionId(null);
      setFormData(createEmptyForm());

      await fetchSessions();
    } catch (err) {
      console.error(
        "Academic session save error:",
        err.response?.data || err.message,
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save academic session.",
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | ACCESS DENIED
  |--------------------------------------------------------------------------
  */

  if (!canView) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center">
          <FaCalendarAlt className="mx-auto mb-5 text-5xl text-red-400" />

          <h1 className="mb-3 text-2xl font-bold">Access Denied</h1>

          <p className="mb-6 text-gray-400">
            You do not have permission to view academic sessions.
          </p>

          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold transition hover:bg-green-700"
          >
            <FaArrowLeft />
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | MAIN UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 text-white sm:p-6">
      {/* ================================================================
          HEADER
      ================================================================ */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-bold sm:text-3xl">
            <FaCalendarAlt />
            Academic Sessions
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Manage academic sessions, terms, school dates, and term schedules.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-700 px-5 py-3 font-semibold transition hover:bg-slate-600"
          >
            <FaArrowLeft />
            Back
          </button>

          {canCreate && (
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold transition hover:bg-green-700"
            >
              <FaPlus />
              Create Session
            </button>
          )}
        </div>
      </div>

      {/* ================================================================
          SUCCESS
      ================================================================ */}

      {successMessage && (
        <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
          {successMessage}
        </div>
      )}

      {/* ================================================================
          ERROR
      ================================================================ */}

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* ================================================================
          SESSION LIST
      ================================================================ */}

      <div className="space-y-5">
        {loading ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-12 text-center text-sm text-slate-400">
            Loading academic sessions...
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-12 text-center">
            <FaCalendarAlt className="mx-auto mb-4 text-4xl text-slate-600" />

            <h2 className="text-lg font-semibold text-slate-300">
              No academic sessions found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create an academic session to begin managing school terms.
            </p>
          </div>
        ) : (
          sessions.map((session) => {
            const firstTerm = getTerm(session, "first");
            const secondTerm = getTerm(session, "second");
            const thirdTerm = getTerm(session, "third");

            return (
              <div
                key={session._id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm"
              >
                {/* Session Header */}

                <div className="flex flex-col gap-4 border-b border-white/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-white">
                        {session.name}
                      </h2>

                      {session.isActive ? (
                        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                          Active Session
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400">
                          Inactive
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {session.terms?.length || 0} terms configured
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewSession(session._id)}
                      className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800"
                    >
                      View Details
                    </button>

                    {canUpdate && (
                      <button
                        type="button"
                        onClick={() => handleEdit(session._id)}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
                      >
                        <FaEdit />
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* Terms */}

                <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
                  {[firstTerm, secondTerm, thirdTerm].map((term) => (
                    <div
                      key={term.key}
                      className="rounded-xl border border-white/10 bg-slate-900/70 p-4"
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="font-semibold text-white">
                          {term.name}
                        </h3>

                        {term.isActive ? (
                          <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-300">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-semibold text-slate-500">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Start</span>

                          <span className="text-right text-slate-300">
                            {formatDate(term.startDate)}
                          </span>
                        </div>

                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">End</span>

                          <span className="text-right text-slate-300">
                            {formatDate(term.endDate)}
                          </span>
                        </div>

                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Closing</span>

                          <span className="text-right text-slate-300">
                            {formatDate(term.closingDate)}
                          </span>
                        </div>

                        <div className="flex justify-between gap-4">
                          <span className="text-slate-500">Resumption</span>

                          <span className="text-right text-slate-300">
                            {formatDate(term.resumptionDate)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ================================================================
          CREATE / EDIT MODAL
      ================================================================ */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
            {/* Form Header */}

            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-900 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-white sm:text-2xl">
                  {editingSessionId
                    ? "Edit Academic Session"
                    : "Create Academic Session"}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Configure the academic year and its term dates.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseForm}
                disabled={saving}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FaTimes size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="space-y-6 p-6">
                {/* Session Information */}

                <div className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <h3 className="mb-4 text-lg font-semibold text-white">
                    Session Information
                  </h3>

                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Academic Session
                      </label>

                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleSessionFieldChange}
                        placeholder="e.g. 2026/2027"
                        className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-green-500"
                        required
                      />
                    </div>

                    <div className="flex items-end">
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-slate-950 px-4 py-3">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleSessionFieldChange}
                          className="h-4 w-4 accent-green-600"
                        />

                        <span>
                          <span className="block text-sm font-medium text-white">
                            Active Session
                          </span>

                          <span className="block text-xs text-slate-500">
                            Mark this academic session as active.
                          </span>
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Terms */}

                <div className="space-y-5">
                  {formData.terms.map((term) => (
                    <div
                      key={term.key}
                      className="rounded-xl border border-white/10 bg-white/5 p-5"
                    >
                      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-semibold text-white">
                          {term.name}
                        </h3>

                        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                          <input
                            type="checkbox"
                            checked={term.isActive}
                            onChange={(event) =>
                              handleTermChange(
                                term.key,
                                "isActive",
                                event.target.checked,
                              )
                            }
                            className="h-4 w-4 accent-green-600"
                          />
                          Active Term
                        </label>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <label className="mb-2 block text-sm text-slate-400">
                            Start Date
                          </label>

                          <input
                            type="date"
                            value={term.startDate}
                            onChange={(event) =>
                              handleTermChange(
                                term.key,
                                "startDate",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none focus:border-green-500"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-slate-400">
                            End Date
                          </label>

                          <input
                            type="date"
                            value={term.endDate}
                            onChange={(event) =>
                              handleTermChange(
                                term.key,
                                "endDate",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none focus:border-green-500"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-slate-400">
                            Closing Date
                          </label>

                          <input
                            type="date"
                            value={term.closingDate}
                            onChange={(event) =>
                              handleTermChange(
                                term.key,
                                "closingDate",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none focus:border-green-500"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-sm text-slate-400">
                            Resumption Date
                          </label>

                          <input
                            type="date"
                            value={term.resumptionDate}
                            onChange={(event) =>
                              handleTermChange(
                                term.key,
                                "resumptionDate",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-white outline-none focus:border-green-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Footer */}

              <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-white/10 bg-slate-900 px-6 py-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  disabled={saving}
                  className="rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <FaSave />

                  {saving
                    ? "Saving..."
                    : editingSessionId
                      ? "Update Session"
                      : "Create Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================
          SESSION DETAILS MODAL
      ================================================================ */}

      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {selectedSession.name}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  Academic session details
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="rounded-lg px-3 py-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {selectedSession.terms?.map((term) => (
                <div
                  key={term.key}
                  className="rounded-xl border border-white/10 bg-slate-950 p-4"
                >
                  <h3 className="mb-4 font-semibold text-white">{term.name}</h3>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-slate-500">Start Date</p>

                      <p className="text-slate-300">
                        {formatDate(term.startDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">End Date</p>

                      <p className="text-slate-300">
                        {formatDate(term.endDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Closing Date</p>

                      <p className="text-slate-300">
                        {formatDate(term.closingDate)}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Resumption Date</p>

                      <p className="text-slate-300">
                        {formatDate(term.resumptionDate)}
                      </p>
                    </div>

                    <div className="pt-2">
                      {term.isActive ? (
                        <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
                          Active Term
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-500">
                          Inactive Term
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="rounded-xl bg-slate-700 px-5 py-3 font-semibold text-white transition hover:bg-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          LOADING SESSION
      ================================================================ */}

      {loadingSession && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="rounded-xl border border-white/10 bg-slate-900 px-6 py-4 text-sm text-slate-300">
            Loading session details...
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicSessions;
