const mongoose = require("mongoose");
const Department = require("../models/Department");

const JUNIOR_CLASSES = ["JSS1", "JSS2", "JSS3"];

const SENIOR_CLASSES = ["SS1", "SS2", "SS3"];

const ALL_CLASSES = [...JUNIOR_CLASSES, ...SENIOR_CLASSES];

const validateStudentDepartment = async ({ currentClass, departmentId }) => {
  if (!currentClass || !ALL_CLASSES.includes(currentClass)) {
    return {
      valid: false,
      department: null,
      error: "A valid student class is required.",
    };
  }

  const hasDepartment =
    departmentId !== undefined &&
    departmentId !== null &&
    String(departmentId).trim() !== "";

  // Junior classes must not have a department.
  if (JUNIOR_CLASSES.includes(currentClass)) {
    if (hasDepartment) {
      return {
        valid: false,
        department: null,
        error: "Junior classes cannot be assigned to a department.",
      };
    }

    return {
      valid: true,
      department: null,
      error: null,
    };
  }

  // Senior classes must have a department.
  if (!hasDepartment) {
    return {
      valid: false,
      department: null,
      error: "A department is required for senior classes.",
    };
  }

  // Validate the MongoDB ObjectId before querying.
  if (!/^[a-fA-F0-9]{24}$/.test(String(departmentId))) {
    return {
      valid: false,
      department: null,
      error: "Invalid department ID.",
    };
  }

  const department = await Department.findOne({
    _id: new mongoose.Types.ObjectId(String(departmentId)),
    isActive: true,
  });

  if (!department) {
    return {
      valid: false,
      department: null,
      error: "Department not found or inactive.",
    };
  }

  return {
    valid: true,
    department,
    error: null,
  };
};

module.exports = validateStudentDepartment;
