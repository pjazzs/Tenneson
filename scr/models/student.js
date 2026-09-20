const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    admissionYear: {
      type: Number,
      default: null,
      min: [1900, "Admission year must be a valid year."],
      max: [2100, "Admission year must be a valid year."],
    },

    firstName: {
      type: String,
      required: [true, "First name is required..."],
      trim: true,
    },

    lastName: {
      type: String,
      required: [true, "Last name is required..."],
      trim: true,
    },

    otherName: {
      type: String,
      default: "",
      trim: true,
    },

    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female"],
    },

    dateOfBirth: {
      type: Date,
      required: true,
    },

    currentClass: {
      type: String,
      required: true,
      enum: ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"],
    },

    session: {
      type: String,
      required: true,
      trim: true,
      match: [/^\d{4}\/\d{4}$/, "Session must be in the format YYYY/YYYY."],
    },

    parentName: {
      type: String,
      default: "",
      trim: true,
    },

    parentPhone: {
      type: String,
      default: "",
      trim: true,
      match: [
        /^\d{1,11}$/,
        "Parent phone must contain only digits and a maximum of 11 digits.",
      ],
    },

    admissionDate: {
      type: Date,
      default: Date.now,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },

    photo: {
      url: {
        type: String,
        default: "",
      },

      publicId: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Prevent two active students with the same
 * first name, last name, and date of birth.
 *
 * Archived students are excluded from this constraint,
 * so an archived student can coexist with a newly
 * registered active student having the same details.
 */
studentSchema.index(
  {
    firstName: 1,
    lastName: 1,
    dateOfBirth: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      isActive: true,
    },
  },
);

const Student =
  mongoose.models.Student || mongoose.model("Student", studentSchema);

module.exports = Student;
