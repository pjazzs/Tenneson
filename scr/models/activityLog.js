const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    action: {
      type: String,
      required: true,
    },

    studentId: {
      type: String,
      default: null,
    },

    details: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

const activityLog = mongoose.model("ActivityLog", activityLogSchema);

module.exports = activityLog;
