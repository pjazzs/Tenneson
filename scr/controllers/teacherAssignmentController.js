const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const TeacherAssignment = require("../models/TeacherAssignment");
const Teacher = require("../models/Teacher");
const ClassSubjectAllocation = require("../models/ClassSubjectAllocation");
const AcademicSession = require("../models/AcademicSession");

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

  res.status(409).json({
    success: false,
    message:
      "This teacher has already been assigned to this subject allocation for the selected academic session.",
  });

  return true;
};

const populateAssignment = (query) => {
  return query
    .populate("teacher", "fullName email employeeId isActive")
    .populate({
      path: "allocation",
      populate: [
        {
          path: "schoolClass",
          select: "name level hasDepartments",
        },
        {
          path: "department",
          select: "name code",
        },
        {
          path: "subject",
          select: "name code",
        },
      ],
    })
    .populate("academicSession", "name isActive")
    .populate("assignedBy", "fullName")
    .populate("updatedBy", "fullName");
};

/*
|--------------------------------------------------------------------------
| ASSIGNMENT OPTIONS
|--------------------------------------------------------------------------
|
| Returns the records required by the assignment form.
| Only active teachers and active subject allocations can receive
| new assignments. All academic sessions remain selectable.
|
*/

exports.getTeacherAssignmentOptions = asyncHandler(async (req, res) => {
  const [teachers, academicSessions, allocations] = await Promise.all([
    Teacher.find({ isActive: true })
      .select("_id fullName email employeeId")
      .sort({ fullName: 1 })
      .lean(),

    AcademicSession.find({})
      .select("_id name isActive")
      .sort({ name: -1 })
      .lean(),

    ClassSubjectAllocation.find({ isActive: true })
      .populate("schoolClass", "name level hasDepartments")
      .populate("department", "name code")
      .populate("subject", "name code")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  return res.status(200).json({
    success: true,
    options: {
      teachers,
      academicSessions,
      allocations,
    },
  });
});

/*
|--------------------------------------------------------------------------
| GET TEACHER ASSIGNMENTS
|--------------------------------------------------------------------------
*/

exports.getTeacherAssignments = asyncHandler(async (req, res) => {
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
    ["teacherId", "teacher"],
    ["allocationId", "allocation"],
    ["academicSessionId", "academicSession"],
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

  const skip = (page - 1) * limit;

  const [assignments, totalAssignments] = await Promise.all([
    populateAssignment(
      TeacherAssignment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
    ).lean(),

    TeacherAssignment.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    assignments,
    pagination: {
      currentPage: page,
      limit,
      totalAssignments,
      totalPages: Math.ceil(totalAssignments / limit),
    },
  });
});

/*
|--------------------------------------------------------------------------
| CREATE TEACHER ASSIGNMENT
|--------------------------------------------------------------------------
*/

exports.createTeacherAssignment = asyncHandler(async (req, res) => {
  const { teacher, allocation, academicSession } = req.body;

  if (
    typeof teacher !== "string" ||
    !teacher.trim() ||
    typeof allocation !== "string" ||
    !allocation.trim() ||
    typeof academicSession !== "string" ||
    !academicSession.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Teacher, subject allocation and academic session are required.",
    });
  }

  if (!validateObjectId(teacher)) {
    return sendInvalidId(res, "teacher");
  }

  if (!validateObjectId(allocation)) {
    return sendInvalidId(res, "allocation");
  }

  if (!validateObjectId(academicSession)) {
    return sendInvalidId(res, "academic session");
  }

  const [selectedTeacher, selectedAllocation, selectedSession] =
    await Promise.all([
      Teacher.findById(teacher),
      ClassSubjectAllocation.findById(allocation)
        .populate("schoolClass", "name isActive")
        .populate("department", "name isActive")
        .populate("subject", "name isActive"),
      AcademicSession.findById(academicSession),
    ]);

  if (!selectedTeacher || !selectedTeacher.isActive) {
    return res.status(404).json({
      success: false,
      message: "Selected teacher does not exist or is inactive.",
    });
  }

  if (!selectedAllocation || !selectedAllocation.isActive) {
    return res.status(404).json({
      success: false,
      message: "Selected subject allocation does not exist or is inactive.",
    });
  }

  if (!selectedSession) {
    return res.status(404).json({
      success: false,
      message: "Selected academic session does not exist.",
    });
  }

  // Prevent assigning a subject whose underlying records are inactive.
  if (
    !selectedAllocation.schoolClass?.isActive ||
    !selectedAllocation.subject?.isActive ||
    (selectedAllocation.department && !selectedAllocation.department.isActive)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "The class, subject or department linked to this allocation is inactive.",
    });
  }

  let assignment;

  try {
    assignment = await TeacherAssignment.create({
      teacher: selectedTeacher._id,
      allocation: selectedAllocation._id,
      academicSession: selectedSession._id,
      isActive: true,
      assignedBy: req.admin._id,
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
    module: "TEACHER_ASSIGNMENT",
    description:
      `${req.admin.fullName} assigned ${selectedTeacher.fullName} ` +
      `to teach ${selectedAllocation.subject.name} in ` +
      `${selectedAllocation.schoolClass.name}` +
      `${
        selectedAllocation.department
          ? ` (${selectedAllocation.department.name})`
          : ""
      } for ${selectedSession.name}.`,
    req,
  });

  const populatedAssignment = await populateAssignment(
    TeacherAssignment.findById(assignment._id),
  ).lean();

  return res.status(201).json({
    success: true,
    message: "Teacher assigned successfully.",
    assignment: populatedAssignment,
  });
});

/*
|--------------------------------------------------------------------------
| ACTIVATE / DEACTIVATE TEACHER ASSIGNMENT
|--------------------------------------------------------------------------
*/

exports.updateTeacherAssignmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (!validateObjectId(id)) {
    return sendInvalidId(res, "assignment");
  }

  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isActive must be either true or false.",
    });
  }

  const assignment = await TeacherAssignment.findById(id)
    .populate("teacher", "fullName isActive")
    .populate({
      path: "allocation",
      populate: [
        { path: "schoolClass", select: "name isActive" },
        { path: "department", select: "name isActive" },
        { path: "subject", select: "name isActive" },
      ],
    })
    .populate("academicSession", "name");

  if (!assignment) {
    return res.status(404).json({
      success: false,
      message: "Teacher assignment not found.",
    });
  }

  if (assignment.isActive === isActive) {
    return res.status(200).json({
      success: true,
      message: `Assignment is already ${isActive ? "active" : "inactive"}.`,
      assignment,
    });
  }

  if (isActive) {
    if (!assignment.teacher?.isActive) {
      return res.status(400).json({
        success: false,
        message: "This teacher is inactive. Activate the teacher first.",
      });
    }

    if (
      !assignment.allocation?.isActive ||
      !assignment.allocation.schoolClass?.isActive ||
      !assignment.allocation.subject?.isActive ||
      (assignment.allocation.department &&
        !assignment.allocation.department.isActive)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "The subject allocation or one of its linked records is inactive.",
      });
    }
  }

  assignment.isActive = isActive;
  assignment.updatedBy = req.admin._id;

  await assignment.save();

  await createAuditLog({
    user: req.admin._id,
    action: isActive ? "ACTIVATE" : "DEACTIVATE",
    module: "TEACHER_ASSIGNMENT",
    description:
      `${req.admin.fullName} ${isActive ? "activated" : "deactivated"} ` +
      `a teacher assignment for ${assignment.teacher?.fullName || "a teacher"}.`,
    req,
  });

  const populatedAssignment = await populateAssignment(
    TeacherAssignment.findById(assignment._id),
  ).lean();

  return res.status(200).json({
    success: true,
    message: `Teacher assignment ${isActive ? "activated" : "deactivated"} successfully.`,
    assignment: populatedAssignment,
  });
});
