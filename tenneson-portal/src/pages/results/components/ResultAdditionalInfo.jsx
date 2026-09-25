import { useState } from "react";
import { FaArrowLeft, FaArrowRight, FaPlus, FaTrash } from "react-icons/fa";

const ResultAdditionalInfo = ({
  selectedStudent,
  academicSession,
  term,
  sports,
  clubs,
  specialReport,
  comments,
  onSportsChange,
  onClubsChange,
  onSpecialReportChange,
  onCommentsChange,
  onBack,
  onContinue,
  error,
}) => {
  const [sportInput, setSportInput] = useState({
    event: "",
    remark: "",
  });

  const [clubInput, setClubInput] = useState({
    organization: "",
    officeHeld: "",
    significantContribution: "",
  });

  const termName =
    {
      first: "First Term",
      second: "Second Term",
      third: "Third Term",
    }[term] || term;

  /*
  |--------------------------------------------------------------------------
  | Sports
  |--------------------------------------------------------------------------
  */

  const updateSportInput = (field, value) => {
    setSportInput((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addSport = () => {
    const event = sportInput.event.trim();
    const remark = sportInput.remark.trim();

    if (!event) {
      return;
    }

    const alreadyExists = sports.some(
      (sport) => sport.event.toLowerCase() === event.toLowerCase(),
    );

    if (alreadyExists) {
      setSportInput({
        event: "",
        remark: "",
      });

      return;
    }

    onSportsChange([
      ...sports,
      {
        event,
        remark,
      },
    ]);

    setSportInput({
      event: "",
      remark: "",
    });
  };

  const removeSport = (index) => {
    onSportsChange(sports.filter((_, itemIndex) => itemIndex !== index));
  };

  /*
  |--------------------------------------------------------------------------
  | Clubs
  |--------------------------------------------------------------------------
  */

  const updateClubInput = (field, value) => {
    setClubInput((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const addClub = () => {
    const organization = clubInput.organization.trim();
    const officeHeld = clubInput.officeHeld.trim();
    const significantContribution = clubInput.significantContribution.trim();

    if (!organization) {
      return;
    }

    const alreadyExists = clubs.some(
      (club) => club.organization.toLowerCase() === organization.toLowerCase(),
    );

    if (alreadyExists) {
      setClubInput({
        organization: "",
        officeHeld: "",
        significantContribution: "",
      });

      return;
    }

    onClubsChange([
      ...clubs,
      {
        organization,
        officeHeld,
        significantContribution,
      },
    ]);

    setClubInput({
      organization: "",
      officeHeld: "",
      significantContribution: "",
    });
  };

  const removeClub = (index) => {
    onClubsChange(clubs.filter((_, itemIndex) => itemIndex !== index));
  };

  /*
  |--------------------------------------------------------------------------
  | Keyboard Handling
  |--------------------------------------------------------------------------
  */

  const handleSportKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addSport();
    }
  };

  const handleClubKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addClub();
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Comments
  |--------------------------------------------------------------------------
  */

  const updateComment = (field, value) => {
    onCommentsChange({
      ...comments,
      [field]: value,
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 text-sm font-medium text-blue-400">
            Result Entry
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Additional Information
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Add extracurricular activities, special reports and result comments.
          </p>
        </div>

        {/* Student Summary */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Student
              </p>

              <p className="mt-1 font-semibold text-white">
                {selectedStudent?.firstName} {selectedStudent?.lastName}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Student ID
              </p>

              <p className="mt-1 font-semibold text-white">
                {selectedStudent?.studentId || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Academic Session
              </p>

              <p className="mt-1 font-semibold text-white">
                {academicSession?.name || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Term
              </p>

              <p className="mt-1 font-semibold text-white">{termName || "—"}</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Sports */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">Sports</h2>

              <p className="mt-1 text-sm text-slate-400">
                Add the sports activities the student participates in and the
                corresponding remark.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                value={sportInput.event}
                onChange={(event) =>
                  updateSportInput("event", event.target.value)
                }
                onKeyDown={handleSportKeyDown}
                placeholder="e.g. Football"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />

              <input
                type="text"
                value={sportInput.remark}
                onChange={(event) =>
                  updateSportInput("remark", event.target.value)
                }
                onKeyDown={handleSportKeyDown}
                placeholder="e.g. Excellent participation"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              />

              <button
                type="button"
                onClick={addSport}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                <FaPlus />
                Add Sport
              </button>
            </div>

            {sports.length > 0 && (
              <div className="mt-5 space-y-3">
                {sports.map((sport, index) => (
                  <div
                    key={`${sport.event}-${index}`}
                    className="flex flex-col gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-semibold text-blue-200">
                        {sport.event}
                      </p>

                      {sport.remark && (
                        <p className="mt-1 text-sm text-slate-400">
                          {sport.remark}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSport(index)}
                      className="inline-flex items-center justify-center gap-2 self-start rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300 sm:self-auto"
                      aria-label={`Remove ${sport.event}`}
                    >
                      <FaTrash />
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Clubs */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">
                Clubs & Societies
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Add the clubs or societies the student belongs to, including
                office held and contributions.
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={clubInput.organization}
                  onChange={(event) =>
                    updateClubInput("organization", event.target.value)
                  }
                  placeholder="Organization e.g. Press Club"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />

                <input
                  type="text"
                  value={clubInput.officeHeld}
                  onChange={(event) =>
                    updateClubInput("officeHeld", event.target.value)
                  }
                  placeholder="Office held e.g. President"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={clubInput.significantContribution}
                  onChange={(event) =>
                    updateClubInput(
                      "significantContribution",
                      event.target.value,
                    )
                  }
                  onKeyDown={handleClubKeyDown}
                  placeholder="Significant contribution"
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={addClub}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
                >
                  <FaPlus />
                  Add Club
                </button>
              </div>
            </div>

            {clubs.length > 0 && (
              <div className="mt-5 space-y-3">
                {clubs.map((club, index) => (
                  <div
                    key={`${club.organization}-${index}`}
                    className="flex flex-col gap-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-emerald-200">
                          {club.organization}
                        </p>

                        {club.officeHeld && (
                          <p className="mt-1 text-sm text-slate-400">
                            Office: {club.officeHeld}
                          </p>
                        )}

                        {club.significantContribution && (
                          <p className="mt-1 text-sm text-slate-400">
                            Contribution: {club.significantContribution}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeClub(index)}
                        className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                        aria-label={`Remove ${club.organization}`}
                      >
                        <FaTrash />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Special Report */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">
                Special Report
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Add any special report about the student's performance,
                participation, or development.
              </p>
            </div>

            <textarea
              value={specialReport}
              onChange={(event) => onSpecialReportChange(event.target.value)}
              rows={5}
              placeholder="Enter special report..."
              className="w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
            />
          </section>

          {/* Comments */}
          <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 shadow-xl sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">
                Result Comments
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Enter the relevant comments for this student's result.
              </p>
            </div>

            <div className="space-y-5">
              {/* Class Teacher */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Class Teacher's Comment
                </label>

                <textarea
                  value={comments?.classTeacher || ""}
                  onChange={(event) =>
                    updateComment("classTeacher", event.target.value)
                  }
                  rows={4}
                  placeholder="Enter class teacher's comment..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              {/* Performance */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Performance Comment
                </label>

                <textarea
                  value={comments?.performance || ""}
                  onChange={(event) =>
                    updateComment("performance", event.target.value)
                  }
                  rows={4}
                  placeholder="Enter performance comment..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>

              {/* Principal */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Principal's Comment
                </label>

                <textarea
                  value={comments?.principal || ""}
                  onChange={(event) =>
                    updateComment("principal", event.target.value)
                  }
                  rows={4}
                  placeholder="Enter principal's comment..."
                  className="w-full resize-y rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-sm leading-6 text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
          >
            <FaArrowLeft />
            Back
          </button>

          <button
            type="button"
            onClick={onContinue}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            Continue to Review
            <FaArrowRight />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultAdditionalInfo;
