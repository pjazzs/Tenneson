import { FaArrowLeft, FaArrowRight, FaCheckCircle } from "react-icons/fa";

const CONDUCT_OPTIONS = [
  {
    value: "good",
    label: "Good",
    description: "The student demonstrates good conduct and behaviour.",
  },
  {
    value: "bad",
    label: "Bad",
    description: "The student has demonstrated behavioural concerns.",
  },
];

const ResultConduct = ({
  selectedStudent,
  academicSession,
  term,
  conduct,
  onConductChange,
  onBack,
  onContinue,
  error,
}) => {
  const handleSelect = (value) => {
    onConductChange(value);
  };

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600">
              <FaCheckCircle className="text-lg" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">Conduct</h1>

              <p className="mt-1 text-sm text-slate-400">
                Record the student's general conduct for this term.
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6 flex items-center gap-3 overflow-x-auto">
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold text-slate-500">
                1
              </div>

              <span className="text-sm text-slate-500">Selection</span>
            </div>

            <div className="h-px min-w-8 flex-1 bg-slate-800" />

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold text-slate-500">
                2
              </div>

              <span className="text-sm text-slate-500">Scores</span>
            </div>

            <div className="h-px min-w-8 flex-1 bg-slate-800" />

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold text-slate-500">
                3
              </div>

              <span className="text-sm text-slate-500">Attendance</span>
            </div>

            <div className="h-px min-w-8 flex-1 bg-slate-800" />

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold text-slate-500">
                4
              </div>

              <span className="text-sm text-slate-500">Affective</span>
            </div>

            <div className="h-px min-w-8 flex-1 bg-slate-800" />

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold text-slate-500">
                5
              </div>

              <span className="text-sm text-slate-500">Psychomotor</span>
            </div>

            <div className="h-px min-w-8 flex-1 bg-slate-800" />

            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
                6
              </div>

              <span className="text-sm font-medium text-white">Conduct</span>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Student / Result Context */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Student
            </p>

            <p className="mt-1 font-semibold text-white">
              {selectedStudent?.firstName} {selectedStudent?.lastName}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              {selectedStudent?.studentId}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Academic Session
            </p>

            <p className="mt-1 font-semibold text-white">
              {academicSession?.name || "—"}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Term
            </p>

            <p className="mt-1 font-semibold text-white">
              {{
                first: "First Term",
                second: "Second Term",
                third: "Third Term",
              }[term] || "—"}
            </p>
          </div>
        </div>

        {/* Conduct */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-xl md:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">General Conduct</h2>

            <p className="mt-1 text-sm text-slate-400">
              Select the conduct assessment for this student.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {CONDUCT_OPTIONS.map((option) => {
              const selected = conduct === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`rounded-2xl border p-5 text-left transition ${
                    selected
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-white/10 bg-slate-900 hover:border-white/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p
                        className={`text-base font-semibold ${
                          selected ? "text-blue-400" : "text-white"
                        }`}
                      >
                        {option.label}
                      </p>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {option.description}
                      </p>
                    </div>

                    {selected && (
                      <FaCheckCircle className="mt-0.5 shrink-0 text-lg text-blue-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <FaArrowLeft />
            Back to Psychomotor
          </button>

          <button
            type="button"
            onClick={() => {
              if (!conduct) {
                return;
              }

              onContinue();
            }}
            disabled={!conduct}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
            <FaArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultConduct;
