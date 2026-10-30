const mongoose = require("mongoose");

const SubjectResultResponsibility = require("./SubjectResultResponsibility");

/*
|--------------------------------------------------------------------------
| INDIVIDUAL STUDENT SUBJECT SCORES
|--------------------------------------------------------------------------
|
| CA1: 0–20
| CA2: 0–10
| Exam: 0–70
|
| The official total, grade and remark will be calculated later
| when the administrator compiles the official Result document.
|
*/

const studentSubjectScoreSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required."],
    },

    // Student ID snapshot for historical identification.
    studentId: {
      type: String,
      required: [true, "Student ID is required."],
      trim: true,
    },

    // Student name snapshot.
    studentName: {
      type: String,
      required: [true, "Student name is required."],
      trim: true,
    },

    // Whether the student offers this subject.
    offered: {
      type: Boolean,
      default: true,
    },

    ca1: {
      type: Number,
      min: [0, "CA1 cannot be below 0."],
      max: [20, "CA1 cannot exceed 20."],
      default: null,
    },

    ca2: {
      type: Number,
      min: [0, "CA2 cannot be below 0."],
      max: [10, "CA2 cannot exceed 10."],
      default: null,
    },

    exam: {
      type: Number,
      min: [0, "Examination score cannot be below 0."],
      max: [70, "Examination score cannot exceed 70."],
      default: null,
    },

    teacherComment: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: true,
  },
);

/*
|--------------------------------------------------------------------------
| SUBJECT RESULT SUBMISSION
|--------------------------------------------------------------------------
*/

const subjectResultSubmissionSchema = new mongoose.Schema(
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

    /*
    |--------------------------------------------------------------------------
    | DESIGNATED RESPONSIBILITY
    |--------------------------------------------------------------------------
    |
    | This links the submission to the record that determines
    | which teacher currently owns the subject result entry.
    |
    | The controller must verify the authenticated teacher against
    | the CURRENT responsibility before allowing any modification.
    |
    */

    responsibility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubjectResultResponsibility",
      required: [true, "Subject result responsibility is required."],
    },

    /*
    |--------------------------------------------------------------------------
    | STUDENT SCORES
    |--------------------------------------------------------------------------
    */

    studentResults: {
      type: [studentSubjectScoreSchema],
      default: [],

      validate: {
        validator: function (students) {
          const studentIds = students.map((item) => item.student.toString());

          return new Set(studentIds).size === studentIds.length;
        },

        message: "A student cannot appear more than once in this submission.",
      },
    },

    /*
    |--------------------------------------------------------------------------
    | SUBMISSION STATUS
    |--------------------------------------------------------------------------
    |
    | draft:
    |   Teacher can continue entering and editing scores.
    |
    | submitted:
    |   Subject scores have been submitted independently.
    |   Teacher cannot edit them through the normal submission workflow.
    |
    */

    status: {
      type: String,
      enum: ["draft", "submitted"],
      default: "draft",
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | TEACHER AUDIT INFORMATION
    |--------------------------------------------------------------------------
    */

    createdByTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Creating teacher is required."],
    },

    updatedByTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },

    submittedByTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);

/*
|--------------------------------------------------------------------------
| ONE SUBMISSION PER ALLOCATION / SESSION / TERM
|--------------------------------------------------------------------------
|
| Example:
|
| Mathematics + JSS1 + 2026/2027 + First Term
|
| Only one submission document can exist for that combination.
|
*/

subjectResultSubmissionSchema.index(
  {
    allocation: 1,
    academicSession: 1,
    term: 1,
  },
  {
    unique: true,
    name: "unique_subject_result_submission",
  },
);

/*
|--------------------------------------------------------------------------
| QUERY INDEXES
|--------------------------------------------------------------------------
*/

subjectResultSubmissionSchema.index({
  academicSession: 1,
  term: 1,
  status: 1,
});

subjectResultSubmissionSchema.index({
  responsibility: 1,
});

/*
|--------------------------------------------------------------------------
| RESPONSIBILITY VALIDATION
|--------------------------------------------------------------------------
|
| Ensure that the responsibility belongs to the same:
|
| - Subject allocation
| - Academic session
| - Term
|
| This model does not decide whether the authenticated teacher
| is allowed to modify the submission. That must be checked
| in the controller using the current responsibility owner.
|
*/

subjectResultSubmissionSchema.pre("validate", async function () {
  if (
    !this.responsibility ||
    !this.allocation ||
    !this.academicSession ||
    !this.term
  ) {
    return;
  }

  const responsibility = await SubjectResultResponsibility.findById(
    this.responsibility,
  ).select("allocation academicSession term");

  if (!responsibility) {
    this.invalidate(
      "responsibility",
      "Subject result responsibility does not exist.",
    );

    return;
  }

  if (responsibility.allocation.toString() !== this.allocation.toString()) {
    this.invalidate(
      "responsibility",
      "Responsibility does not belong to this subject allocation.",
    );
  }

  if (
    responsibility.academicSession.toString() !==
    this.academicSession.toString()
  ) {
    this.invalidate(
      "responsibility",
      "Responsibility does not belong to this academic session.",
    );
  }

  if (responsibility.term !== this.term) {
    this.invalidate(
      "responsibility",
      "Responsibility does not belong to this academic term.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| MODEL EXPORT
|--------------------------------------------------------------------------
*/

const SubjectResultSubmission =
  mongoose.models.SubjectResultSubmission ||
  mongoose.model("SubjectResultSubmission", subjectResultSubmissionSchema);

module.exports = SubjectResultSubmission;
