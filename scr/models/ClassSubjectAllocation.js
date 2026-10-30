const mongoose = require("mongoose");

const SchoolClass = require("./SchoolClass");
const Department = require("./Department");
const Subject = require("./Subject");

const classSubjectAllocationSchema = new mongoose.Schema(
  {
    schoolClass: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SchoolClass",
      required: [true, "Class is required."],
    },

    // Null for JSS classes; required for SS classes.
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    // References the existing master Subject document.
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject is required."],
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

/*
|--------------------------------------------------------------------------
| CLASS / DEPARTMENT / SUBJECT UNIQUENESS
|--------------------------------------------------------------------------
|
| JSS example:
| JSS1 + null + Mathematics
|
| Senior examples:
| SS1 + Arts + Mathematics
| SS1 + Science + Mathematics
|
| The same subject can be allocated to multiple departments.
| The same subject cannot be allocated twice in the same class scope.
|
*/

classSubjectAllocationSchema.index(
  {
    schoolClass: 1,
    department: 1,
    subject: 1,
  },
  {
    unique: true,
    name: "unique_class_department_subject",
  },
);

// Useful query indexes.
classSubjectAllocationSchema.index({
  schoolClass: 1,
  isActive: 1,
});

classSubjectAllocationSchema.index({
  department: 1,
  isActive: 1,
});

classSubjectAllocationSchema.index({
  subject: 1,
  isActive: 1,
});

/*
|--------------------------------------------------------------------------
| CLASS / DEPARTMENT VALIDATION
|--------------------------------------------------------------------------
|
| JSS classes must not have a department.
| SS classes must have a department.
|
| We also verify that the referenced records exist.
|
*/

classSubjectAllocationSchema.pre("validate", async function () {
  if (!this.schoolClass) {
    this.invalidate("schoolClass", "Class is required.");
    return;
  }

  if (!this.subject) {
    this.invalidate("subject", "Subject is required.");
    return;
  }

  const [schoolClass, subject] = await Promise.all([
    SchoolClass.findById(this.schoolClass).select("_id hasDepartments"),

    Subject.findById(this.subject).select("_id"),
  ]);

  if (!schoolClass) {
    this.invalidate("schoolClass", "Selected class does not exist.");
    return;
  }

  if (!subject) {
    this.invalidate("subject", "Selected subject does not exist.");
    return;
  }

  if (schoolClass.hasDepartments && !this.department) {
    this.invalidate(
      "department",
      "A department is required for senior classes.",
    );
    return;
  }

  if (!schoolClass.hasDepartments && this.department) {
    this.invalidate("department", "Junior classes cannot have a department.");
    return;
  }

  if (this.department) {
    const department = await Department.findById(this.department).select("_id");

    if (!department) {
      this.invalidate("department", "Selected department does not exist.");
    }
  }
});

const ClassSubjectAllocation =
  mongoose.models.ClassSubjectAllocation ||
  mongoose.model("ClassSubjectAllocation", classSubjectAllocationSchema);

module.exports = ClassSubjectAllocation;
