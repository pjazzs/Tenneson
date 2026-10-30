const mongoose = require("mongoose");

const DEPARTMENTS = ["Arts", "Science", "Commercial"];

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Department name is required."],
      enum: DEPARTMENTS,
      trim: true,
    },

    code: {
      type: String,
      required: [true, "Department code is required."],
      enum: ["ART", "SCI", "COM"],
      uppercase: true,
      trim: true,
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

departmentSchema.index(
  { name: 1 },
  {
    unique: true,
    collation: {
      locale: "en",
      strength: 2,
    },
  },
);

departmentSchema.index({ code: 1 }, { unique: true });

const Department =
  mongoose.models.Department || mongoose.model("Department", departmentSchema);

module.exports = Department;
module.exports.DEPARTMENTS = DEPARTMENTS;
