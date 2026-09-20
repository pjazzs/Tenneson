const mongoose = require("mongoose");

const promotionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },

    sourceResult: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Result",
      required: true,
      unique: true,
    },

    fromSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
      index: true,
    },

    toSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademicSession",
      required: true,
      index: true,
    },

    fromClass: {
      type: String,
      required: true,
      trim: true,
    },

    toClass: {
      type: String,
      required: true,
      trim: true,
    },

    decision: {
      type: String,
      required: true,
      enum: ["promoted", "repeat", "graduated"],
    },

    appliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

/*
|--------------------------------------------------------------------------
| Promotion Integrity
|--------------------------------------------------------------------------
|
| A result can only be used to create one promotion record.
|
| A student can also have only one promotion record originating
| from a particular academic session.
|
|--------------------------------------------------------------------------
*/

promotionSchema.index(
  {
    student: 1,
    fromSession: 1,
  },
  {
    unique: true,
  },
);

const Promotion =
  mongoose.models.Promotion || mongoose.model("Promotion", promotionSchema);

module.exports = Promotion;
