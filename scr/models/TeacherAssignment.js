const mongoose = require("mongoose");

const Teacher = require("./Teacher");
const ClassSubjectAllocation = require("./ClassSubjectAllocation");
const AcademicSession = require("./AcademicSession");

const teacherAssignmentSchema = new mongoose.Schema(
  {
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher is required."],
    },

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

    isActive: {
      type: Boolean,
      default: true,
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
  {
    timestamps: true,
  },
);

/*
|--------------------------------------------------------------------------
| ASSIGNMENT UNIQUENESS
|--------------------------------------------------------------------------
|
| A teacher cannot receive the same allocation twice in one session.
|
| Multiple teachers CAN receive the same allocation in the same session.
|
*/

teacherAssignmentSchema.index(
  {
    teacher: 1,
    allocation: 1,
    academicSession: 1,
  },
  {
    unique: true,
    name: "unique_teacher_allocation_session",
  },
);

// Useful query indexes.
teacherAssignmentSchema.index({
  teacher: 1,
  academicSession: 1,
  isActive: 1,
});

teacherAssignmentSchema.index({
  allocation: 1,
  academicSession: 1,
  isActive: 1,
});

/*
|--------------------------------------------------------------------------
| REFERENCE VALIDATION
|--------------------------------------------------------------------------
*/

teacherAssignmentSchema.pre("validate", async function () {
  if (!this.teacher || !this.allocation || !this.academicSession) {
    return;
  }

  const [teacher, allocation, academicSession] = await Promise.all([
    Teacher.findById(this.teacher).select("_id"),

    ClassSubjectAllocation.findById(this.allocation).select("_id"),

    AcademicSession.findById(this.academicSession).select("_id"),
  ]);

  if (!teacher) {
    this.invalidate("teacher", "Selected teacher does not exist.");
  }

  if (!allocation) {
    this.invalidate(
      "allocation",
      "Selected subject allocation does not exist.",
    );
  }

  if (!academicSession) {
    this.invalidate(
      "academicSession",
      "Selected academic session does not exist.",
    );
  }
});

const TeacherAssignment =
  mongoose.models.TeacherAssignment ||
  mongoose.model("TeacherAssignment", teacherAssignmentSchema);

module.exports = TeacherAssignment;
