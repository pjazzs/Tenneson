const mongoose = require("mongoose");

const studentCredentialSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student is required"],
      unique: true,
    },

    username: {
      type: String,
      required: [true, "Username is required"],
      trim: true,
      uppercase: true,
      unique: true,
    },

    passwordHash: {
      type: String,
      required: [true, "Password hash is required"],
    },

    mustChangePassword: {
      type: Boolean,
      default: true,
    },

    /*
    |--------------------------------------------------------------------------
    | Token Version
    |--------------------------------------------------------------------------
    |
    | Every time the student's password changes or is reset,
    | this number is increased.
    |
    | Existing JWTs contain the previous version and therefore
    | become invalid immediately.
    |
    */
    tokenVersion: {
      type: Number,
      default: 0,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

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
  },
  {
    timestamps: true,
  },
);

const StudentCredential =
  mongoose.models.StudentCredential ||
  mongoose.model("StudentCredential", studentCredentialSchema);

module.exports = StudentCredential;
