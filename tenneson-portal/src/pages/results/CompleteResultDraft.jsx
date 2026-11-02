import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaSpinner } from "react-icons/fa";

import { getResult, updateResult } from "../../api/resultApi";

import ResultAttendance from "./components/ResultAttendance";
import ResultAffectiveDomain from "./components/ResultAffectiveDomain";
import ResultPsychomotorDomain from "./components/ResultPsychomotorDomain";
import ResultConduct from "./components/ResultConduct";
import ResultAdditionalInfo from "./components/ResultAdditionalInfo";
import ResultReview from "./components/ResultReview";

import calculateResultGrade from "../../utils/resultGrade";

const getEmptyAttendance = () => ({
  daysSchoolOpened: "",
  daysPresent: "",
  daysAbsent: "",
});

const getEmptyAffectiveDomain = () => ({
  punctuality: "",
  attentiveness: "",
  neatness: "",
  politeness: "",
  reliability: "",
  honesty: "",
  initiative: "",
  attitudeToWork: "",
});

const getEmptyPsychomotorDomain = () => ({
  sportingActivities: "",
  handWriting: "",
  fluency: "",
  drawingAndPainting: "",
  musicalAbility: "",
});

const getEmptyComments = () => ({
  classTeacher: "",
  principal: "",
  performance: "",
});

const unwrapResult = (response) => {
  if (!response) return null;

  if (response.result && typeof response.result === "object") {
    return response.result;
  }

  if (response.data?.result && typeof response.data.result === "object") {
    return response.data.result;
  }

  if (response.data && typeof response.data === "object") {
    return response.data;
  }

  return response;
};

const getReferenceId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
};

const getSavedScoreEntries = (result) => {
  const subjectResults = Array.isArray(result?.subjectResults)
    ? result.subjectResults
    : [];

  return subjectResults.map((item) => {
    const subject =
      item.subject && typeof item.subject === "object" ? item.subject : null;

    const ca1 = item.ca1 ?? "";
    const ca2 = item.ca2 ?? "";
    const exam = item.exam ?? "";

    const allScoresPresent = ca1 !== "" && ca2 !== "" && exam !== "";

    const total =
      item.total ??
      (item.offered !== false && allScoresPresent
        ? Number(ca1) + Number(ca2) + Number(exam)
        : "");

    const gradeScore =
      result.term === "third" ? (item.weightedAverage ?? total) : total;

    const calculatedGrade =
      gradeScore !== "" &&
      gradeScore !== null &&
      gradeScore !== undefined &&
      Number.isFinite(Number(gradeScore))
        ? calculateResultGrade(Number(gradeScore))
        : { grade: "", remark: "" };

    return {
      subjectId: getReferenceId(item.subjectId || item.subject),
      subjectName: subject?.name || item.subjectName || "Unknown Subject",
      subjectCode: subject?.code || item.subjectCode || "",
      offered: item.offered ?? true,
      ca1,
      ca2,
      exam,
      total,
      firstTerm: item.firstTerm ?? null,
      secondTerm: item.secondTerm ?? null,
      cumulativeScore: item.cumulativeScore ?? "",
      weightedAverage: item.weightedAverage ?? "",
      grade: item.grade || calculatedGrade.grade,
      remark: item.remark || calculatedGrade.remark,
      teacherComment: item.teacherComment || "",
    };
  });
};

const CompleteResultDraft = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const draftResultId = location.state?.draftResultId || "";

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentStep, setCurrentStep] = useState("attendance");

  const [attendance, setAttendance] = useState(getEmptyAttendance);
  const [affectiveDomain, setAffectiveDomain] = useState(
    getEmptyAffectiveDomain,
  );
  const [psychomotorDomain, setPsychomotorDomain] = useState(
    getEmptyPsychomotorDomain,
  );

  const [conduct, setConduct] = useState("");
  const [sports, setSports] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [specialReport, setSpecialReport] = useState("");
  const [comments, setComments] = useState(getEmptyComments);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Load Existing Compiled Draft
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    let cancelled = false;

    const loadDraft = async () => {
      if (!draftResultId) {
        setError("The compiled result ID was not provided.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getResult(draftResultId);
        const retrievedResult = unwrapResult(response);

        if (!retrievedResult?._id) {
          throw new Error("The selected result could not be retrieved.");
        }

        if (String(retrievedResult.status).toLowerCase() !== "draft") {
          throw new Error(
            "Only draft results can be completed using this page.",
          );
        }

        if (
          !retrievedResult.student ||
          typeof retrievedResult.student !== "object" ||
          !retrievedResult.student._id
        ) {
          throw new Error(
            "The student information attached to this result is unavailable.",
          );
        }

        if (
          !retrievedResult.academicSession ||
          typeof retrievedResult.academicSession !== "object" ||
          !retrievedResult.academicSession._id
        ) {
          throw new Error(
            "The academic session attached to this result is unavailable.",
          );
        }

        if (
          !["first", "second", "third"].includes(
            String(retrievedResult.term).toLowerCase(),
          )
        ) {
          throw new Error("The result has an invalid academic term.");
        }

        if (cancelled) return;

        setResult(retrievedResult);

        setAttendance({
          ...getEmptyAttendance(),
          ...(retrievedResult.attendance || {}),
        });

        setAffectiveDomain({
          ...getEmptyAffectiveDomain(),
          ...(retrievedResult.affectiveDomain || {}),
        });

        setPsychomotorDomain({
          ...getEmptyPsychomotorDomain(),
          ...(retrievedResult.psychomotorDomain || {}),
        });

        setConduct(retrievedResult.conduct || "");

        setSports(
          Array.isArray(retrievedResult.sports) ? retrievedResult.sports : [],
        );

        setClubs(
          Array.isArray(retrievedResult.clubs) ? retrievedResult.clubs : [],
        );

        setSpecialReport(retrievedResult.specialReport || "");

        setComments({
          ...getEmptyComments(),
          ...(retrievedResult.comments || {}),
        });
      } catch (err) {
        if (cancelled) return;

        console.error(
          "Failed to load compiled result draft:",
          err.response?.data || err.message,
        );

        setError(
          err.response?.data?.message ||
            err.message ||
            "Failed to load the compiled result draft.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDraft();

    return () => {
      cancelled = true;
    };
  }, [draftResultId]);

  /*
  |--------------------------------------------------------------------------
  | Result Information
  |--------------------------------------------------------------------------
  */

  const selectedStudent = result?.student || null;
  const selectedSession = result?.academicSession || null;
  const term = String(result?.term || "").toLowerCase();

  const scoreEntries = useMemo(() => getSavedScoreEntries(result), [result]);

  /*
  |--------------------------------------------------------------------------
  | Navigation Between Completion Steps
  |--------------------------------------------------------------------------
  */

  const moveToStep = (step) => {
    setError("");
    setSuccessMessage("");
    setCurrentStep(step);
  };

  const handleContinueFromAttendance = () => {
    moveToStep("affective");
  };

  const handleContinueFromAffective = () => {
    moveToStep("psychomotor");
  };

  const handleContinueFromPsychomotor = () => {
    moveToStep("conduct");
  };

  const handleContinueFromConduct = () => {
    if (!conduct) {
      setError("Please select the student's conduct.");
      return;
    }

    moveToStep("additional");
  };

  const handleContinueFromAdditionalInfo = () => {
    moveToStep("review");
  };

  /*
  |--------------------------------------------------------------------------
  | Review Section Navigation
  |--------------------------------------------------------------------------
  */

  const handleEditReviewSection = (section) => {
    const allowedSections = [
      "attendance",
      "affective",
      "psychomotor",
      "conduct",
      "additional",
    ];

    if (!allowedSections.includes(section)) {
      setError(
        "The compiled subject scores and student information cannot be changed here.",
      );
      return;
    }

    moveToStep(section);
  };

  /*
  |--------------------------------------------------------------------------
  | Save Completed Draft
  |--------------------------------------------------------------------------
  | Only non-subject fields are sent.
  | The backend preserves the original compiled subject scores.
  */

  const handleSaveDraft = async () => {
    if (!result?._id || saving) return;

    try {
      setSaving(true);
      setError("");
      setSuccessMessage("");

      const payload = {
        attendance: {
          daysSchoolOpened: Number(attendance.daysSchoolOpened),
          daysPresent: Number(attendance.daysPresent),
          daysAbsent: Number(attendance.daysAbsent),
        },

        affectiveDomain: {
          punctuality: Number(affectiveDomain.punctuality),
          attentiveness: Number(affectiveDomain.attentiveness),
          neatness: Number(affectiveDomain.neatness),
          politeness: Number(affectiveDomain.politeness),
          reliability: Number(affectiveDomain.reliability),
          honesty: Number(affectiveDomain.honesty),
          initiative: Number(affectiveDomain.initiative),
          attitudeToWork: Number(affectiveDomain.attitudeToWork),
        },

        psychomotorDomain: {
          sportingActivities: Number(psychomotorDomain.sportingActivities),
          handWriting: Number(psychomotorDomain.handWriting),
          fluency: Number(psychomotorDomain.fluency),
          drawingAndPainting: Number(psychomotorDomain.drawingAndPainting),
          musicalAbility: Number(psychomotorDomain.musicalAbility),
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

      const response = await updateResult(result._id, payload);

      setSuccessMessage(
        response?.message ||
          "The compiled result draft has been completed and saved successfully.",
      );
    } catch (err) {
      console.error(
        "Failed to save completed result draft:",
        err.response?.data || err.message,
      );

      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to save the completed result draft.",
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Loading State
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <FaSpinner className="mr-3 animate-spin" />
        Loading compiled result draft...
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Error State
  |--------------------------------------------------------------------------
  */

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/20 bg-red-500/10 p-6">
          <h1 className="text-xl font-bold text-red-300">
            Unable to Load Result Draft
          </h1>

          <p className="mt-3 text-sm text-red-200">
            {error || "The requested result draft could not be loaded."}
          </p>

          <button
            type="button"
            onClick={() => navigate("/results")}
            className="mt-5 rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white hover:bg-slate-600"
          >
            Return to Results
          </button>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Completion Steps
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
        onBack={() => navigate("/results")}
        onContinue={handleContinueFromAttendance}
        error={error}
      />
    );
  }

  if (currentStep === "affective") {
    return (
      <ResultAffectiveDomain
        selectedStudent={selectedStudent}
        academicSession={selectedSession}
        term={term}
        affectiveDomain={affectiveDomain}
        onAffectiveDomainChange={setAffectiveDomain}
        onBack={() => moveToStep("attendance")}
        onContinue={handleContinueFromAffective}
        error={error}
      />
    );
  }

  if (currentStep === "psychomotor") {
    return (
      <ResultPsychomotorDomain
        selectedStudent={selectedStudent}
        academicSession={selectedSession}
        term={term}
        psychomotorDomain={psychomotorDomain}
        onPsychomotorDomainChange={setPsychomotorDomain}
        onBack={() => moveToStep("affective")}
        onContinue={handleContinueFromPsychomotor}
        error={error}
      />
    );
  }

  if (currentStep === "conduct") {
    return (
      <ResultConduct
        selectedStudent={selectedStudent}
        academicSession={selectedSession}
        term={term}
        conduct={conduct}
        onConductChange={setConduct}
        onBack={() => moveToStep("psychomotor")}
        onContinue={handleContinueFromConduct}
        error={error}
      />
    );
  }

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
        onSportsChange={setSports}
        onClubsChange={setClubs}
        onSpecialReportChange={setSpecialReport}
        onCommentsChange={setComments}
        onBack={() => moveToStep("conduct")}
        onContinue={handleContinueFromAdditionalInfo}
        error={error}
      />
    );
  }

  if (currentStep === "review") {
    return (
      <div>
        <div className="bg-slate-950 px-4 pt-5 text-white md:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-400">
                Compiled Result Draft
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Review the completed details before saving.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/results")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
            >
              <FaArrowLeft />
              Results
            </button>
          </div>
        </div>

        <ResultReview
          selectedStudent={selectedStudent}
          academicSession={selectedSession}
          term={term}
          scoreEntries={scoreEntries}
          previousTermResults={{ first: null, second: null }}
          attendance={attendance}
          affectiveDomain={affectiveDomain}
          psychomotorDomain={psychomotorDomain}
          conduct={conduct}
          sports={sports}
          clubs={clubs}
          specialReport={specialReport}
          comments={comments}
          onBack={() => moveToStep("additional")}
          onEditSection={handleEditReviewSection}
          onContinue={handleSaveDraft}
          error={error}
          successMessage={successMessage}
        />

        {successMessage && (
          <div className="bg-slate-950 px-4 pb-8 text-white md:px-6">
            <div className="mx-auto max-w-7xl rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-sm text-emerald-300">{successMessage}</p>

              <button
                type="button"
                onClick={() => navigate("/results")}
                className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Return to Results
              </button>
            </div>
          </div>
        )}

        {saving && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="flex items-center rounded-xl border border-white/10 bg-slate-900 px-5 py-4 text-white shadow-xl">
              <FaSpinner className="mr-3 animate-spin" />
              Saving completed draft...
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default CompleteResultDraft;
