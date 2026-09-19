const mongoose = require("mongoose");

const termSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      enum: ["first", "second", "third"],
    },

    name: {
      type: String,
      required: true,
      enum: ["First Term", "Second Term", "Third Term"],
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },

    closingDate: {
      type: Date,
      default: null,
    },

    resumptionDate: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: false,
  },
);

const academicSessionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Academic session name is required"],
      trim: true,
      unique: true,
    },

    terms: {
      type: [termSchema],
      default: [
        {
          key: "first",
          name: "First Term",
          isActive: false,
        },
        {
          key: "second",
          name: "Second Term",
          isActive: false,
        },
        {
          key: "third",
          name: "Third Term",
          isActive: false,
        },
      ],

      validate: {
        validator: function (terms) {
          const keys = terms.map((term) => term.key);

          return new Set(keys).size === keys.length;
        },

        message: "An academic session cannot contain duplicate terms",
      },
    },

    isActive: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const AcademicSession =
  mongoose.models.AcademicSession ||
  mongoose.model("AcademicSession", academicSessionSchema);

module.exports = AcademicSession;
