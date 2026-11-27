const mongoose = require("mongoose");

const resultDocumentSchema = new mongoose.Schema(
  {
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

    // Unique identifier embedded in the QR code.
    verificationCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    // Immutable copy of the result at the time of issuance.
    resultSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Preserve the exact stamp and signature used in this PDF.
    assetSnapshot: {
      stampUrl: {
        type: String,
        default: "",
      },

      signatureUrl: {
        type: String,
        default: "",
      },

      assetVersion: {
        type: Number,
        default: 1,
      },
    },

    status: {
      type: String,
      enum: ["valid", "superseded", "revoked"],
      default: "valid",
      index: true,
    },

    issuedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    supersededAt: {
      type: Date,
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    revocationReason: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Efficiently find documents issued for a particular result.
resultDocumentSchema.index({
  result: 1,
  status: 1,
  issuedAt: -1,
});

const ResultDocument =
  mongoose.models.ResultDocument ||
  mongoose.model("ResultDocument", resultDocumentSchema);

module.exports = ResultDocument;
