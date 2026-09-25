import { useEffect, useMemo, useState } from "react";
import ResultAttendance from "./components/ResultAttendance";
import ResultScoreEntry from "./components/ResultScoreEntry";
import ResultAffectiveDomain from "./components/ResultAffectiveDomain";
import ResultPsychomotorDomain from "./components/ResultPsychomotorDomain";
import ResultConduct from "./components/ResultConduct";
import ResultAdditionalInfo from "./components/ResultAdditionalInfo";
import ResultReview from "./components/ResultReview";
import {
  FaArrowRight,
  FaCheckCircle,
  FaSearch,
  FaSpinner,
  FaTimes,
} from "react-icons/fa";

import api from "../../api/axios";
import { createResult, getResult, getResults } from "../../api/resultApi";
import calculateResultGrade from "../../utils/resultGrade";

const ResultEntry = () => {
  const [academicSessions, setAcademicSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [academicSessionId, setAcademicSessionId] = useState("");

  const [term, setTerm] = useState("");

  const [studentSearch, setStudentSearch] = useState("");
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);

  const [currentStep, setCurrentStep] = useState("selection");

  const [scoreEntries, setScoreEntries] = useState([]);

  const [attendance, setAttendance] = useState({
    daysSchoolOpened: "",
    daysPresent: "",
    daysAbsent: "",
  });

  /*
  |--------------------------------------------------------------------------
  | Affective Domain
  |--------------------------------------------------------------------------
  */

  const [affectiveDomain, setAffectiveDomain] = useState({
    punctuality: "",
    attentiveness: "",
    neatness: "",
    politeness: "",
    reliability: "",
    honesty: "",
    initiative: "",
    attitudeToWork: "",
  });

  /*
  |--------------------------------------------------------------------------
  | Psychomotor Domain
  |--------------------------------------------------------------------------
  */

  const [psychomotorDomain, setPsychomotorDomain] = useState({
    sportingActivities: "",
    handWriting: "",
    fluency: "",
    drawingAndPainting: "",
    musicalAbility: "",
  });

  /*
  |--------------------------------------------------------------------------
  | Conduct
  |--------------------------------------------------------------------------
  */

  const [conduct, setConduct] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Additional Information
  |--------------------------------------------------------------------------
  */

  const [sports, setSports] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [specialReport, setSpecialReport] = useState("");

  const [comments, setComments] = useState({
    classTeacher: "",
    principal: "",
    performance: "",
  });

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Load Academic Sessions
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadAcademicSessions = async () => {
      try {
        setSessionsLoading(true);
        setError("");

        const response = await api.get("/academic-sessions");

        setAcademicSessions(response.data.academicSessions || []);
      } catch (error) {
        console.error("Failed to load academic sessions:", error);

        setError(
          error.response?.data?.message || "Failed to load academic sessions.",
        );
      } finally {
        setSessionsLoading(false);
      }
    };

    loadAcademicSessions();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Load Subjects
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadSubjects = async () => {
      try {
        setSubjectsLoading(true);

        const response = await api.get("/subjects", {
          params: {
            active: true,
          },
        });

        setSubjects(response.data.subjects || []);
      } catch (error) {
        console.error("Failed to load subjects:", error);

        setError(error.response?.data?.message || "Failed to load subjects.");
      } finally {
        setSubjectsLoading(false);
      }
    };

    loadSubjects();
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Student Search
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const search = studentSearch.trim();

    if (!search || selectedStudent) {
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
        console.error("Failed to search students:", error);

        setError(error.response?.data?.message || "Failed to search students.");

        setStudents([]);
      } finally {
        setStudentsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [studentSearch, selectedStudent]);

  /*
  |--------------------------------------------------------------------------
  | Visible Students
  |--------------------------------------------------------------------------
  */

  const visibleStudents = selectedStudent
    ? []
    : studentSearch.trim()
      ? students
      : [];

  /*
  |--------------------------------------------------------------------------
  | Selected Session
  |--------------------------------------------------------------------------
  */

  const selectedSession = useMemo(() => {
    return academicSessions.find(
      (session) => session._id === academicSessionId,
    );
  }, [academicSessions, academicSessionId]);

  /*
  |--------------------------------------------------------------------------
  | Available Terms
  |--------------------------------------------------------------------------
  */

  const availableTerms = useMemo(() => {
    return selectedSession?.terms || [];
  }, [selectedSession]);

  /*
  |--------------------------------------------------------------------------
  | Selected Term
  |--------------------------------------------------------------------------
  */

  const selectedTerm = useMemo(() => {
    return availableTerms.find((item) => item.key === term);
  }, [availableTerms, term]);

  /*
  |--------------------------------------------------------------------------
  | Selected Subjects
  |--------------------------------------------------------------------------
  */

  const selectedSubjects = useMemo(() => {
    return subjects.filter((subject) =>
      selectedSubjectIds.includes(subject._id),
    );
  }, [subjects, selectedSubjectIds]);

  /*
  |--------------------------------------------------------------------------
  | Select Student
  |--------------------------------------------------------------------------
  */

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStudentSearch(student.studentId);
    setStudents([]);
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Change Student
  |--------------------------------------------------------------------------
  */

  const handleChangeStudent = () => {
    setSelectedStudent(null);
    setStudentSearch("");
    setStudents([]);
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Toggle Subject
  |--------------------------------------------------------------------------
  */

  const handleToggleSubject = (subjectId) => {
    setSelectedSubjectIds((currentIds) => {
      if (currentIds.includes(subjectId)) {
        return currentIds.filter((id) => id !== subjectId);
      }

      return [...currentIds, subjectId];
    });

    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Continue To Scores
  |--------------------------------------------------------------------------
  */

  const handleContinueToScores = () => {
    setError("");
    setSuccessMessage("");

    if (!academicSessionId) {
      setError("Please select an academic session.");
      return;
    }

    if (!term) {
      setError("Please select a term.");
      return;
    }

    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }

    if (selectedSubjectIds.length === 0) {
      setError("Please select at least one subject.");
      return;
    }

    const entries = selectedSubjects.map((subject) => {
      const existingEntry = scoreEntries.find(
        (entry) => entry.subjectId === subject._id,
      );

      return (
        existingEntry || {
          subjectId: subject._id,
          subjectName: subject.name,
          subjectCode: subject.code || "",
          offered: true,
          ca1: "",
          ca2: "",
          exam: "",
          total: 0,
          grade: "",
          remark: "",
          teacherComment: "",
        }
      );
    });

    setScoreEntries(entries);
    setCurrentStep("scores");
  };

  /*
  |--------------------------------------------------------------------------
  | Back To Selection
  |--------------------------------------------------------------------------
  */

  const handleBackToSelection = () => {
    setCurrentStep("selection");
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Update Score Entries
  |--------------------------------------------------------------------------
  */

  const handleScoreEntriesChange = (updatedEntries) => {
    const entriesWithGrades = updatedEntries.map((entry) => {
      if (!entry.offered) {
        return {
          ...entry,
          total: 0,
          grade: "",
          remark: "",
        };
      }

      const ca1 =
        entry.ca1 === "" || entry.ca1 === null ? 0 : Number(entry.ca1);

      const ca2 =
        entry.ca2 === "" || entry.ca2 === null ? 0 : Number(entry.ca2);

      const exam =
        entry.exam === "" || entry.exam === null ? 0 : Number(entry.exam);

      const total = ca1 + ca2 + exam;

      const { grade, remark } = calculateResultGrade(total);

      return {
        ...entry,
        total,
        grade,
        remark,
      };
    });

    setScoreEntries(entriesWithGrades);
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Continue From Scores To Attendance
  |--------------------------------------------------------------------------
  */

  const handleContinueFromScores = () => {
    setError("");
    setSuccessMessage("");

    const incompleteEntry = scoreEntries.find((entry) => {
      if (!entry.offered) {
        return false;
      }

      return entry.ca1 === "" || entry.ca2 === "" || entry.exam === "";
    });

    if (incompleteEntry) {
      setError(
        `Please complete the scores for ${incompleteEntry.subjectName}.`,
      );

      return;
    }

    setCurrentStep("attendance");
  };

  /*
  |--------------------------------------------------------------------------
  | Back To Scores
  |--------------------------------------------------------------------------
  */

  const handleBackToScores = () => {
    setCurrentStep("scores");
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Continue From Attendance
  |--------------------------------------------------------------------------
  */

  const handleContinueFromAttendance = () => {
    setError("");
    setSuccessMessage("");
    setCurrentStep("affective");
  };

  /*
  |--------------------------------------------------------------------------
  | Update Affective Domain
  |--------------------------------------------------------------------------
  */

  const handleAffectiveDomainChange = (updatedDomain) => {
    setAffectiveDomain(updatedDomain);
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Continue From Affective Domain
  |--------------------------------------------------------------------------
  */

  const handleContinueFromAffective = () => {
    setError("");
    setSuccessMessage("");
    setCurrentStep("psychomotor");
  };

  /*
  |--------------------------------------------------------------------------
  | Back To Attendance From Affective Domain
  |--------------------------------------------------------------------------
  */

  const handleBackToAttendance = () => {
    setCurrentStep("attendance");
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Update Psychomotor Domain
  |--------------------------------------------------------------------------
  */

  const handlePsychomotorDomainChange = (updatedDomain) => {
    setPsychomotorDomain(updatedDomain);
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Continue From Psychomotor Domain
  |--------------------------------------------------------------------------
  */

  const handleContinueFromPsychomotor = () => {
    setError("");
    setSuccessMessage("");
    setCurrentStep("conduct");
  };

  /*
  |--------------------------------------------------------------------------
  | Back To Affective From Psychomotor Domain
  |--------------------------------------------------------------------------
  */

  const handleBackToAffective = () => {
    setCurrentStep("affective");
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Update Conduct
  |--------------------------------------------------------------------------
  */

  const handleConductChange = (updatedConduct) => {
    setConduct(updatedConduct);
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Continue From Conduct
  |--------------------------------------------------------------------------
  */

  const handleContinueFromConduct = () => {
    setError("");
    setSuccessMessage("");

    if (!conduct) {
      setError("Please select the student's conduct.");
      return;
    }

    setCurrentStep("additional");
  };

  /*
  |--------------------------------------------------------------------------
  | Back To Psychomotor From Conduct
  |--------------------------------------------------------------------------
  */

  const handleBackToPsychomotor = () => {
    setCurrentStep("psychomotor");
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Update Sports
  |--------------------------------------------------------------------------
  */

  const handleSportsChange = (updatedSports) => {
    setSports(updatedSports);
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Update Clubs
  |--------------------------------------------------------------------------
  */

  const handleClubsChange = (updatedClubs) => {
    setClubs(updatedClubs);
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Update Special Report
  |--------------------------------------------------------------------------
  */

  const handleSpecialReportChange = (value) => {
    setSpecialReport(value);
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Update Comments
  |--------------------------------------------------------------------------
  */

  const handleCommentsChange = (updatedComments) => {
    setComments(updatedComments);
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Continue From Additional Information
  |--------------------------------------------------------------------------
  */

  const handleContinueFromAdditionalInfo = () => {
    setError("");
    setSuccessMessage("");
    setCurrentStep("review");
  };

  /*
  |--------------------------------------------------------------------------
  | Back To Conduct From Additional Information
  |--------------------------------------------------------------------------
  */

  const handleBackToConduct = () => {
    setCurrentStep("conduct");
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Back To Additional Information From Review
  |--------------------------------------------------------------------------
  */

  const handleBackToAdditionalInfo = () => {
    setCurrentStep("additional");
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Edit Review Section
  |--------------------------------------------------------------------------
  */

  const handleEditReviewSection = (section) => {
    setCurrentStep(section);
    setError("");
    setSuccessMessage("");
  };

  /*
  |--------------------------------------------------------------------------
  | Find Existing Result
  |--------------------------------------------------------------------------
  */

  const findExistingResult = async () => {
    console.log("Checking for existing result:", {
      studentId: selectedStudent.studentId,
      academicSessionId: selectedSession._id,
      term,
    });

    const response = await getResults({
      search: selectedStudent.studentId,
      page: 1,
      limit: 10,
    });

    const results = response?.results || [];

    console.log("Existing result search response:", response);

    const existingResult = results.find((result) => {
      const resultSessionId =
        typeof result.academicSession === "object"
          ? result.academicSession?._id
          : result.academicSession;

      return resultSessionId === selectedSession._id && result.term === term;
    });

    return existingResult || null;
  };

  /*
  |--------------------------------------------------------------------------
  | Continue From Review
  |--------------------------------------------------------------------------
  */

  const handleContinueFromReview = async () => {
    try {
      setError("");
      setSuccessMessage("");

      if (!selectedStudent) {
        setError("Student information is missing.");
        return;
      }

      if (!selectedSession) {
        setError("Academic session information is missing.");
        return;
      }

      if (!term) {
        setError("Term information is missing.");
        return;
      }

      if (!scoreEntries.length) {
        setError("No subject scores were entered.");
        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Check Existing Result First
      |--------------------------------------------------------------------------
      */

      console.log(
        "Checking whether a result already exists before creating a draft...",
      );

      const existingResult = await findExistingResult();

      /*
      |--------------------------------------------------------------------------
      | Existing Result Found
      |--------------------------------------------------------------------------
      */

      if (existingResult?._id) {
        console.log("Existing result found:", existingResult._id);

        console.log("Retrieving result:", existingResult._id);

        const retrievedResponse = await getResult(existingResult._id);

        console.log("Single result retrieved:", retrievedResponse);

        setSuccessMessage(
          "An existing result draft was retrieved successfully.",
        );

        return;
      }

      /*
      |--------------------------------------------------------------------------
      | Build Subject Results
      |--------------------------------------------------------------------------
      */

      const subjectResults = scoreEntries.map((entry) => ({
        subjectId: entry.subjectId,

        offered: Boolean(entry.offered),

        ca1: entry.ca1 === "" || entry.ca1 === null ? null : Number(entry.ca1),

        ca2: entry.ca2 === "" || entry.ca2 === null ? null : Number(entry.ca2),

        exam:
          entry.exam === "" || entry.exam === null ? null : Number(entry.exam),

        teacherComment: entry.teacherComment || "",
      }));

      /*
      |--------------------------------------------------------------------------
      | Build Result Payload
      |--------------------------------------------------------------------------
      */

      const payload = {
        studentId: selectedStudent.studentId,

        academicSessionId: selectedSession._id,

        term,

        subjectResults,

        attendance: {
          daysSchoolOpened:
            attendance.daysSchoolOpened === ""
              ? 0
              : Number(attendance.daysSchoolOpened),

          daysPresent:
            attendance.daysPresent === "" ? 0 : Number(attendance.daysPresent),

          daysAbsent:
            attendance.daysAbsent === "" ? 0 : Number(attendance.daysAbsent),
        },

        affectiveDomain: {
          punctuality:
            affectiveDomain.punctuality === ""
              ? 0
              : Number(affectiveDomain.punctuality),

          attentiveness:
            affectiveDomain.attentiveness === ""
              ? 0
              : Number(affectiveDomain.attentiveness),

          neatness:
            affectiveDomain.neatness === ""
              ? 0
              : Number(affectiveDomain.neatness),

          politeness:
            affectiveDomain.politeness === ""
              ? 0
              : Number(affectiveDomain.politeness),

          reliability:
            affectiveDomain.reliability === ""
              ? 0
              : Number(affectiveDomain.reliability),

          honesty:
            affectiveDomain.honesty === ""
              ? 0
              : Number(affectiveDomain.honesty),

          initiative:
            affectiveDomain.initiative === ""
              ? 0
              : Number(affectiveDomain.initiative),

          attitudeToWork:
            affectiveDomain.attitudeToWork === ""
              ? 0
              : Number(affectiveDomain.attitudeToWork),
        },

        psychomotorDomain: {
          sportingActivities:
            psychomotorDomain.sportingActivities === ""
              ? 0
              : Number(psychomotorDomain.sportingActivities),

          handWriting:
            psychomotorDomain.handWriting === ""
              ? 0
              : Number(psychomotorDomain.handWriting),

          fluency:
            psychomotorDomain.fluency === ""
              ? 0
              : Number(psychomotorDomain.fluency),

          drawingAndPainting:
            psychomotorDomain.drawingAndPainting === ""
              ? 0
              : Number(psychomotorDomain.drawingAndPainting),

          musicalAbility:
            psychomotorDomain.musicalAbility === ""
              ? 0
              : Number(psychomotorDomain.musicalAbility),
        },

        conduct,

        sports,

        clubs,

        specialReport,

        comments: {
          classTeacher: comments.classTeacher || "",
          principal: comments.principal || "",
          performance: comments.performance || "",
        },
      };

      /*
      |--------------------------------------------------------------------------
      | Create Result Draft
      |--------------------------------------------------------------------------
      */

      console.log("No existing result found. Creating result draft...");

      const response = await createResult(payload);

      console.log("Result draft created:", response);

      const createdResultId = response?.result?._id;

      /*
      |--------------------------------------------------------------------------
      | Verify Newly Created Draft
      |--------------------------------------------------------------------------
      */

      if (createdResultId) {
        console.log("Retrieving newly created result:", createdResultId);

        const retrievedResponse = await getResult(createdResultId);

        console.log("Newly created result retrieved:", retrievedResponse);
      }

      setSuccessMessage(
        response?.message || "Result draft created successfully.",
      );
    } catch (error) {
      console.error(
        "Failed to create or retrieve result draft:",
        error.response?.data || error.message,
      );

      setSuccessMessage("");

      setError(
        error.response?.data?.message ||
          "Failed to create or retrieve result draft.",
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Selection Step
  |--------------------------------------------------------------------------
  */

  if (currentStep === "selection") {
    return (
      <div className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
                <FaCheckCircle className="text-lg" />
              </div>

              <div>
                <h1 className="text-2xl font-bold">Result Entry</h1>

                <p className="text-sm text-slate-400">
                  Select the session, student and subjects for this result.
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-6 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
                  1
                </div>

                <span className="text-sm font-medium text-white">
                  Selection
                </span>
              </div>

              <div className="h-px flex-1 bg-slate-800" />

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold text-slate-500">
                  2
                </div>

                <span className="text-sm text-slate-500">Score Entry</span>
              </div>

              <div className="h-px flex-1 bg-slate-800" />

              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold text-slate-500">
                  3
                </div>

                <span className="hidden text-sm text-slate-500 sm:block">
                  Attendance
                </span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Selection Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Academic Session */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">Academic Session</h2>

                <p className="mt-1 text-sm text-slate-400">
                  Select the academic session and term.
                </p>
              </div>

              <div className="space-y-4">
                {/* Session */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Session
                  </label>

                  <select
                    value={academicSessionId}
                    onChange={(event) => {
                      setAcademicSessionId(event.target.value);
                      setTerm("");
                      setError("");
                      setSuccessMessage("");
                    }}
                    disabled={sessionsLoading}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500"
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

                  {selectedSession && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Selected session:
                      </span>

                      <span className="text-xs font-medium text-slate-300">
                        {selectedSession.name}
                      </span>

                      {selectedSession.isActive && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Term */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Term
                  </label>

                  <select
                    value={term}
                    onChange={(event) => {
                      setTerm(event.target.value);
                      setError("");
                      setSuccessMessage("");
                    }}
                    disabled={!academicSessionId}
                    className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none transition focus:border-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select term</option>

                    {availableTerms.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.name}
                        {item.isActive ? " — Active" : ""}
                      </option>
                    ))}
                  </select>

                  {selectedTerm && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Selected term:
                      </span>

                      <span className="text-xs font-medium text-slate-300">
                        {selectedTerm.name}
                      </span>

                      {selectedTerm.isActive && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400">
                          Active
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Student */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Student</h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Search using the student name or student ID.
                  </p>
                </div>

                {selectedStudent && (
                  <button
                    type="button"
                    onClick={handleChangeStudent}
                    className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    <FaTimes />
                    Change
                  </button>
                )}
              </div>

              {!selectedStudent && (
                <>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                      <FaSearch />
                    </div>

                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(event) => {
                        setStudentSearch(event.target.value);
                        setError("");
                        setSuccessMessage("");
                      }}
                      placeholder="Search student..."
                      className="w-full rounded-xl border border-white/10 bg-slate-900 py-3 pl-11 pr-11 text-sm text-white outline-none placeholder:text-slate-600 focus:border-blue-500"
                    />

                    {studentsLoading && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <FaSpinner className="animate-spin text-blue-400" />
                      </div>
                    )}
                  </div>

                  {visibleStudents.length > 0 && (
                    <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                      {visibleStudents.map((student) => (
                        <button
                          key={student._id}
                          type="button"
                          onClick={() => handleSelectStudent(student)}
                          className="flex w-full items-center justify-between border-b border-white/5 px-4 py-3 text-left transition last:border-b-0 hover:bg-white/5"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              {student.firstName} {student.lastName}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {student.studentId}
                            </p>
                          </div>

                          <FaArrowRight className="text-xs text-slate-600" />
                        </button>
                      ))}
                    </div>
                  )}

                  {!studentsLoading &&
                    studentSearch.trim() &&
                    visibleStudents.length === 0 && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-slate-900 px-4 py-4 text-sm text-slate-500">
                        No students found.
                      </div>
                    )}
                </>
              )}

              {selectedStudent && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-400">
                        Selected Student
                      </p>

                      <p className="mt-1 font-semibold text-white">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        {selectedStudent.studentId}
                      </p>
                    </div>

                    <FaCheckCircle className="text-xl text-emerald-400" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Subjects */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl">
            <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <h2 className="text-lg font-semibold">Subjects</h2>

                <p className="mt-1 text-sm text-slate-400">
                  Select the subjects the student is offering.
                </p>
              </div>

              <div className="rounded-full bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
                {selectedSubjectIds.length} selected
              </div>
            </div>

            {subjectsLoading ? (
              <div className="flex items-center justify-center py-10 text-slate-500">
                <FaSpinner className="mr-3 animate-spin" />
                Loading subjects...
              </div>
            ) : subjects.length === 0 ? (
              <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-4 py-4 text-sm text-yellow-300">
                No active subjects were found.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {subjects.map((subject) => {
                  const selected = selectedSubjectIds.includes(subject._id);

                  return (
                    <button
                      key={subject._id}
                      type="button"
                      onClick={() => handleToggleSubject(subject._id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-white/10 bg-slate-900 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {subject.name}
                          </p>

                          {subject.code && (
                            <p className="mt-1 text-xs text-slate-500">
                              {subject.code}
                            </p>
                          )}
                        </div>

                        {selected && (
                          <FaCheckCircle className="mt-0.5 shrink-0 text-blue-400" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleContinueToScores}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
            >
              Continue to Scores
              <FaArrowRight />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Score Entry Step
  |--------------------------------------------------------------------------
  */

  if (currentStep === "scores") {
    return (
      <ResultScoreEntry
        selectedStudent={selectedStudent}
        academicSession={selectedSession}
        term={term}
        scoreEntries={scoreEntries}
        onScoreEntriesChange={handleScoreEntriesChange}
        onBack={handleBackToSelection}
        onContinue={handleContinueFromScores}
        error={error}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Attendance Step
  |--------------------------------------------------------------------------
  */

  if (currentStep === "attendance") {
    return (
      <ResultAttendance
        selectedStudent={selectedStudent}
        academicSession={selectedSession}
        term={term}
        attendance={attendance}
        onAttendanceChange={setAttendance}
        onBack={handleBackToScores}
        onContinue={handleContinueFromAttendance}
        error={error}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Affective Domain Step
  |--------------------------------------------------------------------------
  */

  if (currentStep === "affective") {
    return (
      <ResultAffectiveDomain
        selectedStudent={selectedStudent}
        academicSession={selectedSession}
        term={term}
        affectiveDomain={affectiveDomain}
        onAffectiveDomainChange={handleAffectiveDomainChange}
        onBack={handleBackToAttendance}
        onContinue={handleContinueFromAffective}
        error={error}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Psychomotor Domain Step
  |--------------------------------------------------------------------------
  */

  if (currentStep === "psychomotor") {
    return (
      <ResultPsychomotorDomain
        selectedStudent={selectedStudent}
        academicSession={selectedSession}
        term={term}
        psychomotorDomain={psychomotorDomain}
        onPsychomotorDomainChange={handlePsychomotorDomainChange}
        onBack={handleBackToAffective}
        onContinue={handleContinueFromPsychomotor}
        error={error}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Conduct Step
  |--------------------------------------------------------------------------
  */

  if (currentStep === "conduct") {
    return (
      <ResultConduct
        selectedStudent={selectedStudent}
        academicSession={selectedSession}
        term={term}
        conduct={conduct}
        onConductChange={handleConductChange}
        onBack={handleBackToPsychomotor}
        onContinue={handleContinueFromConduct}
        error={error}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Additional Information Step
  |--------------------------------------------------------------------------
  */

  if (currentStep === "additional") {
    return (
      <ResultAdditionalInfo
        selectedStudent={selectedStudent}
        academicSession={selectedSession}
        term={term}
        sports={sports}
        clubs={clubs}
        specialReport={specialReport}
        comments={comments}
        onSportsChange={handleSportsChange}
        onClubsChange={handleClubsChange}
        onSpecialReportChange={handleSpecialReportChange}
        onCommentsChange={handleCommentsChange}
        onBack={handleBackToConduct}
        onContinue={handleContinueFromAdditionalInfo}
        error={error}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Review Step
  |--------------------------------------------------------------------------
  */

  if (currentStep === "review") {
    return (
      <ResultReview
        selectedStudent={selectedStudent}
        academicSession={selectedSession}
        term={term}
        scoreEntries={scoreEntries}
        attendance={attendance}
        affectiveDomain={affectiveDomain}
        psychomotorDomain={psychomotorDomain}
        conduct={conduct}
        sports={sports}
        clubs={clubs}
        specialReport={specialReport}
        comments={comments}
        onBack={handleBackToAdditionalInfo}
        onEditSection={handleEditReviewSection}
        onContinue={handleContinueFromReview}
        error={error}
        successMessage={successMessage}
      />
    );
  }

  return null;
};

export default ResultEntry;
