const mongoose = require("mongoose");

const SCHOOL_CLASSES = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];

const schoolClassSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Class name is required."],
      enum: SCHOOL_CLASSES,
      unique: true,
      uppercase: true,
      trim: true,
    },

    level: {
      type: String,
      required: true,
      enum: ["junior", "senior"],
    },

    hasDepartments: {
      type: Boolean,
      required: true,
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

// Ensure JSS classes are junior and SS classes are senior.
schoolClassSchema.pre("validate", function () {
  const expectedLevel = this.name?.startsWith("JSS") ? "junior" : "senior";

  if (this.level !== expectedLevel) {
    this.invalidate(
      "level",
      `${this.name} must belong to the ${expectedLevel} level.`,
    );
  }

  const expectedDepartmentStatus = expectedLevel === "senior";

  if (this.hasDepartments !== expectedDepartmentStatus) {
    this.invalidate(
      "hasDepartments",
      `${this.name} department configuration is invalid.`,
    );
  }
});

const SchoolClass =
  mongoose.models.SchoolClass ||
  mongoose.model("SchoolClass", schoolClassSchema);

module.exports = SchoolClass;
module.exports.SCHOOL_CLASSES = SCHOOL_CLASSES;
