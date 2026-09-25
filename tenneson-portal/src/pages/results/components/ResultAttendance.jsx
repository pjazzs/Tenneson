import { useMemo } from "react";
import {
  FaArrowLeft,
  FaArrowRight,
  FaCalendarCheck,
  FaCheckCircle,
} from "react-icons/fa";

function ResultAttendance({
  selectedStudent,
  academicSession,
  term,
  attendance,
  onAttendanceChange,
  onBack,
  onContinue,
  error,
}) {
  /*
  |--------------------------------------------------------------------------
  | Term Name
  |--------------------------------------------------------------------------
  */

  const termName =
    {
      first: "First Term",
      second: "Second Term",
      third: "Third Term",
    }[term] || term;

  /*
  |--------------------------------------------------------------------------
  | Update Attendance Field
  |--------------------------------------------------------------------------
  */

  const updateAttendance = (field, value) => {
    if (value === "") {
      onAttendanceChange({
        ...attendance,
        [field]: "",
      });

      return;
    }

    let numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return;
    }

    numericValue = Math.max(0, numericValue);

    onAttendanceChange({
      ...attendance,
      [field]: numericValue,
    });
  };

  /*
  |--------------------------------------------------------------------------
  | Attendance Values
  |--------------------------------------------------------------------------
  */

  const daysSchoolOpened = Number(attendance.daysSchoolOpened) || 0;
  const daysPresent = Number(attendance.daysPresent) || 0;
  const daysAbsent = Number(attendance.daysAbsent) || 0;

  /*
  |--------------------------------------------------------------------------
  | Validation
  |--------------------------------------------------------------------------
  */

  const validation = useMemo(() => {
    const opened = Number(attendance.daysSchoolOpened);
    const present = Number(attendance.daysPresent);
    const absent = Number(attendance.daysAbsent);

    if (
      attendance.daysSchoolOpened === "" ||
      attendance.daysPresent === "" ||
      attendance.daysAbsent === ""
    ) {
      return {
        valid: false,
        message: "Please complete all attendance fields.",
      };
    }

    if (
      !Number.isInteger(opened) ||
      !Number.isInteger(present) ||
      !Number.isInteger(absent)
    ) {
      return {
        valid: false,
        message: "Attendance values must be whole numbers.",
      };
    }

    if (opened < 0 || present < 0 || absent < 0) {
      return {
        valid: false,
        message: "Attendance values cannot be negative.",
      };
    }

    if (present > opened) {
      return {
        valid: false,
        message: "Days present cannot exceed days school opened.",
      };
    }

    if (absent > opened) {
      return {
        valid: false,
        message: "Days absent cannot exceed days school opened.",
      };
    }

    if (present + absent !== opened) {
      return {
        valid: false,
        message:
          "Days present and days absent must add up to days school opened.",
      };
    }

    return {
      valid: true,
      message: "",
    };
  }, [attendance]);

  /*
  |--------------------------------------------------------------------------
  | Calculated Attendance Percentage
  |--------------------------------------------------------------------------
  */

  const attendancePercentage = useMemo(() => {
    if (!daysSchoolOpened) {
      return 0;
    }

    return Math.round((daysPresent / daysSchoolOpened) * 100);
  }, [daysSchoolOpened, daysPresent]);

  /*
  |--------------------------------------------------------------------------
  | Render
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-white md:p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
              <FaCalendarCheck className="text-lg" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">Attendance</h1>

              <p className="text-sm text-slate-400">
                Enter the student's attendance for the selected term.
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6 flex items-center gap-3">
            {/* Selection */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white">
                ✓
              </div>

              <span className="hidden text-sm font-medium text-emerald-400 sm:block">
                Selection
              </span>
            </div>

            <div className="h-px flex-1 bg-emerald-500" />

            {/* Score Entry */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-white">
                ✓
              </div>

              <span className="hidden text-sm font-medium text-emerald-400 sm:block">
                Score Entry
              </span>
            </div>

            <div className="h-px flex-1 bg-blue-500" />

            {/* Attendance */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold">
                3
              </div>

              <span className="text-sm font-medium text-white">Attendance</span>
            </div>

            <div className="h-px flex-1 bg-slate-800" />

            {/* Affective Domain */}
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 text-sm font-semibold text-slate-500">
                4
              </div>

              <span className="text-sm text-slate-500">Affective</span>
            </div>
          </div>
        </div>

        {/* Error From Parent */}
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

        {/* Attendance Form */}
        <div className="rounded-2xl border border-white/10 bg-white/5 shadow-xl">
          {/* Section Header */}
          <div className="border-b border-white/10 px-5 py-4">
            <div className="flex items-center gap-3">
              <FaCheckCircle className="text-emerald-400" />

              <div>
                <h2 className="text-lg font-semibold">Attendance Record</h2>

                <p className="mt-1 text-sm text-slate-400">
                  Enter the number of school days and the student's attendance.
                </p>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="grid gap-5 p-5 md:grid-cols-3">
            {/* Days School Opened */}
            <div>
              <label
                htmlFor="daysSchoolOpened"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Days School Opened
              </label>

              <input
                id="daysSchoolOpened"
                type="number"
                min="0"
                step="1"
                value={attendance.daysSchoolOpened}
                onChange={(event) =>
                  updateAttendance("daysSchoolOpened", event.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                placeholder="e.g. 60"
              />

              <p className="mt-2 text-xs text-slate-500">
                Total number of school days for the term.
              </p>
            </div>

            {/* Days Present */}
            <div>
              <label
                htmlFor="daysPresent"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Days Present
              </label>

              <input
                id="daysPresent"
                type="number"
                min="0"
                step="1"
                value={attendance.daysPresent}
                onChange={(event) =>
                  updateAttendance("daysPresent", event.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                placeholder="e.g. 55"
              />

              <p className="mt-2 text-xs text-slate-500">
                Number of days the student was present.
              </p>
            </div>

            {/* Days Absent */}
            <div>
              <label
                htmlFor="daysAbsent"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Days Absent
              </label>

              <input
                id="daysAbsent"
                type="number"
                min="0"
                step="1"
                value={attendance.daysAbsent}
                onChange={(event) =>
                  updateAttendance("daysAbsent", event.target.value)
                }
                className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none transition focus:border-blue-500"
                placeholder="e.g. 5"
              />

              <p className="mt-2 text-xs text-slate-500">
                Number of days the student was absent.
              </p>
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

                  <span>Attendance record is valid.</span>
                </div>
              ) : (
                <span>{validation.message}</span>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Days Opened
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {daysSchoolOpened}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Present
            </p>

            <p className="mt-2 text-2xl font-bold text-emerald-400">
              {daysPresent}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Absent
            </p>

            <p className="mt-2 text-2xl font-bold text-yellow-400">
              {daysAbsent}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Attendance Rate
            </p>

            <p className="mt-2 text-2xl font-bold text-blue-400">
              {attendancePercentage}%
            </p>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-6 flex flex-col-reverse justify-between gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <FaArrowLeft />
            Back to Score Entry
          </button>

          <button
            type="button"
            onClick={onContinue}
            disabled={!validation.valid}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Continue to Affective Domain
            <FaArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultAttendance;
