import { useEffect, useMemo, useState } from "react";
import { FaArrowLeft, FaSearch, FaSpinner } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

import api from "../../api/axios";

function ResultEntry() {
  const navigate = useNavigate();

  /*
  |--------------------------------------------------------------------------
  | Academic Sessions
  |--------------------------------------------------------------------------
  */

  const [academicSessions, setAcademicSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const [academicSessionId, setAcademicSessionId] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Term
  |--------------------------------------------------------------------------
  */

  const [term, setTerm] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Students
  |--------------------------------------------------------------------------
  */

  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Subjects
  |--------------------------------------------------------------------------
  */

  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);

  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

  /*
  |--------------------------------------------------------------------------
  | General
  |--------------------------------------------------------------------------
  */

  const [error, setError] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Load Academic Sessions
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const fetchAcademicSessions = async () => {
      try {
        setSessionsLoading(true);
        setError("");

        const response = await api.get("/academic-sessions");

        setAcademicSessions(response.data.academicSessions || []);
      } catch (error) {
        console.error(
          "Fetch academic sessions error:",
          error.response?.data || error.message,
        );

        setError(
          error.response?.data?.message || "Unable to load academic sessions.",
        );
      } finally {
        setSessionsLoading(false);
      }
    };

    fetchAcademicSessions();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Load Active Subjects
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setSubjectsLoading(true);
        setError("");

        const response = await api.get("/subjects", {
          params: {
            active: true,
          },
        });

        setSubjects(response.data.subjects || []);
      } catch (error) {
        console.error(
          "Fetch subjects error:",
          error.response?.data || error.message,
        );

        setError(error.response?.data?.message || "Unable to load subjects.");
      } finally {
        setSubjectsLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Search Students
  |--------------------------------------------------------------------------
  |
  | Important:
  | We intentionally do NOT call setStudents([]) synchronously inside
  | this effect when the search box is empty.
  |
  | React's eslint rule flags synchronous state updates inside effects
  | because they can cause cascading renders.
  |
  */

  useEffect(() => {
    const search = studentSearch.trim();

    if (!search) {
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setStudentsLoading(true);
        setError("");

        const response = await api.get("/students", {
          params: {
            search,
            page: 1,
            limit: 10,
          },
        });

        setStudents(response.data.students || []);
      } catch (error) {
        console.error(
          "Search students error:",
          error.response?.data || error.message,
        );

        setError(error.response?.data?.message || "Unable to search students.");

        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [studentSearch]);

  /*
  |--------------------------------------------------------------------------
  | Visible Student Search Results
  |--------------------------------------------------------------------------
  |
  | When the search input is empty, don't render the previous search results.
  | This avoids needing setStudents([]) inside the effect.
  |
  */

  const visibleStudents = studentSearch.trim() ? students : [];

  /*
  |--------------------------------------------------------------------------
  | Selected Academic Session
  |--------------------------------------------------------------------------
  */

  const selectedAcademicSession = useMemo(() => {
    return academicSessions.find(
      (session) => session._id === academicSessionId,
    );
  }, [academicSessions, academicSessionId]);

  /*
  |--------------------------------------------------------------------------
  | Available Terms
  |--------------------------------------------------------------------------
  */

  const availableTerms = selectedAcademicSession?.terms || [];

  /*
  |--------------------------------------------------------------------------
  | Select Student
  |--------------------------------------------------------------------------
  */

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStudentSearch(`${student.firstName} ${student.lastName}`);
    setStudents([]);
  };

  /*
  |--------------------------------------------------------------------------
  | Toggle Subject
  |--------------------------------------------------------------------------
  */

  const toggleSubject = (subjectId) => {
    setSelectedSubjectIds((current) => {
      if (current.includes(subjectId)) {
        return current.filter((id) => id !== subjectId);
      }

      return [...current, subjectId];
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Build Subject Results
  |--------------------------------------------------------------------------
  |
  | This is the structure that will eventually be submitted
  | to the Result API.
  |
  */

  const subjectResults = selectedSubjectIds.map((subjectId) => ({
    subjectId,
    offered: true,
    ca1: null,
    ca2: null,
    exam: null,
    teacherComment: "",
  }));

  /*
  |--------------------------------------------------------------------------
  | Continue
  |--------------------------------------------------------------------------
  */

  const canContinue =
    academicSessionId &&
    term &&
    selectedStudent &&
    selectedSubjectIds.length > 0;

  const handleContinue = () => {
    if (!canContinue) {
      setError(
        "Select an academic session, term, student, and at least one subject.",
      );

      return;
    }

    setError("");

    console.log("Result Entry Selection:", {
      studentId: selectedStudent.studentId,
      academicSessionId,
      term,
      subjectResults,
    });

    /*
     * Score entry will be added in the next step.
     */
  };

  return (
    <div className="w-full text-gray-900">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Enter Result
          </h1>

          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Select the academic session, term, student, and subjects offered
            before entering scores.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/results")}
          className="
            inline-flex
            items-center
            justify-center
            gap-2
            bg-slate-800
            hover:bg-slate-700
            text-white
            px-4
            py-2.5
            rounded-xl
            transition
            w-full
            sm:w-auto
          "
        >
          <FaArrowLeft size={13} />
          Back to Results
        </button>
      </div>

      {/* =====================================================
          ERROR
      ====================================================== */}

      {error && (
        <div
          className="
            mb-6
            rounded-xl
            border
            border-red-200
            bg-red-50
            px-4
            py-3
            text-sm
            text-red-700
          "
        >
          {error}
        </div>
      )}

      {/* =====================================================
          STEP 1 — SESSION / TERM
      ====================================================== */}

      <section
        className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          shadow-sm
          p-5
          sm:p-6
          mb-6
        "
      >
        <div className="mb-5">
          <h2 className="text-lg font-semibold">1. Academic Session & Term</h2>

          <p className="text-sm text-gray-500 mt-1">
            Select the academic period for this result.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* SESSION */}

          <div>
            <label
              htmlFor="academic-session"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Academic Session
            </label>

            <select
              id="academic-session"
              value={academicSessionId}
              onChange={(event) => {
                setAcademicSessionId(event.target.value);
                setTerm("");
              }}
              disabled={sessionsLoading}
              className="
                w-full
                h-12
                rounded-xl
                border
                border-gray-300
                bg-white
                px-4
                text-sm
                focus:outline-none
                focus:border-green-500
                disabled:bg-gray-100
              "
            >
              <option value="">
                {sessionsLoading
                  ? "Loading sessions..."
                  : "Select academic session"}
              </option>

              {academicSessions.map((session) => (
                <option key={session._id} value={session._id}>
                  {session.name}
                  {session.isActive ? " — Active" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* TERM */}

          <div>
            <label
              htmlFor="term"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Term
            </label>

            <select
              id="term"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              disabled={!academicSessionId}
              className="
                w-full
                h-12
                rounded-xl
                border
                border-gray-300
                bg-white
                px-4
                text-sm
                focus:outline-none
                focus:border-green-500
                disabled:bg-gray-100
              "
            >
              <option value="">
                {academicSessionId ? "Select term" : "Select session first"}
              </option>

              {availableTerms.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                  {item.isActive ? " — Active" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* =====================================================
          STEP 2 — STUDENT
      ====================================================== */}

      <section
        className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          shadow-sm
          p-5
          sm:p-6
          mb-6
        "
      >
        <div className="mb-5">
          <h2 className="text-lg font-semibold">2. Select Student</h2>

          <p className="text-sm text-gray-500 mt-1">
            Search by student name or student ID.
          </p>
        </div>

        <div className="relative">
          <FaSearch
            className="
              absolute
              left-4
              top-1/2
              -translate-y-1/2
              text-gray-400
            "
          />

          <input
            type="text"
            value={studentSearch}
            onChange={(event) => {
              setStudentSearch(event.target.value);
              setSelectedStudent(null);
            }}
            placeholder="Search student..."
            className="
              w-full
              h-12
              rounded-xl
              border
              border-gray-300
              pl-11
              pr-4
              text-sm
              focus:outline-none
              focus:border-green-500
            "
          />

          {studentsLoading && (
            <FaSpinner
              className="
                absolute
                right-4
                top-1/2
                -translate-y-1/2
                animate-spin
                text-green-600
              "
            />
          )}

          {/* SEARCH RESULTS */}

          {visibleStudents.length > 0 && !selectedStudent && (
            <div
              className="
                absolute
                z-20
                left-0
                right-0
                mt-2
                bg-white
                border
                border-gray-200
                rounded-xl
                shadow-xl
                overflow-hidden
              "
            >
              {visibleStudents.map((student) => (
                <button
                  key={student._id}
                  type="button"
                  onClick={() => handleSelectStudent(student)}
                  className="
                    w-full
                    text-left
                    px-4
                    py-3
                    hover:bg-gray-50
                    border-b
                    border-gray-100
                    last:border-b-0
                  "
                >
                  <div className="font-medium text-gray-900">
                    {student.firstName} {student.lastName}
                    {student.otherName ? ` ${student.otherName}` : ""}
                  </div>

                  <div className="text-xs text-gray-500 mt-1">
                    {student.studentId} · {student.currentClass} ·{" "}
                    {student.gender}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* SELECTED STUDENT */}

        {selectedStudent && (
          <div
            className="
              mt-4
              rounded-xl
              border
              border-green-200
              bg-green-50
              p-4
            "
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                  {selectedStudent.otherName
                    ? ` ${selectedStudent.otherName}`
                    : ""}
                </p>

                <p className="text-sm text-gray-600 mt-1">
                  {selectedStudent.studentId} · {selectedStudent.currentClass} ·{" "}
                  {selectedStudent.session}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedStudent(null);
                  setStudentSearch("");
                  setStudents([]);
                }}
                className="
                  text-sm
                  text-red-600
                  hover:text-red-700
                  font-medium
                "
              >
                Change Student
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================
          STEP 3 — SUBJECTS
      ====================================================== */}

      <section
        className="
          bg-white
          border
          border-gray-200
          rounded-2xl
          shadow-sm
          p-5
          sm:p-6
          mb-6
        "
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
          <div>
            <h2 className="text-lg font-semibold">3. Subjects Offered</h2>

            <p className="text-sm text-gray-500 mt-1">
              Select only the subjects this student offered for the selected
              term.
            </p>
          </div>

          <div className="text-sm font-medium text-green-600">
            {selectedSubjectIds.length} selected
          </div>
        </div>

        {subjectsLoading ? (
          <div className="flex items-center justify-center py-10 text-gray-500">
            <FaSpinner className="animate-spin mr-2" />
            Loading subjects...
          </div>
        ) : subjects.length === 0 ? (
          <div className="rounded-xl bg-gray-50 border border-gray-200 p-6 text-center text-gray-500">
            No active subjects are available.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subjects.map((subject) => {
              const selected = selectedSubjectIds.includes(subject._id);

              return (
                <label
                  key={subject._id}
                  className={`
                    flex
                    items-center
                    gap-3
                    rounded-xl
                    border
                    p-4
                    cursor-pointer
                    transition
                    ${
                      selected
                        ? "border-green-500 bg-green-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => toggleSubject(subject._id)}
                    className="
                      h-5
                      w-5
                      accent-green-600
                    "
                  />

                  <div>
                    <p className="font-medium text-gray-900">{subject.name}</p>

                    {subject.code && (
                      <p className="text-xs text-gray-500 mt-1">
                        {subject.code}
                      </p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        )}

        {/* SELECTION PREVIEW */}

        {selectedSubjectIds.length > 0 && (
          <div className="mt-6 rounded-xl bg-slate-50 border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Selected Subjects
            </h3>

            <div className="flex flex-wrap gap-2">
              {subjects
                .filter((subject) => selectedSubjectIds.includes(subject._id))
                .map((subject) => (
                  <span
                    key={subject._id}
                    className="
                      inline-flex
                      items-center
                      rounded-full
                      bg-green-100
                      text-green-700
                      px-3
                      py-1
                      text-xs
                      font-medium
                    "
                  >
                    {subject.name}
                  </span>
                ))}
            </div>
          </div>
        )}
      </section>

      {/* =====================================================
          CONTINUE
      ====================================================== */}

      <div className="flex justify-end pb-8">
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="
            w-full
            sm:w-auto
            px-6
            py-3
            rounded-xl
            bg-green-600
            hover:bg-green-700
            text-white
            font-medium
            transition
            disabled:opacity-40
            disabled:cursor-not-allowed
          "
        >
          Continue to Scores
        </button>
      </div>
    </div>
  );
}

export default ResultEntry;
