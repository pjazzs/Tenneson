import { useEffect, useState } from "react";
import { getResult, getResults } from "../../api/resultApi";

const Results = () => {
  const [results, setResults] = useState([]);

  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [searchInput, setSearchInput] = useState("");
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const [currentClass, setCurrentClass] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Selected Result
  |--------------------------------------------------------------------------
  */

  const [selectedResult, setSelectedResult] = useState(null);
  const [selectedResultLoading, setSelectedResultLoading] = useState(false);
  const [selectedResultError, setSelectedResultError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Fetch Result Records
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;

    const delay = searchInput.trim() ? 500 : 0;

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const params = {
          page,
          limit: 10,
        };

        if (searchInput.trim()) {
          params.search = searchInput.trim();
        }

        if (term) {
          params.term = term;
        }

        if (status) {
          params.status = status;
        }

        if (currentClass) {
          params.currentClass = currentClass;
        }

        const response = await getResults(params);

        if (cancelled) {
          return;
        }

        setResults(response.results || []);

        setPagination(
          response.pagination || {
            page,
            limit: 10,
            total: 0,
            totalPages: 1,
          },
        );
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to fetch results:",
          err.response?.data || err.message,
        );

        setError(err.response?.data?.message || "Failed to load results.");

        setResults([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [page, searchInput, term, status, currentClass]);

  /*
  |--------------------------------------------------------------------------
  | Retrieve Single Result
  |--------------------------------------------------------------------------
  */

  const handleResultClick = async (resultId) => {
    if (!resultId) {
      console.error("Cannot retrieve result: result ID is missing.");
      return;
    }

    try {
      setSelectedResultLoading(true);
      setSelectedResultError("");
      setSelectedResult(null);

      console.log("Retrieving result:", resultId);

      const response = await getResult(resultId);

      console.log("Single result retrieved:", response);

      setSelectedResult(response?.result || response);
    } catch (err) {
      console.error(
        "Failed to retrieve result:",
        err.response?.data || err.message,
      );

      setSelectedResultError(
        err.response?.data?.message || "Failed to retrieve result.",
      );
    } finally {
      setSelectedResultLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Close Selected Result
  |--------------------------------------------------------------------------
  */

  const handleCloseResult = () => {
    setSelectedResult(null);
    setSelectedResultError("");
  };

  /*
  |--------------------------------------------------------------------------
  | Filter Handlers
  |--------------------------------------------------------------------------
  */

  const handleSearchChange = (event) => {
    setSearchInput(event.target.value);
    setPage(1);
  };

  const handleTermChange = (event) => {
    setTerm(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  const handleClassChange = (event) => {
    setCurrentClass(event.target.value);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setTerm("");
    setStatus("");
    setCurrentClass("");
    setPage(1);
  };

  /*
  |--------------------------------------------------------------------------
  | Pagination
  |--------------------------------------------------------------------------
  */

  const handlePreviousPage = () => {
    if (page <= 1) {
      return;
    }

    setPage((currentPage) => currentPage - 1);
  };

  const handleNextPage = () => {
    if (page >= pagination.totalPages) {
      return;
    }

    setPage((currentPage) => currentPage + 1);
  };

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  const hasFilters = Boolean(
    searchInput.trim() || term || status || currentClass,
  );

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) {
      return "—";
    }

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "—";
    }

    return parsedDate.toLocaleString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatLabel = (value) => {
    if (!value) {
      return "—";
    }

    return String(value)
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (character) => character.toUpperCase());
  };

  const getStatusBadge = (value) => {
    const styles = {
      draft: "bg-slate-500/10 text-slate-300 border-slate-500/20",
      submitted: "bg-amber-500/10 text-amber-300 border-amber-500/20",
      approved: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
      published: "bg-blue-500/10 text-blue-300 border-blue-500/20",
    };

    return (
      <span
        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
          styles[value] || "border-slate-500/20 bg-slate-500/10 text-slate-300"
        }`}
      >
        {value ? formatLabel(value) : "—"}
      </span>
    );
  };

  const getDecisionBadge = (value) => {
    if (value === "promoted") {
      return (
        <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          Promoted
        </span>
      );
    }

    if (value === "repeat") {
      return (
        <span className="inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
          Repeat
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400">
        Pending
      </span>
    );
  };

  const getPromotionBadge = (value) => {
    if (value === "promoted") {
      return (
        <span className="inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          Promoted
        </span>
      );
    }

    if (value === "repeat") {
      return (
        <span className="inline-flex rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
          Repeat
        </span>
      );
    }

    if (value === "not_applicable") {
      return (
        <span className="inline-flex rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400">
          Not Applicable
        </span>
      );
    }

    return (
      <span className="inline-flex rounded-full bg-slate-500/10 px-3 py-1 text-xs font-semibold text-slate-400">
        {formatLabel(value)}
      </span>
    );
  };

  const getFullName = (student) => {
    return [student?.firstName, student?.lastName, student?.otherName]
      .filter(Boolean)
      .join(" ");
  };

  const getPhotoUrl = (student) => {
    if (!student?.photo) {
      return "";
    }

    if (typeof student.photo === "string") {
      return student.photo;
    }

    return (
      student.photo.url || student.photo.secure_url || student.photo.path || ""
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Subject Helpers
  |--------------------------------------------------------------------------
  */

  const getSubjectName = (subjectResult) => {
    if (!subjectResult) {
      return "Unknown Subject";
    }

    if (typeof subjectResult.subject === "string") {
      return subjectResult.subject;
    }

    return (
      subjectResult.subject?.name ||
      subjectResult.subjectName ||
      subjectResult.name ||
      "Unknown Subject"
    );
  };

  const getSubjectCode = (subjectResult) => {
    if (!subjectResult) {
      return "";
    }

    if (typeof subjectResult.subject === "object") {
      return subjectResult.subject?.code || "";
    }

    return subjectResult.subjectCode || subjectResult.code || "";
  };

  const getScoreValue = (subjectResult, keys) => {
    for (const key of keys) {
      if (
        subjectResult &&
        subjectResult[key] !== undefined &&
        subjectResult[key] !== null &&
        subjectResult[key] !== ""
      ) {
        return subjectResult[key];
      }
    }

    return "—";
  };

  /*
  |--------------------------------------------------------------------------
  | Domain Helpers
  |--------------------------------------------------------------------------
  */

  const renderDomainEntries = (domain) => {
    if (!domain || typeof domain !== "object") {
      return <p className="text-sm text-slate-500">No information recorded.</p>;
    }

    const entries = Object.entries(domain).filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    );

    if (entries.length === 0) {
      return <p className="text-sm text-slate-500">No information recorded.</p>;
    }

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="rounded-lg border border-white/10 bg-slate-900/70 p-3"
          >
            <p className="text-xs font-medium text-slate-500">
              {formatLabel(key)}
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-200">
              {typeof value === "object"
                ? JSON.stringify(value)
                : String(value)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Generic Additional Information
  |--------------------------------------------------------------------------
  */

  const renderValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "—";
      }

      return value.map((item, index) => (
        <div
          key={index}
          className="rounded-lg border border-white/10 bg-slate-900/70 p-3"
        >
          {typeof item === "object" ? (
            <div className="space-y-2">
              {Object.entries(item).map(([key, nestedValue]) => (
                <div key={key}>
                  <p className="text-xs text-slate-500">{formatLabel(key)}</p>

                  <p className="mt-1 text-sm text-slate-200">
                    {renderPrimitiveValue(nestedValue)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-200">{String(item)}</p>
          )}
        </div>
      ));
    }

    if (typeof value === "object") {
      return (
        <div className="space-y-2">
          {Object.entries(value).map(([key, nestedValue]) => (
            <div key={key}>
              <p className="text-xs text-slate-500">{formatLabel(key)}</p>

              <p className="mt-1 text-sm text-slate-200">
                {renderPrimitiveValue(nestedValue)}
              </p>
            </div>
          ))}
        </div>
      );
    }

    return String(value);
  };

  const renderPrimitiveValue = (value) => {
    if (value === null || value === undefined || value === "") {
      return "—";
    }

    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  };

  /*
  |--------------------------------------------------------------------------
  | Result Details
  |--------------------------------------------------------------------------
  */

  const renderResultDetails = () => {
    if (!selectedResult) {
      return null;
    }

    const student = selectedResult.student || {};
    const academicSession = selectedResult.academicSession || {};
    const subjectResults = Array.isArray(selectedResult.subjectResults)
      ? selectedResult.subjectResults
      : [];

    const photoUrl = getPhotoUrl(student);

    return (
      <div className="space-y-6">
        {/* Result Header */}
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-sm">
          <div className="border-b border-white/10 bg-slate-900/80 px-5 py-5">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-4">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={getFullName(student)}
                    className="h-16 w-16 rounded-full border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-slate-800 text-xl font-bold text-slate-400">
                    {student.firstName?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                )}

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                    Result Details
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-white">
                    {getFullName(student) || "Unknown Student"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    {student.studentId || "No student ID"}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {getStatusBadge(selectedResult.status)}

                {getDecisionBadge(selectedResult.principalDecision)}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-slate-950/70 p-4">
              <p className="text-xs text-slate-500">Academic Session</p>
              <p className="mt-1 font-semibold text-slate-200">
                {academicSession.name || "—"}
              </p>
            </div>

            <div className="bg-slate-950/70 p-4">
              <p className="text-xs text-slate-500">Class</p>
              <p className="mt-1 font-semibold text-slate-200">
                {selectedResult.currentClass || "—"}
              </p>
            </div>

            <div className="bg-slate-950/70 p-4">
              <p className="text-xs text-slate-500">Term</p>
              <p className="mt-1 font-semibold text-slate-200">
                {selectedResult.term
                  ? `${formatLabel(selectedResult.term)} Term`
                  : "—"}
              </p>
            </div>

            <div className="bg-slate-950/70 p-4">
              <p className="text-xs text-slate-500">Result ID</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-300">
                {selectedResult._id || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Student Information */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">
              Student Information
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Student information attached to this result.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Full Name</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {getFullName(student) || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Student ID</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {student.studentId || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Gender</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {student.gender || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Date of Birth</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {formatDate(student.dateOfBirth)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Current Class</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {student.currentClass || selectedResult.currentClass || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Admission Year</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {student.admissionYear || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Parent / Guardian</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {student.parentName || student.parentFullName || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Parent Phone</p>
              <p className="mt-1 text-sm font-medium text-slate-200">
                {student.parentPhone || "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Academic Information */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">
              Academic Information
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Academic Session</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">
                {academicSession.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Term</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">
                {selectedResult.term
                  ? `${formatLabel(selectedResult.term)} Term`
                  : "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Class</p>
              <p className="mt-1 text-sm font-semibold text-slate-200">
                {selectedResult.currentClass || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Status</p>
              <div className="mt-1">
                {getStatusBadge(selectedResult.status)}
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Closing Date</p>
              <p className="mt-1 text-sm text-slate-200">
                {formatDate(selectedResult.termDates?.closingDate)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Resumption Date</p>
              <p className="mt-1 text-sm text-slate-200">
                {formatDate(selectedResult.termDates?.resumptionDate)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Created</p>
              <p className="mt-1 text-sm text-slate-200">
                {formatDateTime(selectedResult.createdAt)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Last Updated</p>
              <p className="mt-1 text-sm text-slate-200">
                {formatDateTime(selectedResult.updatedAt)}
              </p>
            </div>
          </div>
        </section>

        {/* Subject Results */}
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <div className="border-b border-white/10 px-5 py-5">
            <h3 className="text-lg font-semibold text-white">
              Subject Results
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Scores, grades and teacher comments for each subject.
            </p>
          </div>

          {subjectResults.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-500">
              No subject results recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Subject
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      CA1
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      CA2
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Exam
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total
                    </th>

                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Grade
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Remark
                    </th>

                    <th className="min-w-70 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Teacher Comment
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {subjectResults.map((subjectResult, index) => {
                    const grade = getScoreValue(subjectResult, ["grade"]);

                    return (
                      <tr
                        key={
                          subjectResult._id || subjectResult.subjectId || index
                        }
                        className="transition hover:bg-white/3"
                      >
                        <td className="px-5 py-4">
                          <div className="font-medium text-white">
                            {getSubjectName(subjectResult)}
                          </div>

                          {getSubjectCode(subjectResult) && (
                            <div className="mt-1 text-xs text-slate-500">
                              {getSubjectCode(subjectResult)}
                            </div>
                          )}
                        </td>

                        <td className="px-5 py-4 text-center text-sm text-slate-300">
                          {getScoreValue(subjectResult, [
                            "ca1",
                            "CA1",
                            "firstCA",
                          ])}
                        </td>

                        <td className="px-5 py-4 text-center text-sm text-slate-300">
                          {getScoreValue(subjectResult, [
                            "ca2",
                            "CA2",
                            "secondCA",
                          ])}
                        </td>

                        <td className="px-5 py-4 text-center text-sm text-slate-300">
                          {getScoreValue(subjectResult, [
                            "exam",
                            "examination",
                            "examScore",
                          ])}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span className="font-semibold text-white">
                            {getScoreValue(subjectResult, [
                              "total",
                              "totalScore",
                              "score",
                            ])}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <span
                            className={`inline-flex min-w-10 items-center justify-center rounded-lg px-2 py-1 text-xs font-bold ${
                              grade === "F"
                                ? "bg-red-500/10 text-red-400"
                                : grade
                                  ? "bg-blue-500/10 text-blue-400"
                                  : "bg-slate-900 text-slate-500"
                            }`}
                          >
                            {grade || "—"}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-400">
                          {getScoreValue(subjectResult, ["remark", "remarks"])}
                        </td>

                        <td className="px-5 py-4 text-sm leading-6 text-slate-300">
                          {getScoreValue(subjectResult, [
                            "teacherComment",
                            "teacherComments",
                            "comment",
                            "comments",
                          ])}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Overall Result */}
        <section className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">Overall Result</h3>

            <p className="mt-1 text-sm text-slate-500">
              Calculated result information returned by the server.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-500">Total Score</p>

              <p className="mt-2 text-2xl font-bold text-white">
                {selectedResult.totalScore ?? "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-500">Total Obtainable</p>

              <p className="mt-2 text-2xl font-bold text-white">
                {selectedResult.totalObtainableMarks ?? "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-500">Overall Percentage</p>

              <p className="mt-2 text-2xl font-bold text-indigo-300">
                {selectedResult.overallPercentage !== undefined &&
                selectedResult.overallPercentage !== null
                  ? `${selectedResult.overallPercentage}%`
                  : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-500">Promotion Status</p>

              <div className="mt-2">
                {getPromotionBadge(selectedResult.promotionStatus)}
              </div>
            </div>
          </div>

          {selectedResult.performanceComment && (
            <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Performance Comment
              </p>

              <p className="mt-2 text-sm leading-7 text-slate-300">
                {selectedResult.performanceComment}
              </p>
            </div>
          )}
        </section>

        {/* Attendance */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">Attendance</h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-500">Days School Opened</p>

              <p className="mt-2 text-2xl font-bold text-white">
                {selectedResult.attendance?.daysSchoolOpened ?? "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-500">Days Present</p>

              <p className="mt-2 text-2xl font-bold text-emerald-400">
                {selectedResult.attendance?.daysPresent ?? "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-500">Days Absent</p>

              <p className="mt-2 text-2xl font-bold text-red-400">
                {selectedResult.attendance?.daysAbsent ?? "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Affective Domain */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">
              Affective Domain
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Student behavioural and attitude assessment.
            </p>
          </div>

          {renderDomainEntries(selectedResult.affectiveDomain)}
        </section>

        {/* Psychomotor Domain */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">
              Psychomotor Domain
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Practical and skill-based assessment.
            </p>
          </div>

          {renderDomainEntries(selectedResult.psychomotorDomain)}
        </section>

        {/* Conduct */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">Conduct</h3>
          </div>

          <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
            <p className="text-xs text-slate-500">Conduct Assessment</p>

            <p className="mt-2 text-base font-semibold text-slate-200">
              {selectedResult.conduct
                ? formatLabel(selectedResult.conduct)
                : "—"}
            </p>
          </div>
        </section>

        {/* Comments and Reports */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">
              Comments & Reports
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Class Teacher
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                {selectedResult.comments?.classTeacher || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Performance
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                {selectedResult.comments?.performance ||
                  selectedResult.performanceComment ||
                  "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Principal
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                {selectedResult.comments?.principal || "—"}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Special Report
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                {selectedResult.specialReport || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Sports
              </p>

              <div className="mt-2 text-sm leading-6 text-slate-300">
                {renderValue(selectedResult.sports)}
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Clubs
              </p>

              <div className="mt-2 text-sm leading-6 text-slate-300">
                {renderValue(selectedResult.clubs)}
              </div>
            </div>
          </div>
        </section>

        {/* Principal Decision */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">
              Principal Decision
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Decision</p>

              <div className="mt-2">
                {getDecisionBadge(selectedResult.principalDecision)}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500">Promotion Status</p>

              <div className="mt-2">
                {getPromotionBadge(selectedResult.promotionStatus)}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-500">Principal Comment</p>

              <p className="mt-2 text-sm text-slate-300">
                {selectedResult.comments?.principal || "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Workflow Information */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">
              Result Workflow
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Submitted At</p>

              <p className="mt-1 text-sm text-slate-300">
                {formatDateTime(selectedResult.submittedAt)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Approved At</p>

              <p className="mt-1 text-sm text-slate-300">
                {formatDateTime(selectedResult.approvedAt)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Published At</p>

              <p className="mt-1 text-sm text-slate-300">
                {formatDateTime(selectedResult.publishedAt)}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-500">Updated At</p>

              <p className="mt-1 text-sm text-slate-300">
                {formatDateTime(selectedResult.updatedAt)}
              </p>
            </div>
          </div>
        </section>

        {/* Audit Information */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-white">
              Audit Information
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Created By
              </p>

              <p className="mt-2 text-sm font-medium text-slate-200">
                {selectedResult.createdBy?.fullName || "—"}
              </p>

              {selectedResult.createdBy?.email && (
                <p className="mt-1 text-xs text-slate-500">
                  {selectedResult.createdBy.email}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Updated By
              </p>

              <p className="mt-2 text-sm font-medium text-slate-200">
                {selectedResult.updatedBy?.fullName || "—"}
              </p>

              {selectedResult.updatedBy?.email && (
                <p className="mt-1 text-xs text-slate-500">
                  {selectedResult.updatedBy.email}
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 text-white sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Results</h1>

        <p className="mt-1 text-sm text-slate-400">
          View and manage student academic results.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Result Records</h2>

            <p className="text-sm text-slate-400">
              Search and filter student results.
            </p>
          </div>

          {hasFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-sm font-medium text-red-400 transition hover:text-red-300"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div>
            <label
              htmlFor="result-search"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Search
            </label>

            <input
              id="result-search"
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Name or student ID..."
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Term */}
          <div>
            <label
              htmlFor="result-term"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Term
            </label>

            <select
              id="result-term"
              value={term}
              onChange={handleTermChange}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Terms</option>
              <option value="first">First Term</option>
              <option value="second">Second Term</option>
              <option value="third">Third Term</option>
            </select>
          </div>

          {/* Status */}
          <div>
            <label
              htmlFor="result-status"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Status
            </label>

            <select
              id="result-status"
              value={status}
              onChange={handleStatusChange}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="published">Published</option>
            </select>
          </div>

          {/* Class */}
          <div>
            <label
              htmlFor="result-class"
              className="mb-1 block text-sm font-medium text-slate-300"
            >
              Class
            </label>

            <select
              id="result-class"
              value={currentClass}
              onChange={handleClassChange}
              className="w-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">All Classes</option>
              <option value="JSS1">JSS1</option>
              <option value="JSS2">JSS2</option>
              <option value="JSS3">JSS3</option>
              <option value="SS1">SS1</option>
              <option value="SS2">SS2</option>
              <option value="SS3">SS3</option>
            </select>
          </div>
        </div>
      </div>

      {/* General Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Selected Result */}
      {selectedResultLoading && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-5 py-4">
          <p className="text-sm text-indigo-300">
            Retrieving complete result...
          </p>
        </div>
      )}

      {selectedResultError && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-red-300">{selectedResultError}</p>

            <button
              type="button"
              onClick={() => setSelectedResultError("")}
              className="text-xs font-medium text-red-400 hover:text-red-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {selectedResult && !selectedResultLoading && (
        <>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCloseResult}
              className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Close Result Details
            </button>
          </div>

          {renderResultDetails()}
        </>
      )}

      {/* Results Table */}
      {!selectedResult && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10">
              <thead className="bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Student
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Class
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Session
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Term
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Decision
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Created
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/10 bg-slate-950/30">
                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-12 text-center text-sm text-slate-400"
                    >
                      Loading results...
                    </td>
                  </tr>
                ) : results.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center">
                      <div className="text-sm font-medium text-slate-300">
                        No results found.
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        {hasFilters
                          ? "Try adjusting your search or filters."
                          : "Student results will appear here once they are created."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  results.map((result) => {
                    const student = result.student || {};
                    const academicSession = result.academicSession || {};

                    const fullName = getFullName(student);

                    return (
                      <tr
                        key={result._id}
                        onClick={() => handleResultClick(result._id)}
                        className="cursor-pointer transition hover:bg-indigo-500/10"
                        title="Click to view complete result"
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="font-medium text-white">
                            {fullName || "Unknown student"}
                          </div>

                          <div className="mt-1 text-xs text-slate-500">
                            {student.studentId || "—"}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                          {result.currentClass || student.currentClass || "—"}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                          {academicSession.name || "—"}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-300">
                          {result.term
                            ? `${formatLabel(result.term)} Term`
                            : "—"}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          {getStatusBadge(result.status)}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4">
                          {getDecisionBadge(result.principalDecision)}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-sm text-slate-400">
                          {formatDate(result.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && results.length > 0 && (
            <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-500">
                Showing page{" "}
                <span className="font-medium text-slate-300">
                  {pagination.page}
                </span>{" "}
                of{" "}
                <span className="font-medium text-slate-300">
                  {pagination.totalPages}
                </span>{" "}
                —{" "}
                <span className="font-medium text-slate-300">
                  {pagination.total}
                </span>{" "}
                total result
                {pagination.total === 1 ? "" : "s"}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePreviousPage}
                  disabled={page <= 1}
                  className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Previous
                </button>

                <span className="px-2 text-sm text-slate-400">{page}</span>

                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={page >= pagination.totalPages}
                  className="rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Results;
