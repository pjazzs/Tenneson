const mongoose = require("mongoose");

const credentialReportEntrySchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      trim: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    currentClass: {
      type: String,
      required: true,
      trim: true,
    },

    session: {
      type: String,
      required: true,
      trim: true,
    },

    username: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    temporaryPassword: {
      type: String,
      required: true,
    },

    mustChangePassword: {
      type: Boolean,
      required: true,
    },
  },
  {
    _id: false,
  },
);

const credentialReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },

    credentials: {
      type: [credentialReportEntrySchema],
      required: true,
      default: [],
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    consumed: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

/*
|--------------------------------------------------------------------------
| TTL Index
|--------------------------------------------------------------------------
|
| MongoDB automatically removes expired credential reports.
| The controller still checks expiresAt explicitly because
| TTL deletion is not immediate.
|
*/

credentialReportSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const CredentialReport =
  mongoose.models.CredentialReport ||
  mongoose.model("CredentialReport", credentialReportSchema);

module.exports = CredentialReport;
