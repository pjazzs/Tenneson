const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },

    code: {
      type: String,
      trim: true,
      uppercase: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

// Case-insensitive unique subject names
subjectSchema.index(
  { name: 1 },
  {
    unique: true,
    collation: {
      locale: "en",
      strength: 2,
    },
  },
);

// Unique subject codes when a code is provided
subjectSchema.index(
  { code: 1 },
  {
    unique: true,
    sparse: true,
  },
);

const Subject =
  mongoose.models.Subject || mongoose.model("Subject", subjectSchema);

module.exports = Subject;
