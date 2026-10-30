const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const ClassSubjectAllocation = require("../models/ClassSubjectAllocation");
const SchoolClass = require("../models/SchoolClass");
const Department = require("../models/Department");
const Subject = require("../models/Subject");

const createAuditLog = require("../utils/createAuditLog");

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const validateObjectId = (id) => mongoose.isValidObjectId(id);

const sendInvalidId = (res, field) => {
  return res.status(400).json({
    success: false,
    message: `Invalid ${field} ID.`,
  });
};

const handleDuplicateError = (error, res) => {
  if (error.code !== 11000) return false;

  return res.status(409).json({
    success: false,
    message:
      "This subject has already been allocated to this class and department.",
  });
};

/*
|--------------------------------------------------------------------------
| ALLOCATION OPTIONS
|--------------------------------------------------------------------------
|
| Returns the active classes, departments and subjects required by the
| allocation form. This avoids depending on the existing departments
| endpoint and its unrelated permission.
|
*/

exports.getAllocationOptions = asyncHandler(async (req, res) => {
  const [classes, departments, subjects] = await Promise.all([
    SchoolClass.find({ isActive: true })
      .select("_id name level hasDepartments")
      .sort({ name: 1 })
      .lean(),

    Department.find({ isActive: true })
      .select("_id name code")
      .sort({ name: 1 })
      .lean(),

    Subject.find({ isActive: true })
      .select("_id name code")
      .sort({ name: 1 })
      .lean(),
  ]);

  return res.status(200).json({
    success: true,
    options: {
      classes,
      departments,
      subjects,
    },
  });
});

/*
|--------------------------------------------------------------------------
| GET CLASS-SUBJECT ALLOCATIONS
|--------------------------------------------------------------------------
*/

exports.getClassSubjectAllocations = asyncHandler(async (req, res) => {
  const requestedPage = Number(req.query.page);
  const requestedLimit = Number(req.query.limit);

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 20;

  const status =
    typeof req.query.status === "string" ? req.query.status : "active";

  const filter = {};

  if (status === "active") {
    filter.isActive = true;
  } else if (status === "inactive") {
    filter.isActive = false;
  } else if (status !== "all") {
    return res.status(400).json({
      success: false,
      message: "Status must be active, inactive, or all.",
    });
  }

  const filters = [
    ["classId", "schoolClass"],
    ["subjectId", "subject"],
  ];

  for (const [queryField, databaseField] of filters) {
    const value = req.query[queryField];

    if (value !== undefined) {
      if (typeof value !== "string" || !validateObjectId(value)) {
        return sendInvalidId(res, queryField);
      }

      filter[databaseField] = value;
    }
  }

  if (req.query.departmentId !== undefined) {
    if (req.query.departmentId === "none") {
      filter.department = null;
    } else {
      if (
        typeof req.query.departmentId !== "string" ||
        !validateObjectId(req.query.departmentId)
      ) {
        return sendInvalidId(res, "department");
      }

      filter.department = req.query.departmentId;
    }
  }

  for (const [queryField, databaseField] of filters) {
    const value = req.query[queryField];

    if (value !== undefined) {
      if (typeof value !== "string" || !validateObjectId(value)) {
        return sendInvalidId(res, queryField);
      }

      filter[databaseField] = value;
    }
  }

  // Explicitly filter junior allocations with no department.
  if (req.query.departmentId === "none") {
    filter.department = null;
  }

  const skip = (page - 1) * limit;

  const [allocations, totalAllocations] = await Promise.all([
    ClassSubjectAllocation.find(filter)
      .populate("schoolClass", "name level hasDepartments")
      .populate("department", "name code")
      .populate("subject", "name code")
      .populate("createdBy", "fullName")
      .populate("updatedBy", "fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    ClassSubjectAllocation.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    allocations,
    pagination: {
      currentPage: page,
      limit,
      totalAllocations,
      totalPages: Math.ceil(totalAllocations / limit),
    },
  });
});

/*
|--------------------------------------------------------------------------
| CREATE CLASS-SUBJECT ALLOCATION
|--------------------------------------------------------------------------
*/

exports.createClassSubjectAllocation = asyncHandler(async (req, res) => {
  const { schoolClass, department, subject } = req.body;

  if (
    typeof schoolClass !== "string" ||
    !schoolClass.trim() ||
    typeof subject !== "string" ||
    !subject.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Class and subject are required.",
    });
  }

  if (!validateObjectId(schoolClass)) {
    return sendInvalidId(res, "class");
  }

  if (!validateObjectId(subject)) {
    return sendInvalidId(res, "subject");
  }

  if (
    department !== undefined &&
    department !== null &&
    department !== "" &&
    (typeof department !== "string" || !validateObjectId(department))
  ) {
    return sendInvalidId(res, "department");
  }

  const [selectedClass, selectedSubject] = await Promise.all([
    SchoolClass.findById(schoolClass),
    Subject.findById(subject),
  ]);

  if (!selectedClass || !selectedClass.isActive) {
    return res.status(404).json({
      success: false,
      message: "Selected class does not exist or is inactive.",
    });
  }

  if (!selectedSubject || !selectedSubject.isActive) {
    return res.status(404).json({
      success: false,
      message: "Selected subject does not exist or is inactive.",
    });
  }

  let selectedDepartment = null;

  if (department) {
    selectedDepartment = await Department.findById(department);

    if (!selectedDepartment || !selectedDepartment.isActive) {
      return res.status(404).json({
        success: false,
        message: "Selected department does not exist or is inactive.",
      });
    }
  }

  if (selectedClass.hasDepartments && !selectedDepartment) {
    return res.status(400).json({
      success: false,
      message: "A department is required for senior classes.",
    });
  }

  if (!selectedClass.hasDepartments && selectedDepartment) {
    return res.status(400).json({
      success: false,
      message: "Junior classes cannot have a department.",
    });
  }

  let allocation;

  try {
    allocation = await ClassSubjectAllocation.create({
      schoolClass: selectedClass._id,
      department: selectedDepartment?._id || null,
      subject: selectedSubject._id,
      isActive: true,
      createdBy: req.admin._id,
      updatedBy: req.admin._id,
    });
  } catch (error) {
    if (handleDuplicateError(error, res)) return;

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  }

  await createAuditLog({
    user: req.admin._id,
    action: "CREATE",
    module: "CLASS_SUBJECT_ALLOCATION",
    description: `${req.admin.fullName} allocated ${selectedSubject.name} to ${selectedClass.name}${selectedDepartment ? ` (${selectedDepartment.name})` : ""}.`,
    req,
  });

  const populatedAllocation = await ClassSubjectAllocation.findById(
    allocation._id,
  )
    .populate("schoolClass", "name level hasDepartments")
    .populate("department", "name code")
    .populate("subject", "name code")
    .lean();

  return res.status(201).json({
    success: true,
    message: "Subject allocated to class successfully.",
    allocation: populatedAllocation,
  });
});

/*
|--------------------------------------------------------------------------
| ACTIVATE / DEACTIVATE ALLOCATION
|--------------------------------------------------------------------------
|
| Deactivation does not delete the allocation or any teacher assignments
| associated with it.
|
*/

exports.updateClassSubjectAllocationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (!validateObjectId(id)) {
    return sendInvalidId(res, "allocation");
  }

  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isActive must be either true or false.",
    });
  }

  const allocation = await ClassSubjectAllocation.findById(id)
    .populate("schoolClass", "name isActive")
    .populate("department", "name isActive")
    .populate("subject", "name isActive");

  if (!allocation) {
    return res.status(404).json({
      success: false,
      message: "Subject allocation not found.",
    });
  }

  if (isActive) {
    if (
      !allocation.schoolClass?.isActive ||
      !allocation.subject?.isActive ||
      (allocation.department && !allocation.department.isActive)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot activate this allocation while its class, subject, or department is inactive.",
      });
    }
  }

  if (allocation.isActive === isActive) {
    return res.status(200).json({
      success: true,
      message: `Subject allocation is already ${isActive ? "active" : "inactive"}.`,
      allocation,
    });
  }

  allocation.isActive = isActive;
  allocation.updatedBy = req.admin._id;

  await allocation.save();

  await createAuditLog({
    user: req.admin._id,
    action: isActive ? "ACTIVATE" : "DEACTIVATE",
    module: "CLASS_SUBJECT_ALLOCATION",
    description: `${req.admin.fullName} ${isActive ? "activated" : "deactivated"} the ${allocation.subject.name} allocation for ${allocation.schoolClass.name}.`,
    req,
  });

  return res.status(200).json({
    success: true,
    message: `Subject allocation ${isActive ? "activated" : "deactivated"} successfully.`,
    allocation,
  });
});
