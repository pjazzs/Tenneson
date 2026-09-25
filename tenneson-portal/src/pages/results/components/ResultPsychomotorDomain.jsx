import { useMemo } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaRunning,
} from "react-icons/fa";

const PSYCHOMOTOR_FIELDS = [
  {
    key: "sportingActivities",
    label: "Sporting Activities",
    description: "Participation and performance in sporting activities.",
  },
  {
    key: "handWriting",
    label: "Handwriting",
    description: "Quality, neatness and legibility of handwriting.",
  },
  {
    key: "fluency",
    label: "Fluency",
    description: "Ability to express ideas clearly and fluently.",
  },
  {
    key: "drawingAndPainting",
    label: "Drawing and Painting",
    description: "Skill and creativity demonstrated in drawing and painting.",
  },
  {
    key: "musicalAbility",
    label: "Musical Ability",
    description: "Ability and participation in musical activities.",
  },
];

function ResultPsychomotorDomain({
  selectedStudent,
  academicSession,
  term,
  psychomotorDomain,
  onPsychomotorDomainChange,
  onBack,
  onContinue,
  error,
}) {
  const termName =
    {
      first: "First Term",
      second: "Second Term",
      third: "Third Term",
    }[term] || term;

  const updateRating = (field, value) => {
    onPsychomotorDomainChange({
      ...psychomotorDomain,
      [field]: value === "" ? "" : Number(value),
    });
  };

  const validation = useMemo(() => {
    const incomplete = PSYCHOMOTOR_FIELDS.find(
      (field) => psychomotorDomain[field.key] === "",
    );

    if (incomplete) {
      return {
        valid: false,
        message: `Please enter a rating for ${incomplete.label}.`,
      };
    }

    const invalid = PSYCHOMOTOR_FIELDS.find((field) => {
      const value = Number(psychomotorDomain[field.key]);

      return !Number.isInteger(value) || value < 0 || value > 5;
    });

    if (invalid) {
      return {
        valid: false,
        message: `${invalid.label} must be rated from 0 to 5.`,
      };
    }

    return {
      valid: true,
      message: "",
    };
  }, [psychomotorDomain]);

  const totalScore = useMemo(() => {
    return PSYCHOMOTOR_FIELDS.reduce(
      (total, field) => total + (Number(psychomotorDomain[field.key]) || 0),
      0,
    );
  }, [psychomotorDomain]);

  const averageScore = useMemo(() => {
    if (!PSYCHOMOTOR_FIELDS.length) {
      return 0;
    }

    return (totalScore / PSYCHOMOTOR_FIELDS.length).toFixed(2);
  }, [totalScore]);

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
              <FaRunning className="text-lg" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">Psychomotor Domain</h1>

              <p className="text-sm text-slate-400">
                Rate the student's practical, physical and creative abilities.
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6 flex items-center gap-3">
            {/* Selection */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold">
                ✓
              </div>

              <span className="hidden text-sm font-medium text-emerald-400 sm:block">
                Selection
              </span>
            </div>

            <div className="h-px flex-1 bg-emerald-500" />

            {/* Scores */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold">
                ✓
              </div>

              <span className="hidden text-sm font-medium text-emerald-400 sm:block">
                Scores
              </span>
            </div>

            <div className="h-px flex-1 bg-emerald-500" />

            {/* Attendance */}
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold">
                ✓
              </div>

              <span className="text-sm font-medium text-emerald-400">
                Attendance
              </span>
            </div>

            <div className="h-px flex-1 bg-emerald-500" />

            {/* Affective */}
            <div className="hidden items-center gap-2 md:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold">
                ✓
              </div>

              <span className="text-sm font-medium text-emerald-400">
                Affective
              </span>
            </div>

            <div className="h-px flex-1 bg-blue-500" />

            {/* Psychomotor */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
                5
              </div>

              <span className="text-sm font-medium text-white">
                Psychomotor
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

        {/* Student / Result Information */}
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Student
            </p>

            <p className="mt-2 font-semibold text-white">
              {selectedStudent?.firstName} {selectedStudent?.lastName}
            </p>

            <p className="mt-1 text-sm text-slate-400">
              {selectedStudent?.studentId}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Academic Session
            </p>

            <p className="mt-2 font-semibold text-white">
              {academicSession?.name || "—"}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Term
            </p>

            <p className="mt-2 font-semibold text-white">{termName || "—"}</p>
          </div>
        </div>

        {/* Rating Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 shadow-xl">
          <div className="border-b border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold">
              Practical & Creative Assessment
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Rate each characteristic from 0 to 5.
            </p>
          </div>

          <div className="divide-y divide-white/5">
            {PSYCHOMOTOR_FIELDS.map((field) => {
              const value = psychomotorDomain[field.key];

              return (
                <div
                  key={field.key}
                  className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white">{field.label}</p>

                    <p className="mt-1 text-sm text-slate-500">
                      {field.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => updateRating(field.key, rating)}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-semibold transition ${
                          value === rating
                            ? "border-blue-500 bg-blue-600 text-white"
                            : "border-white/10 bg-slate-900 text-slate-400 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scale */}
          <div className="border-t border-white/10 px-5 py-4">
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              <span>
                <strong className="text-slate-300">0</strong> — Very Poor
              </span>

              <span>
                <strong className="text-slate-300">1</strong> — Poor
              </span>

              <span>
                <strong className="text-slate-300">2</strong> — Fair
              </span>

              <span>
                <strong className="text-slate-300">3</strong> — Good
              </span>

              <span>
                <strong className="text-slate-300">4</strong> — Very Good
              </span>

              <span>
                <strong className="text-slate-300">5</strong> — Excellent
              </span>
            </div>
          </div>

          {/* Validation */}
          <div className="px-5 pb-5">
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                validation.valid
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
                  : "border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
              }`}
            >
              {validation.valid ? (
                <div className="flex items-center gap-2">
                  <FaCheckCircle />

                  <span>
                    All psychomotor-domain ratings have been completed.
                  </span>
                </div>
              ) : (
                validation.message
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Characteristics
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {PSYCHOMOTOR_FIELDS.length}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Total Score
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-400">
              {totalScore} / 25
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Average
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-400">
              {averageScore} / 5
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <FaArrowLeft />
            Back to Affective
          </button>

          <button
            type="button"
            onClick={onContinue}
            disabled={!validation.valid}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue
            <FaArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultPsychomotorDomain;
