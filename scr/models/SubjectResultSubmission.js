const mongoose = require("mongoose");

const SubjectResultResponsibility = require("./SubjectResultResponsibility");

/*
|--------------------------------------------------------------------------
| INDIVIDUAL STUDENT SUBJECT SCORES
|--------------------------------------------------------------------------
*/

const studentSubjectScoreSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required."],
    },

    studentId: {
      type: String,
      required: [true, "Student ID is required."],
      trim: true,
    },

    studentName: {
      type: String,
      required: [true, "Student name is required."],
      trim: true,
    },

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
| REJECTION HISTORY
|--------------------------------------------------------------------------
|
| Every rejection is retained, even after the teacher corrects
| the scores and submits the result again.
|
*/

const rejectionHistorySchema = new mongoose.Schema(
  {
    reason: {
      type: String,
      required: [true, "A rejection reason is required."],
      trim: true,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: [true, "Rejecting administrator is required."],
    },

    rejectedAt: {
      type: Date,
      default: Date.now,
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

    responsibility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubjectResultResponsibility",
      required: [true, "Subject result responsibility is required."],
    },

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
    |   Teacher can enter and edit scores.
    |
    | submitted:
    |   Waiting for administrator review.
    |
    | approved:
    |   Administrator has accepted the subject score submission.
    |
    | rejected:
    |   Returned to the designated teacher for correction.
    |
    | Approval here is NOT official result publication.
    |
    */

    status: {
      type: String,
      enum: ["draft", "submitted", "approved", "rejected"],
      default: "draft",
      index: true,
    },

    /*
    |--------------------------------------------------------------------------
    | REJECTION INFORMATION
    |--------------------------------------------------------------------------
    */

    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    rejectionHistory: {
      type: [rejectionHistorySchema],
      default: [],
    },

    /*
    |--------------------------------------------------------------------------
    | APPROVAL INFORMATION
    |--------------------------------------------------------------------------
    */

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
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

  let responsibilityQuery = SubjectResultResponsibility.findById(
    this.responsibility,
  ).select("allocation academicSession term");

  if (this.$session()) {
    responsibilityQuery = responsibilityQuery.session(this.$session());
  }

  const responsibility = await responsibilityQuery;

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
