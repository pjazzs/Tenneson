const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| SUBJECT RESULT CORRECTION REQUEST
|--------------------------------------------------------------------------
|
| One document represents one student's correction request for one subject.
|
| Multiple correction requests can belong to one ResultRevision.
| The official Result is not changed by this model or its requests.
|
|--------------------------------------------------------------------------
*/

const correctionScoreSchema = new mongoose.Schema(
  {
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
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| AUDIT EVENTS
|--------------------------------------------------------------------------
*/

const correctionEventSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "created",
        "teacher_submitted",
        "accepted",
        "returned",
        "cancelled",
      ],
    },

    actorType: {
      type: String,
      required: true,
      enum: ["admin", "teacher"],
    },

    performedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    performedByTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },

    note: {
      type: String,
      trim: true,
      default: "",
      maxlength: 2000,
    },

    performedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

/*
|--------------------------------------------------------------------------
| MAIN SCHEMA
|--------------------------------------------------------------------------
*/

const subjectResultCorrectionRequestSchema = new mongoose.Schema(
  {
    // Parent correction package.
    resultRevision: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ResultRevision",
      required: [true, "Parent result revision is required."],
      index: true,
    },

    // Official published result.
    result: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Result",
      required: [true, "Official result is required."],
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required."],
      index: true,
    },

    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: [true, "Academic session is required."],
    },

    term: {
      type: String,
      required: [true, "Academic term is required."],
      enum: ["first", "second", "third"],
    },

    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required."],
    },

    // Class/department-specific subject allocation.
    allocation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClassSubjectAllocation",
      required: [true, "Subject allocation is required."],
    },

    // Exact source submission and student score subdocument.
    submission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubjectResultSubmission",
      required: [true, "Original subject result submission is required."],
    },

    submissionStudentResult: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, "Original student score entry is required."],
    },

    responsibility: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubjectResultResponsibility",
      required: [true, "Original subject result responsibility is required."],
    },

    /*
     * Frozen routing information.
     * originalSubmittingTeacher must come from the original submission's
     * submittedByTeacher field, not the current responsibility owner.
     */
    originalSubmittingTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Original submitting teacher is required."],
      index: true,
    },

    originalTeacherAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TeacherAssignment",
      required: [true, "Original teacher assignment is required."],
    },

    originalTeacherName: {
      type: String,
      trim: true,
      default: "",
    },

    // Original score snapshot. Controllers must not modify this.
    originalScore: {
      type: correctionScoreSchema,
      required: [true, "Original score snapshot is required."],
      immutable: true,
    },

    // Teacher's proposed score.
    proposedScore: {
      type: correctionScoreSchema,
      default: null,
    },

    // Admin's explanation for initiating the request.
    requestReason: {
      type: String,
      required: [true, "A correction request reason is required."],
      trim: true,
      minlength: [
        5,
        "Correction request reason must be at least 5 characters.",
      ],
      maxlength: [
        1000,
        "Correction request reason cannot exceed 1000 characters.",
      ],
    },

    // Teacher's explanation for the proposed correction.
    teacherReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: [1000, "Teacher reason cannot exceed 1000 characters."],
    },

    // Admin's review explanation.
    adminReviewNote: {
      type: String,
      trim: true,
      default: "",
      maxlength: [2000, "Admin review note cannot exceed 2000 characters."],
    },

    status: {
      type: String,
      enum: [
        "pending_teacher",
        "submitted",
        "accepted",
        "returned",
        "cancelled",
      ],
      default: "pending_teacher",
      index: true,
    },

    /*
     * Used by the unique index.
     * Set to false when a request is cancelled.
     * Accepted requests remain active within their parent revision.
     */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Admin who initiated the request.
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: [true, "Requesting administrator is required."],
    },

    requestedAt: {
      type: Date,
      default: Date.now,
    },

    // Teacher submission audit.
    submittedByTeacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    // Admin review audit.
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    events: {
      type: [correctionEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  },
);

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

// Teacher dashboard: outstanding correction requests.
subjectResultCorrectionRequestSchema.index({
  originalSubmittingTeacher: 1,
  status: 1,
  createdAt: -1,
});

// Correction history for a result.
subjectResultCorrectionRequestSchema.index({
  result: 1,
  resultRevision: 1,
  createdAt: -1,
});

// Only one active correction request per subject in a revision.
// A subsequent correction after publication belongs to a new revision.
subjectResultCorrectionRequestSchema.index(
  {
    resultRevision: 1,
    subject: 1,
  },
  {
    unique: true,
    name: "unique_subject_correction_per_revision",
    partialFilterExpression: {
      isActive: true,
    },
  },
);

/*
|--------------------------------------------------------------------------
| MODEL EXPORT
|--------------------------------------------------------------------------
*/

const SubjectResultCorrectionRequest =
  mongoose.models.SubjectResultCorrectionRequest ||
  mongoose.model(
    "SubjectResultCorrectionRequest",
    subjectResultCorrectionRequestSchema,
  );

module.exports = SubjectResultCorrectionRequest;
