const mongoose = require("mongoose");

const TeacherAssignment = require("./TeacherAssignment");

const responsibilityHistorySchema = new mongoose.Schema(
  {
    teacherAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeacherAssignment",
      required: true,
    },

    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const subjectResultResponsibilitySchema = new mongoose.Schema(
  {
    allocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSubjectAllocation",
      required: [true, "Subject allocation is required."],
    },

    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: [true, "Academic session is required."],
    },

    term: {
      type: String,
      enum: ["first", "second", "third"],
      required: [true, "Academic term is required."],
    },

    teacherAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeacherAssignment",
      required: [true, "A designated teacher assignment is required."],
    },

    // Incremented whenever ownership or teacher result work changes.
    writeVersion: {
      type: Number,
      default: 0,
      min: 0,
    },

    assignmentHistory: {
      type: [responsibilityHistorySchema],
      default: [],
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true },
);

// Exactly one result owner per allocation, session and term.
subjectResultResponsibilitySchema.index(
  {
    allocation: 1,
    academicSession: 1,
    term: 1,
  },
  {
    unique: true,
    name: "unique_subject_result_responsibility",
  },
);

subjectResultResponsibilitySchema.index({
  teacherAssignment: 1,
});

// Ensure the selected assignment belongs to the same allocation and session.
subjectResultResponsibilitySchema.pre("validate", async function () {
  if (!this.teacherAssignment || !this.allocation || !this.academicSession) {
    return;
  }

  let assignmentQuery = TeacherAssignment.findById(
    this.teacherAssignment,
  ).select("allocation academicSession");

  // Keep the validation query inside the active transaction, when present.
  if (this.$session()) {
    assignmentQuery = assignmentQuery.session(this.$session());
  }

  const assignment = await assignmentQuery;

  if (!assignment) {
    this.invalidate(
      "teacherAssignment",
      "Selected teacher assignment does not exist.",
    );
    return;
  }

  if (assignment.allocation.toString() !== this.allocation.toString()) {
    this.invalidate(
      "teacherAssignment",
      "The designated teacher must be assigned to this subject allocation.",
    );
  }

  if (
    assignment.academicSession.toString() !== this.academicSession.toString()
  ) {
    this.invalidate(
      "teacherAssignment",
      "The designated teacher assignment must belong to this academic session.",
    );
  }
});

const SubjectResultResponsibility =
  mongoose.models.SubjectResultResponsibility ||
  mongoose.model(
    "SubjectResultResponsibility",
    subjectResultResponsibilitySchema,
  );

module.exports = SubjectResultResponsibility;
