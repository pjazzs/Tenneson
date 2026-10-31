const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const TeacherAssignment = require("../models/TeacherAssignment");
const Teacher = require("../models/Teacher");
const ClassSubjectAllocation = require("../models/ClassSubjectAllocation");
const AcademicSession = require("../models/AcademicSession");

const createAuditLog = require("../utils/createAuditLog");
const SubjectResultResponsibility = require("../models/SubjectResultResponsibility");
const SubjectResultSubmission = require("../models/SubjectResultSubmission");
const SchoolClass = require("../models/SchoolClass");
const Department = require("../models/Department");
const Subject = require("../models/Subject");

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

/*
|--------------------------------------------------------------------------
| GET SUBJECT RESULT RESPONSIBILITIES
|--------------------------------------------------------------------------
|
| Returns designated result teachers for one academic session and term.
|
| GET /teacher-assignments/result-responsibilities
| Query: academicSessionId, term
|
*/

exports.getSubjectResultResponsibilities = asyncHandler(async (req, res) => {
  const { academicSessionId, term } = req.query;

  if (
    typeof academicSessionId !== "string" ||
    !validateObjectId(academicSessionId)
  ) {
    return sendInvalidId(res, "academic session");
  }

  if (!["first", "second", "third"].includes(term)) {
    return res.status(400).json({
      success: false,
      message: "Term must be first, second or third.",
    });
  }

  const session = await AcademicSession.findById(academicSessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      message: "Academic session not found.",
    });
  }

  const responsibilities = await SubjectResultResponsibility.find({
    academicSession: academicSessionId,
    term,
  })
    .populate("academicSession", "name")
    .populate({
      path: "allocation",
      populate: [
        {
          path: "schoolClass",
          select: "name level",
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
    .populate({
      path: "teacherAssignment",
      populate: {
        path: "teacher",
        select: "fullName email employeeId isActive",
      },
    })
    .populate("assignedBy", "fullName")
    .populate("updatedBy", "fullName")
    .sort({ createdAt: -1 })
    .lean();

  return res.status(200).json({
    success: true,
    academicSession: {
      _id: session._id,
      name: session.name,
    },
    term,
    totalResponsibilities: responsibilities.length,
    responsibilities,
  });
});

/*
|--------------------------------------------------------------------------
| DESIGNATE / CHANGE SUBJECT RESULT TEACHER
|--------------------------------------------------------------------------
|
| PUT /teacher-assignments/result-responsibilities/:allocationId
|
| Body:
| {
|   academicSession: "...",
|   term: "first",
|   teacherAssignment: "...",
|   reason: "Optional reassignment reason"
| }
|
*/

exports.setSubjectResultResponsibility = asyncHandler(async (req, res) => {
  const { allocationId } = req.params;
  const { academicSession, term, teacherAssignment, reason = "" } = req.body;

  // ---------------------------------------------------------
  // 1. BASIC INPUT VALIDATION
  // ---------------------------------------------------------

  if (!validateObjectId(allocationId)) {
    return sendInvalidId(res, "subject allocation");
  }

  if (
    typeof academicSession !== "string" ||
    !validateObjectId(academicSession)
  ) {
    return sendInvalidId(res, "academic session");
  }

  if (
    typeof teacherAssignment !== "string" ||
    !validateObjectId(teacherAssignment)
  ) {
    return sendInvalidId(res, "teacher assignment");
  }

  if (!["first", "second", "third"].includes(term)) {
    return res.status(400).json({
      success: false,
      message: "Term must be first, second or third.",
    });
  }

  if (typeof reason !== "string") {
    return res.status(400).json({
      success: false,
      message: "Reassignment reason must be a string.",
    });
  }

  // ---------------------------------------------------------
  // 2. TRANSACTION STATE
  // ---------------------------------------------------------

  const dbSession = await mongoose.startSession();

  let responsibilityId;
  let ownerChanged = false;
  let wasCreated = false;

  try {
    await dbSession.withTransaction(async () => {
      // -----------------------------------------------------
      // 3. FETCH RECORDS SEQUENTIALLY INSIDE TRANSACTION
      // -----------------------------------------------------

      // Do not use Promise.all() for operations sharing
      // the same MongoDB transaction session.

      const allocation =
        await ClassSubjectAllocation.findById(allocationId).session(dbSession);

      const session =
        await AcademicSession.findById(academicSession).session(dbSession);

      const assignment =
        await TeacherAssignment.findById(teacherAssignment).session(dbSession);

      // -----------------------------------------------------
      // 4. VALIDATE RECORD EXISTENCE
      // -----------------------------------------------------

      if (!allocation) {
        const error = new Error("Subject allocation not found.");
        error.statusCode = 404;
        throw error;
      }

      if (!session) {
        const error = new Error("Academic session not found.");
        error.statusCode = 404;
        throw error;
      }

      if (!assignment) {
        const error = new Error("Teacher assignment not found.");
        error.statusCode = 404;
        throw error;
      }

      // -----------------------------------------------------
      // 5. FETCH REFERENCED RECORDS SEQUENTIALLY
      // -----------------------------------------------------

      const schoolClass = await SchoolClass.findById(allocation.schoolClass)
        .select("name isActive")
        .session(dbSession);

      const subject = await Subject.findById(allocation.subject)
        .select("name isActive")
        .session(dbSession);

      const department = allocation.department
        ? await Department.findById(allocation.department)
            .select("name isActive")
            .session(dbSession)
        : null;

      const assignedTeacher = await Teacher.findById(assignment.teacher)
        .select("fullName email isActive")
        .session(dbSession);

      // -----------------------------------------------------
      // 6. VALIDATE REFERENCED RECORDS
      // -----------------------------------------------------

      if (!schoolClass) {
        const error = new Error("The allocated class was not found.");
        error.statusCode = 400;
        throw error;
      }

      if (!subject) {
        const error = new Error("The allocated subject was not found.");
        error.statusCode = 400;
        throw error;
      }

      if (allocation.department && !department) {
        const error = new Error("The allocated department was not found.");
        error.statusCode = 400;
        throw error;
      }

      if (!assignedTeacher) {
        const error = new Error("The assigned teacher was not found.");
        error.statusCode = 400;
        throw error;
      }

      // -----------------------------------------------------
      // 7. VALIDATE TERM
      // -----------------------------------------------------

      const termExists = session.terms?.some(
        (sessionTerm) => sessionTerm.key === term,
      );

      if (!termExists) {
        const error = new Error(
          "The selected term does not exist in this academic session.",
        );
        error.statusCode = 400;
        throw error;
      }

      // -----------------------------------------------------
      // 8. VALIDATE TEACHER ASSIGNMENT OWNERSHIP
      // -----------------------------------------------------

      if (
        assignment.allocation.toString() !== allocationId ||
        assignment.academicSession.toString() !== academicSession
      ) {
        const error = new Error(
          "The selected teacher assignment does not belong to this allocation and academic session.",
        );
        error.statusCode = 400;
        throw error;
      }

      // -----------------------------------------------------
      // 9. VALIDATE ACTIVE STATUS
      // -----------------------------------------------------

      if (!assignment.isActive) {
        const error = new Error("The selected teacher assignment is inactive.");
        error.statusCode = 400;
        throw error;
      }

      if (!assignedTeacher.isActive) {
        const error = new Error("The selected teacher is inactive.");
        error.statusCode = 400;
        throw error;
      }

      if (
        !allocation.isActive ||
        !schoolClass.isActive ||
        !subject.isActive ||
        (department && !department.isActive)
      ) {
        const error = new Error(
          "The allocation, class, subject or department is inactive.",
        );
        error.statusCode = 400;
        throw error;
      }

      // -----------------------------------------------------
      // 10. LOAD CURRENT RESPONSIBILITY
      // -----------------------------------------------------

      let responsibility = await SubjectResultResponsibility.findOne({
        allocation: allocationId,
        academicSession,
        term,
      }).session(dbSession);

      const isNewResponsibility = !responsibility;

      // -----------------------------------------------------
      // 11. CHECK WHETHER THE OWNER IS CHANGING
      // -----------------------------------------------------

      const previousAssignment = responsibility
        ? responsibility.teacherAssignment.toString()
        : null;

      const newAssignment = assignment._id.toString();

      const isChangingOwner =
        !responsibility || previousAssignment !== newAssignment;

      // -----------------------------------------------------
      // 12. PREVENT REASSIGNMENT AFTER SUBMISSION
      // -----------------------------------------------------

      if (isChangingOwner) {
        const existingSubmission = await SubjectResultSubmission.findOne({
          allocation: allocationId,
          academicSession,
          term,
        })
          .select("_id status")
          .session(dbSession);

        if (existingSubmission?.status === "submitted") {
          const error = new Error(
            "This subject result has already been submitted. Reassignment is blocked. Use the approved result correction or reopening process instead.",
          );

          error.statusCode = 409;
          throw error;
        }
      }

      // -----------------------------------------------------
      // 13. CREATE OR UPDATE RESPONSIBILITY
      // -----------------------------------------------------

      if (!responsibility) {
        responsibility = new SubjectResultResponsibility({
          allocation: allocationId,
          academicSession,
          term,
          teacherAssignment: assignment._id,
          assignedBy: req.admin._id,
          updatedBy: req.admin._id,
        });

        wasCreated = true;
        ownerChanged = true;
      } else if (isChangingOwner) {
        // Preserve the previous owner in assignment history.
        responsibility.assignmentHistory.push({
          teacherAssignment: responsibility.teacherAssignment,
          changedBy: req.admin._id,
          changedAt: new Date(),
          reason: reason.trim(),
        });

        responsibility.teacherAssignment = assignment._id;

        // Increment the shared concurrency version.
        responsibility.writeVersion = (responsibility.writeVersion || 0) + 1;

        responsibility.updatedBy = req.admin._id;

        ownerChanged = true;
      }

      // Same-owner selection must not create unnecessary history
      // or increment writeVersion.
      if (isNewResponsibility) {
        responsibility.updatedBy = req.admin._id;
      }

      // -----------------------------------------------------
      // 14. SAVE RESPONSIBILITY
      // -----------------------------------------------------

      responsibilityId = responsibility._id;

      await responsibility.save({
        session: dbSession,
      });
    });
  } catch (error) {
    console.error("SET SUBJECT RESULT RESPONSIBILITY ERROR:", error);

    // -------------------------------------------------------
    // 15. HANDLE TRANSACTION ERRORS
    // -------------------------------------------------------

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A result responsibility already exists for this allocation, session and term. Please refresh and try again.",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.hasErrorLabel?.("TransientTransactionError") ||
      error.hasErrorLabel?.("UnknownTransactionCommitResult") ||
      error.code === 112 ||
      error.code === 251
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This responsibility was modified by another operation. Please refresh and try again.",
      });
    }

    throw error;
  } finally {
    await dbSession.endSession();
  }

  // ---------------------------------------------------------
  // 16. AUDIT LOG AFTER SUCCESSFUL TRANSACTION
  // ---------------------------------------------------------

  if (ownerChanged) {
    const allocation = await ClassSubjectAllocation.findById(allocationId)
      .populate("schoolClass", "name")
      .populate("department", "name")
      .populate("subject", "name");

    const session = await AcademicSession.findById(academicSession);

    const assignment = await TeacherAssignment.findById(
      teacherAssignment,
    ).populate("teacher", "fullName");

    await createAuditLog({
      user: req.admin._id,
      action: wasCreated ? "CREATE" : "UPDATE",
      module: "SUBJECT_RESULT_RESPONSIBILITY",
      description:
        `${req.admin.fullName} designated ${assignment.teacher.fullName} ` +
        `to submit ${allocation.subject.name} results for ` +
        `${allocation.schoolClass.name}` +
        `${
          allocation.department ? ` (${allocation.department.name})` : ""
        }, ${session.name}, ${term} term.`,
      req,
    });
  }

  // ---------------------------------------------------------
  // 17. FETCH POPULATED RESPONSE
  // ---------------------------------------------------------

  const populatedResponsibility = await SubjectResultResponsibility.findById(
    responsibilityId,
  )
    .populate("academicSession", "name")
    .populate({
      path: "allocation",
      populate: [
        { path: "schoolClass", select: "name level" },
        { path: "department", select: "name code" },
        { path: "subject", select: "name code" },
      ],
    })
    .populate({
      path: "teacherAssignment",
      populate: {
        path: "teacher",
        select: "fullName email employeeId isActive",
      },
    })
    .populate("assignedBy", "fullName")
    .populate("updatedBy", "fullName");

  // ---------------------------------------------------------
  // 18. RETURN RESPONSE
  // ---------------------------------------------------------

  return res.status(200).json({
    success: true,
    message: ownerChanged
      ? "Subject result teacher designated successfully."
      : "This teacher is already designated for this subject result.",
    responsibility: populatedResponsibility,
  });
});
