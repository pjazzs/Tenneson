const mongoose = require("mongoose");

/*
|--------------------------------------------------------------------------
| Result Revision Schema
|--------------------------------------------------------------------------
|
| Corrections are stored separately from the official Result document.
| The official published result remains unchanged until an approved
| correction is explicitly published.
|
| originalSnapshot preserves the official result as it was when the
| correction was initiated. proposedData stores the corrected data.
|
|--------------------------------------------------------------------------
*/

const resultRevisionEventSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "created",
        "updated",
        "submitted",
        "approved",
        "rejected",
        "resubmitted",
        "published",
        "cancelled",
      ],
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    note: {
      type: String,
      default: "",
      trim: true,
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

const resultRevisionSchema = new mongoose.Schema(
  {
    // Original result being corrected.
    result: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Result",
      required: true,
      index: true,
    },

    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    academicSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
    },

    term: {
      type: String,
      required: true,
      enum: ["first", "second", "third"],
    },

    // Revision number for this particular result.
    revisionNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    /*
     * Only one unresolved correction can exist for a result.
     * A rejected correction remains active so it can be revised
     * and resubmitted instead of starting another correction.
     */
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    /*
     * Preserve the complete official result at correction initiation.
     * The controller must never modify this snapshot.
     */
    originalSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
      immutable: true,
    },

    // Proposed corrected assessment data.
    proposedData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Mandatory explanation for the correction.
    reason: {
      type: String,
      required: [true, "A correction reason is required."],
      trim: true,
      minlength: 5,
      maxlength: 1000,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "published",
        "cancelled",
      ],
      default: "draft",
      index: true,
    },

    principalComment: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },

    // User audit information.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    rejectedAt: {
      type: Date,
      default: null,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    // Append-only workflow event history.
    events: {
      type: [resultRevisionEventSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

/*
|--------------------------------------------------------------------------
| INDEXES
|--------------------------------------------------------------------------
*/

// A result cannot have duplicate revision numbers.
resultRevisionSchema.index(
  {
    result: 1,
    revisionNumber: 1,
  },
  {
    unique: true,
  },
);

// A result can have only one active correction at a time.
resultRevisionSchema.index(
  {
    result: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isActive: true,
    },
  },
);

// Useful for retrieving a student's correction history.
resultRevisionSchema.index({
  student: 1,
  academicSession: 1,
  term: 1,
  createdAt: -1,
});

/*
|--------------------------------------------------------------------------
| MODEL EXPORT
|--------------------------------------------------------------------------
*/

const ResultRevision =
  mongoose.models.ResultRevision ||
  mongoose.model("ResultRevision", resultRevisionSchema);

module.exports = ResultRevision;
