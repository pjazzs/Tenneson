const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const teacherSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Teacher's full name is required."],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Teacher's email is required."],
      lowercase: true,
      trim: true,
      unique: true,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    // Optional school employee/staff identification number.
    employeeId: {
      type: String,
      default: undefined,
      trim: true,
      uppercase: true,
    },

    password: {
      type: String,
      required: [true, "Teacher password is required."],
      minlength: 8,
      select: false,
    },

    // Teachers must change their temporary password on first login.
    mustChangePassword: {
      type: Boolean,
      default: true,
    },

    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
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

// Employee ID is optional, but must be unique when provided.
teacherSchema.index(
  { employeeId: 1 },
  {
    unique: true,
    sparse: true,
  },
);

// Hash password before saving.
teacherSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

// Compare supplied password with stored hash.
teacherSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const Teacher =
  mongoose.models.Teacher || mongoose.model("Teacher", teacherSchema);

module.exports = Teacher;
