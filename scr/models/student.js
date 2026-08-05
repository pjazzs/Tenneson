const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
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
    },

    session: {
      type: String,
      required: true,
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
    admissionDate:{
 type:Date,
 default:Date.now
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

const Student = mongoose.model("Student", studentSchema);
module.exports = Student;
