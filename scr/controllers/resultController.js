const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");

const Student = require("../models/student");
const AcademicSession = require("../models/AcademicSession");
const Subject = require("../models/Subject");
const Result = require("../models/Result");

const {
  calculateResult,
  validateAttendance,
} = require("../services/resultCalculationService");

const createAuditLog = require("../utils/createAuditLog");
const logActivity = require("../utils/logActivity");

const VALID_TERMS = ["first", "second", "third"];

const VALID_STATUSES = ["draft", "submitted", "approved", "published"];

const VALID_PRINCIPAL_DECISIONS = ["pending", "promoted", "repeat"];

const APPROVED_PREVIOUS_STATUSES = ["approved", "published"];

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

const parsePositiveInteger = (value, fallback, max = 100) => {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, max);
};

const getAdminId = (req) => {
  return req.admin?._id || null;
};

const getStudentAuthId = (req) => {
  /*
   * Student authentication is intentionally separate from
   * admin authentication.
   *
   * Never use req.params.studentId for student authorization.
   */
  return req.student?._id || req.student?.id || null;
};

const sendError = (res, statusCode, message) => {
  return res.status(statusCode).json({
    success: false,
    message,
  });
};

const createControllerError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/*
|--------------------------------------------------------------------------
| AUDIT LOGGING
|--------------------------------------------------------------------------
*/

const createResultAuditLog = async ({ req, action, description }) => {
  try {
    await createAuditLog({
      user: getAdminId(req),
      action,
      module: "RESULT",
      description,
      req,
    });
  } catch (error) {
    console.error("Result audit log error:", error.message);
  }
};

const createResultActivityLog = async ({
  req,
  action,
  studentId = null,
  details = "",
}) => {
  try {
    const adminId = getAdminId(req);

    if (!adminId) {
      return;
    }

    await logActivity({
      adminId,
      action,
      studentId,
      details,
    });
  } catch (error) {
    /*
     * Activity logging must not cause an otherwise
     * successful result operation to fail.
     */
    console.error("Result activity log error:", error.message);
  }
};

/*
|--------------------------------------------------------------------------
| RESOLVE STUDENT
|--------------------------------------------------------------------------
*/

const resolveStudent = async (studentId) => {
  if (!studentId || typeof studentId !== "string") {
    throw createControllerError("Student ID is required.", 400);
  }

  const normalizedStudentId = studentId.trim().toUpperCase();

  const student = await Student.findOne({
    studentId: normalizedStudentId,
  });

  if (!student) {
    throw createControllerError("Student not found.", 404);
  }

  return student;
};

/*
|--------------------------------------------------------------------------
| RESOLVE ACADEMIC SESSION
|--------------------------------------------------------------------------
*/

const resolveAcademicSession = async (academicSessionId) => {
  if (!academicSessionId) {
    throw createControllerError("Academic session ID is required.", 400);
  }

  if (!isValidObjectId(academicSessionId)) {
    throw createControllerError("Invalid academic session ID.", 400);
  }

  const academicSession = await AcademicSession.findById(academicSessionId);

  if (!academicSession) {
    throw createControllerError("Academic session not found.", 404);
  }

  return academicSession;
};

/*
|--------------------------------------------------------------------------
| RESOLVE TERM CONFIGURATION
|--------------------------------------------------------------------------
*/

const resolveTermConfiguration = (academicSession, term) => {
  if (!VALID_TERMS.includes(term)) {
    throw createControllerError("Term must be first, second, or third.", 400);
  }

  const configuration = academicSession.terms?.find(
    (item) => item.key === term,
  );

  if (!configuration) {
    throw createControllerError(
      `The ${term} term is not configured for this academic session.`,
      400,
    );
  }

  return configuration;
};

/*
|--------------------------------------------------------------------------
| BUILD TERM DATES
|--------------------------------------------------------------------------
*/

const buildTermDates = (termConfiguration) => {
  if (!termConfiguration) {
    return {
      closingDate: null,
      resumptionDate: null,
    };
  }

  return {
    closingDate: termConfiguration.closingDate || null,
    resumptionDate: termConfiguration.resumptionDate || null,
  };
};

/*
|--------------------------------------------------------------------------
| NORMALIZE ATTENDANCE
|--------------------------------------------------------------------------
*/

const normalizeAttendance = (attendance = {}) => {
  return {
    daysSchoolOpened: attendance?.daysSchoolOpened ?? 0,

    daysPresent: attendance?.daysPresent ?? 0,

    daysAbsent: attendance?.daysAbsent ?? 0,
  };
};

/*
|--------------------------------------------------------------------------
| NORMALIZE CONDUCT
|--------------------------------------------------------------------------
*/

const normalizeConduct = (conduct) => {
  /*
   * Current validator/model uses:
   * "good" | "bad"
   *
   * The object fallback below is retained only to
   * tolerate older stored payloads.
   */
  if (typeof conduct === "string") {
    return conduct;
  }

  if (conduct && typeof conduct === "object") {
    if (typeof conduct.value === "string") {
      return conduct.value;
    }

    if (typeof conduct.remark === "string") {
      return conduct.remark;
    }
  }

  return "good";
};

/*
|--------------------------------------------------------------------------
| CLEAR CALCULATED FIELDS
|--------------------------------------------------------------------------
*/

const clearCalculatedFields = (subjectResults = []) => {
  return subjectResults.map((subject) => ({
    subject: subject.subject,
    subjectId: subject.subjectId,
    subjectName: subject.subjectName || "",
    subjectCode: subject.subjectCode || "",
    offered: Boolean(subject.offered),

    ca1: subject.offered ? (subject.ca1 ?? null) : null,

    ca2: subject.offered ? (subject.ca2 ?? null) : null,

    exam: subject.offered ? (subject.exam ?? null) : null,

    total: null,

    firstTerm: subject.firstTerm || {
      offered: false,
      total: null,
    },

    secondTerm: subject.secondTerm || {
      offered: false,
      total: null,
    },

    cumulativeScore: null,
    weightedAverage: null,
    grade: null,
    remark: "",

    teacherComment: subject.teacherComment || "",
  }));
};

/*
|--------------------------------------------------------------------------
| SUBJECT SCORE HELPERS
|--------------------------------------------------------------------------
*/

const hasCompleteSubjectScores = (subjectResults = []) => {
  const offeredSubjects = subjectResults.filter((subject) =>
    Boolean(subject.offered),
  );

  if (offeredSubjects.length === 0) {
    return false;
  }

  return offeredSubjects.every(
    (subject) =>
      Number.isFinite(subject.ca1) &&
      Number.isFinite(subject.ca2) &&
      Number.isFinite(subject.exam),
  );
};

const validateCompleteSubjectScore = (subject) => {
  if (!subject) {
    throw createControllerError("Invalid subject result.", 400);
  }

  if (!subject.offered) {
    return;
  }

  if (!Number.isFinite(subject.ca1)) {
    throw createControllerError(
      `${subject.subjectName || "Subject"} CA1 score is required.`,
      400,
    );
  }

  if (!Number.isFinite(subject.ca2)) {
    throw createControllerError(
      `${subject.subjectName || "Subject"} CA2 score is required.`,
      400,
    );
  }

  if (!Number.isFinite(subject.exam)) {
    throw createControllerError(
      `${subject.subjectName || "Subject"} examination score is required.`,
      400,
    );
  }

  if (subject.ca1 < 0 || subject.ca1 > 20) {
    throw createControllerError(
      `${subject.subjectName || "Subject"} CA1 must be between 0 and 20.`,
      400,
    );
  }

  if (subject.ca2 < 0 || subject.ca2 > 10) {
    throw createControllerError(
      `${subject.subjectName || "Subject"} CA2 must be between 0 and 10.`,
      400,
    );
  }

  if (subject.exam < 0 || subject.exam > 70) {
    throw createControllerError(
      `${subject.subjectName || "Subject"} examination score must be between 0 and 70.`,
      400,
    );
  }
};

/*
|--------------------------------------------------------------------------
| RESOLVE SUBJECTS
|--------------------------------------------------------------------------
|
| Subject names/codes are taken from the authoritative Subject collection.
| We do not trust subject names supplied by the browser.
|
|--------------------------------------------------------------------------
*/

const resolveSubjects = async (subjectResults) => {
  if (!Array.isArray(subjectResults) || subjectResults.length === 0) {
    throw createControllerError(
      "At least one subject result is required.",
      400,
    );
  }

  const subjectIds = subjectResults.map((subject) => subject.subjectId);

  const uniqueSubjectIds = [...new Set(subjectIds.map((id) => String(id)))];

  if (uniqueSubjectIds.length !== subjectResults.length) {
    throw createControllerError(
      "A subject cannot appear more than once in a result.",
      400,
    );
  }

  for (const subjectId of uniqueSubjectIds) {
    if (!isValidObjectId(subjectId)) {
      throw createControllerError("One or more subject IDs are invalid.", 400);
    }
  }

  const subjects = await Subject.find({
    _id: {
      $in: uniqueSubjectIds,
    },
  }).lean();

  if (subjects.length !== uniqueSubjectIds.length) {
    throw createControllerError(
      "One or more selected subjects were not found.",
      404,
    );
  }

  const subjectMap = new Map(
    subjects.map((subject) => [subject._id.toString(), subject]),
  );

  return subjectResults.map((item) => {
    const subject = subjectMap.get(String(item.subjectId));

    if (!subject) {
      throw createControllerError(
        `Subject ${item.subjectId} was not found.`,
        404,
      );
    }

    return {
      subject: subject._id,
      subjectId: subject._id,

      subjectName: subject.name,

      subjectCode: subject.code || "",

      offered: Boolean(item.offered),

      ca1: item.offered ? (item.ca1 ?? null) : null,

      ca2: item.offered ? (item.ca2 ?? null) : null,

      exam: item.offered ? (item.exam ?? null) : null,

      teacherComment:
        typeof item.teacherComment === "string"
          ? item.teacherComment.trim()
          : "",
    };
  });
};

/*
|--------------------------------------------------------------------------
| GET PREVIOUS TERM RESULTS
|--------------------------------------------------------------------------
|
| Only approved/published previous-term results can contribute to
| Third Term cumulative calculations.
|
|--------------------------------------------------------------------------
*/

const getPreviousTermResults = async ({ studentId, academicSessionId }) => {
  const [firstTermResult, secondTermResult] = await Promise.all([
    Result.findOne({
      student: studentId,
      academicSession: academicSessionId,
      term: "first",
      status: {
        $in: APPROVED_PREVIOUS_STATUSES,
      },
    }).lean(),

    Result.findOne({
      student: studentId,
      academicSession: academicSessionId,
      term: "second",
      status: {
        $in: APPROVED_PREVIOUS_STATUSES,
      },
    }).lean(),
  ]);

  return {
    firstTermResults: firstTermResult?.subjectResults || [],

    secondTermResults: secondTermResult?.subjectResults || [],

    firstTermResult,
    secondTermResult,
  };
};

/*
|--------------------------------------------------------------------------
| CALCULATE RESULT DATA
|--------------------------------------------------------------------------
*/

const calculateResultData = async ({
  term,
  subjectResults,
  student,
  academicSession,
  requirePreviousTerms = false,
}) => {
  if (term === "third") {
    const previous = await getPreviousTermResults({
      studentId: student._id,
      academicSessionId: academicSession._id,
    });

    /*
     * Third Term final calculation requires
     * approved/published First and Second Term
     * results.
     */
    if (requirePreviousTerms && !previous.firstTermResult) {
      throw createControllerError(
        "Third Term requires an approved or published First Term result before it can be submitted.",
        400,
      );
    }

    if (requirePreviousTerms && !previous.secondTermResult) {
      throw createControllerError(
        "Third Term requires an approved or published Second Term result before it can be submitted.",
        400,
      );
    }

    return calculateResult({
      term,

      subjectResults,

      firstTermResults: previous.firstTermResults,

      secondTermResults: previous.secondTermResults,
    });
  }

  return calculateResult({
    term,
    subjectResults,
  });
};

/*
|--------------------------------------------------------------------------
| BUILD CALCULATED RESULT
|--------------------------------------------------------------------------
*/

const buildCalculatedResult = async ({
  term,
  subjectResults,
  student,
  academicSession,
  requirePreviousTerms = false,
}) => {
  if (!hasCompleteSubjectScores(subjectResults)) {
    throw createControllerError(
      "All offered subject scores must be completed before the result can be calculated.",
      400,
    );
  }

  subjectResults.forEach((subject) => {
    validateCompleteSubjectScore(subject);
  });

  return calculateResultData({
    term,

    subjectResults,

    student,

    academicSession,

    requirePreviousTerms,
  });
};

/*
|--------------------------------------------------------------------------
| BUILD DRAFT RESULT PAYLOAD
|--------------------------------------------------------------------------
|
| Drafts are intentionally allowed to contain incomplete
| academic scores.
|
| Calculated fields are populated only when all offered
| subject scores are complete.
|
|--------------------------------------------------------------------------
*/

const buildResultPayload = async ({
  body,
  student,
  academicSession,
  termConfiguration,
  requireCompleteCalculation = false,
  requirePreviousTerms = false,
}) => {
  const subjectResults = await resolveSubjects(body.subjectResults);

  const attendance = normalizeAttendance(body.attendance);

  /*
   * Attendance is validated when supplied,
   * but it is not required for an incomplete draft.
   */
  const hasAttendance =
    body.attendance !== undefined && body.attendance !== null;

  let validatedAttendance;

  if (hasAttendance) {
    try {
      validatedAttendance = validateAttendance(attendance);
    } catch (error) {
      throw createControllerError(error.message, 400);
    }
  } else {
    validatedAttendance = normalizeAttendance();
  }

  let calculated = null;

  /*
   * If all current-term scores are complete,
   * calculate the result.
   */
  if (hasCompleteSubjectScores(subjectResults)) {
    calculated = await buildCalculatedResult({
      term: body.term,

      subjectResults,

      student,

      academicSession,

      requirePreviousTerms,
    });
  } else if (requireCompleteCalculation) {
    throw createControllerError(
      "All offered subject scores must be completed before this operation.",
      400,
    );
  }

  /*
   * If calculation has not happened yet,
   * clear all calculated fields.
   */
  const finalSubjectResults =
    calculated?.subjectResults || clearCalculatedFields(subjectResults);

  const comments = {
    classTeacher:
      typeof body.comments?.classTeacher === "string"
        ? body.comments.classTeacher.trim()
        : "",

    principal: "",

    performance: calculated?.performanceComment || "",
  };

  return {
    student: student._id,

    academicSession: academicSession._id,

    term: body.term,

    /*
     * Snapshot the student's class at the
     * time the result is created.
     */
    currentClass: student.currentClass,

    subjectResults: finalSubjectResults,

    attendance: validatedAttendance,

    affectiveDomain: body.affectiveDomain || {},

    psychomotorDomain: body.psychomotorDomain || {},

    conduct: normalizeConduct(body.conduct),

    specialReport:
      typeof body.specialReport === "string" ? body.specialReport.trim() : "",

    sports: Array.isArray(body.sports) ? body.sports : [],

    clubs: Array.isArray(body.clubs) ? body.clubs : [],

    comments,

    termDates: buildTermDates(termConfiguration),

    totalScore: calculated?.totalScore || 0,

    totalObtainableMarks: calculated?.totalObtainableMarks || 0,

    overallPercentage: calculated?.overallPercentage || 0,

    performanceComment: calculated?.performanceComment || "",

    promotionStatus: calculated?.promotionStatus || "not_applicable",

    principalDecision: "pending",

    status: "draft",
  };
};

/*
|--------------------------------------------------------------------------
| VALIDATE COMPLETE ASSESSMENT
|--------------------------------------------------------------------------
|
| Used before submitting a result.
|
|--------------------------------------------------------------------------
*/

const validateCompleteAssessment = (result) => {
  /*
   * Attendance
   */
  if (
    !result.attendance ||
    typeof result.attendance.daysSchoolOpened !== "number"
  ) {
    throw createControllerError(
      "Attendance information is required before submission.",
      400,
    );
  }

  if (result.attendance.daysSchoolOpened < 1) {
    throw createControllerError(
      "Days school opened must be greater than zero before submission.",
      400,
    );
  }

  try {
    validateAttendance({
      daysSchoolOpened: result.attendance.daysSchoolOpened,

      daysPresent: result.attendance.daysPresent,

      daysAbsent: result.attendance.daysAbsent,
    });
  } catch (error) {
    throw createControllerError(error.message, 400);
  }

  /*
   * Affective domain
   */
  const affectiveFields = [
    "punctuality",
    "attentiveness",
    "neatness",
    "politeness",
    "reliability",
    "honesty",
    "initiative",
    "attitudeToWork",
  ];

  affectiveFields.forEach((field) => {
    const value = result.affectiveDomain?.[field];

    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 5
    ) {
      throw createControllerError(
        `Affective domain field "${field}" must be scored from 0 to 5.`,
        400,
      );
    }
  });

  /*
   * Psychomotor domain
   */
  const psychomotorFields = [
    "sportingActivities",
    "handWriting",
    "fluency",
    "drawingAndPainting",
    "musicalAbility",
  ];

  psychomotorFields.forEach((field) => {
    const value = result.psychomotorDomain?.[field];

    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > 5
    ) {
      throw createControllerError(
        `Psychomotor domain field "${field}" must be scored from 0 to 5.`,
        400,
      );
    }
  });

  /*
   * Class teacher comment
   */
  const classTeacherComment = result.comments?.classTeacher;

  if (typeof classTeacherComment !== "string" || !classTeacherComment.trim()) {
    throw createControllerError(
      "Class teacher comment is required before submission.",
      400,
    );
  }
};

/*
|--------------------------------------------------------------------------
| FIND RESULT
|--------------------------------------------------------------------------
*/

const findResultById = async (resultId) => {
  if (!resultId || !isValidObjectId(resultId)) {
    throw createControllerError("Invalid result ID.", 400);
  }

  const result = await Result.findById(resultId);

  if (!result) {
    throw createControllerError("Result not found.", 404);
  }

  return result;
};

/*
|--------------------------------------------------------------------------
| CREATE RESULT
|--------------------------------------------------------------------------
|
| POST /results
|
| Creates a new result as a draft.
|
|--------------------------------------------------------------------------
*/

exports.createResult = asyncHandler(async (req, res) => {
  try {
    const { studentId, academicSessionId, term } = req.body;

    /*
     * Resolve the student from the authoritative
     * Student collection.
     */
    const student = await resolveStudent(studentId);

    /*
     * Resolve the academic session.
     */
    const academicSession = await resolveAcademicSession(academicSessionId);

    /*
     * Resolve and validate the term
     * configuration.
     */
    const termConfiguration = resolveTermConfiguration(academicSession, term);

    /*
     * Prevent duplicate results for the
     * same student/session/term.
     */
    const existingResult = await Result.findOne({
      student: student._id,
      academicSession: academicSession._id,
      term,
    });

    if (existingResult) {
      return sendError(
        res,
        409,
        `A ${term} term result already exists for this student in the selected academic session.`,
      );
    }

    /*
     * Build the draft payload.
     *
     * We deliberately do NOT require complete
     * assessment data at draft creation.
     */
    const payload = await buildResultPayload({
      body: req.body,

      student,

      academicSession,

      termConfiguration,

      requireCompleteCalculation: false,

      requirePreviousTerms: false,
    });

    payload.createdBy = getAdminId(req);

    payload.updatedBy = getAdminId(req);

    const result = await Result.create(payload);

    /*
     * Audit log.
     */
    await createResultAuditLog({
      req,

      action: "CREATE",

      description: `${req.admin.fullName} created a ${term} term result draft for student ${student.studentId}.`,
    });

    /*
     * Activity log.
     */
    await createResultActivityLog({
      req,

      action: "CREATE_RESULT",

      studentId: student.studentId,

      details: `Created ${term} term result draft.`,
    });

    return res.status(201).json({
      success: true,

      message: "Result draft created successfully.",

      result,
    });
  } catch (error) {
    /*
     * MongoDB duplicate-key protection.
     */
    if (error.code === 11000) {
      return sendError(
        res,
        409,
        "A result already exists for this student, academic session, and term.",
      );
    }

    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to create result.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| GET RESULTS
|--------------------------------------------------------------------------
|
| GET /results
|
| Admin result listing with filtering,
| searching and pagination.
|
|--------------------------------------------------------------------------
*/

exports.getResults = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      term,
      currentClass,
      academicSessionId,
      studentId,
      search,
    } = req.query;

    const pageNumber = parsePositiveInteger(page, 1, 100000);

    const limitNumber = parsePositiveInteger(limit, 20, 100);

    const filter = {};

    /*
     * Status filter.
     */
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return sendError(res, 400, "Invalid result status.");
      }

      filter.status = status;
    }

    /*
     * Term filter.
     */
    if (term) {
      if (!VALID_TERMS.includes(term)) {
        return sendError(res, 400, "Invalid term.");
      }

      filter.term = term;
    }

    /*
     * Current class filter.
     */
    if (currentClass) {
      filter.currentClass = currentClass.trim();
    }

    /*
     * Academic session filter.
     */
    if (academicSessionId) {
      if (!isValidObjectId(academicSessionId)) {
        return sendError(res, 400, "Invalid academic session ID.");
      }

      filter.academicSession = new mongoose.Types.ObjectId(academicSessionId);
    }

    /*
     * Student ID filter.
     */
    if (studentId) {
      filter.student = await resolveStudent(studentId).then(
        (student) => student._id,
      );
    }

    /*
     * Search.
     *
     * Search is applied to the student ID,
     * first name, last name and other name.
     *
     * Regex characters are escaped to prevent
     * unintended regular expressions.
     */
    let studentIds = null;

    if (typeof search === "string" && search.trim()) {
      const searchValue = escapeRegex(search.trim());

      const matchingStudents = await Student.find({
        $or: [
          {
            studentId: {
              $regex: searchValue,
              $options: "i",
            },
          },

          {
            firstName: {
              $regex: searchValue,
              $options: "i",
            },
          },

          {
            lastName: {
              $regex: searchValue,
              $options: "i",
            },
          },

          {
            otherName: {
              $regex: searchValue,
              $options: "i",
            },
          },
        ],
      })
        .select("_id")
        .lean();

      studentIds = matchingStudents.map((student) => student._id);

      /*
       * No matching students means no matching
       * results.
       */
      if (studentIds.length === 0) {
        return res.status(200).json({
          success: true,

          results: [],

          pagination: {
            page: pageNumber,

            limit: limitNumber,

            total: 0,

            totalPages: 0,
          },
        });
      }

      filter.student = {
        $in: studentIds,
      };
    }

    const skip = (pageNumber - 1) * limitNumber;

    const [results, total] = await Promise.all([
      Result.find(filter)
        .populate({
          path: "student",
          select: "studentId firstName lastName otherName currentClass",
        })

        .populate({
          path: "academicSession",
          select: "name isActive terms",
        })

        .sort({
          createdAt: -1,
        })

        .skip(skip)

        .limit(limitNumber)

        .lean(),

      Result.countDocuments(filter),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / limitNumber);

    return res.status(200).json({
      success: true,

      results,

      pagination: {
        page: pageNumber,

        limit: limitNumber,

        total,

        totalPages,
      },
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to fetch results.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| GET SINGLE RESULT
|--------------------------------------------------------------------------
|
| GET /results/:id
|
|--------------------------------------------------------------------------
*/

exports.getResult = asyncHandler(async (req, res) => {
  try {
    const result = await findResultById(req.params.id);

    await result.populate([
      {
        path: "student",
        select:
          "studentId firstName lastName otherName gender dateOfBirth currentClass session photo",
      },

      {
        path: "academicSession",
        select: "name isActive terms",
      },

      {
        path: "subjectResults.subject",
        select: "name code isActive",
      },

      {
        path: "createdBy",
        select: "fullName email role",
      },

      {
        path: "updatedBy",
        select: "fullName email role",
      },

      {
        path: "submittedBy",
        select: "fullName email role",
      },

      {
        path: "approvedBy",
        select: "fullName email role",
      },

      {
        path: "publishedBy",
        select: "fullName email role",
      },
    ]);

    return res.status(200).json({
      success: true,
      result,
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to fetch result.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE RESULT
|--------------------------------------------------------------------------
|
| PUT /results/:id
|
| Only draft results can be edited through
| this endpoint.
|
|--------------------------------------------------------------------------
*/

exports.updateResult = asyncHandler(async (req, res) => {
  try {
    const result = await findResultById(req.params.id);

    /*
     * Once submitted, approved or published,
     * the normal result-edit endpoint must
     * no longer modify the assessment.
     */
    if (result.status !== "draft") {
      return sendError(
        res,
        409,
        `A result with status "${result.status}" cannot be edited. Only draft results can be updated.`,
      );
    }

    /*
     * The identity of an existing result is
     * immutable.
     *
     * Do not allow the browser to move a result
     * to another student/session/term.
     */
    if (
      req.body.studentId &&
      req.body.studentId.trim().toUpperCase() !==
        (await Student.findById(result.student))?.studentId?.toUpperCase()
    ) {
      return sendError(
        res,
        400,
        "The student associated with an existing result cannot be changed.",
      );
    }

    if (
      req.body.academicSessionId &&
      String(req.body.academicSessionId) !== String(result.academicSession)
    ) {
      return sendError(
        res,
        400,
        "The academic session of an existing result cannot be changed.",
      );
    }

    if (req.body.term && req.body.term !== result.term) {
      return sendError(
        res,
        400,
        "The term of an existing result cannot be changed.",
      );
    }

    /*
     * Resolve the original student and
     * academic session from the stored result.
     */
    const student = await Student.findById(result.student);

    if (!student) {
      return sendError(
        res,
        404,
        "The student associated with this result no longer exists.",
      );
    }

    const academicSession = await AcademicSession.findById(
      result.academicSession,
    );

    if (!academicSession) {
      return sendError(
        res,
        404,
        "The academic session associated with this result no longer exists.",
      );
    }

    const termConfiguration = resolveTermConfiguration(
      academicSession,
      result.term,
    );

    /*
     * Merge existing result data with the
     * submitted changes.
     *
     * This allows partial draft editing.
     */
    const mergedBody = {
      studentId: student.studentId,

      academicSessionId: academicSession._id.toString(),

      term: result.term,

      subjectResults:
        req.body.subjectResults ??
        result.subjectResults.map((subject) => ({
          subjectId:
            subject.subject?.toString() || subject.subjectId?.toString(),

          offered: Boolean(subject.offered),

          ca1: subject.ca1 ?? null,

          ca2: subject.ca2 ?? null,

          exam: subject.exam ?? null,

          teacherComment: subject.teacherComment || "",
        })),

      attendance: req.body.attendance ?? result.attendance,

      affectiveDomain: req.body.affectiveDomain ?? result.affectiveDomain,

      psychomotorDomain: req.body.psychomotorDomain ?? result.psychomotorDomain,

      conduct: req.body.conduct ?? result.conduct,

      specialReport: req.body.specialReport ?? result.specialReport,

      sports: req.body.sports ?? result.sports,

      clubs: req.body.clubs ?? result.clubs,

      comments: req.body.comments ?? {
        classTeacher: result.comments?.classTeacher || "",
      },
    };

    /*
     * Build the updated draft.
     *
     * We intentionally do not require previous
     * terms here because this is still a draft.
     */
    const payload = await buildResultPayload({
      body: mergedBody,

      student,

      academicSession,

      termConfiguration,

      requireCompleteCalculation: false,

      requirePreviousTerms: false,
    });

    /*
     * Preserve the original identity and
     * snapshot fields.
     */
    result.student = result.student;

    result.academicSession = result.academicSession;

    result.term = result.term;

    /*
     * Important:
     * currentClass is a snapshot.
     *
     * We preserve the class that was stored when
     * the result was originally created instead
     * of silently changing it because the student
     * may have moved classes later.
     */
    result.currentClass = result.currentClass;

    result.subjectResults = payload.subjectResults;

    result.attendance = payload.attendance;

    result.affectiveDomain = payload.affectiveDomain;

    result.psychomotorDomain = payload.psychomotorDomain;

    result.conduct = payload.conduct;

    result.specialReport = payload.specialReport;

    result.sports = payload.sports;

    result.clubs = payload.clubs;

    result.comments = {
      classTeacher: payload.comments?.classTeacher || "",

      principal: result.comments?.principal || "",

      performance: payload.performanceComment || "",
    };

    result.termDates = result.termDates || payload.termDates;

    result.totalScore = payload.totalScore;

    result.totalObtainableMarks = payload.totalObtainableMarks;

    result.overallPercentage = payload.overallPercentage;

    result.performanceComment = payload.performanceComment;

    result.promotionStatus = payload.promotionStatus;

    /*
     * Updating a draft means it has not yet
     * been approved by the principal.
     */
    result.principalDecision = "pending";

    result.status = "draft";

    result.updatedBy = getAdminId(req);

    result.submittedBy = null;

    result.submittedAt = null;

    result.approvedBy = null;

    result.approvedAt = null;

    result.publishedBy = null;

    result.publishedAt = null;

    await result.save();

    /*
     * Audit log.
     */
    await createResultAuditLog({
      req,

      action: "UPDATE",

      description: `${req.admin.fullName} updated the ${result.term} term result draft for student ${student.studentId}.`,
    });

    /*
     * Activity log.
     */
    await createResultActivityLog({
      req,

      action: "UPDATE_RESULT",

      studentId: student.studentId,

      details: `Updated ${result.term} term result draft.`,
    });

    return res.status(200).json({
      success: true,

      message: "Result draft updated successfully.",

      result,
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to update result.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| SUBMIT RESULT
|--------------------------------------------------------------------------
|
| POST /results/:id/submit
|
| A result can only be submitted when all required
| academic and assessment information is complete.
|
| The server recalculates the result before submission.
| Calculated values from the browser/database are never
| trusted as the source of truth.
|
|--------------------------------------------------------------------------
*/

exports.submitResult = asyncHandler(async (req, res) => {
  try {
    const result = await findResultById(req.params.id);

    /*
     * Only draft results can be submitted.
     */
    if (result.status !== "draft") {
      return sendError(
        res,
        409,
        `A result with status "${result.status}" cannot be submitted. Only draft results can be submitted.`,
      );
    }

    /*
     * Load the authoritative student.
     */
    const student = await Student.findById(result.student);

    if (!student) {
      return sendError(
        res,
        404,
        "The student associated with this result no longer exists.",
      );
    }

    /*
     * Load the authoritative academic session.
     */
    const academicSession = await AcademicSession.findById(
      result.academicSession,
    );

    if (!academicSession) {
      return sendError(
        res,
        404,
        "The academic session associated with this result no longer exists.",
      );
    }

    const termConfiguration = resolveTermConfiguration(
      academicSession,
      result.term,
    );

    /*
     * Resolve the subjects again.
     *
     * This ensures that subject names/codes come
     * from the database and not from client data.
     */
    const subjectResults = await resolveSubjects(
      result.subjectResults.map((subject) => ({
        subjectId: subject.subject?.toString() || subject.subjectId?.toString(),

        offered: Boolean(subject.offered),

        ca1: subject.ca1 ?? null,

        ca2: subject.ca2 ?? null,

        exam: subject.exam ?? null,

        teacherComment: subject.teacherComment || "",
      })),
    );

    /*
     * Every offered subject must have a complete
     * score before submission.
     */
    if (!hasCompleteSubjectScores(subjectResults)) {
      return sendError(
        res,
        400,
        "All offered subject scores must be completed before the result can be submitted.",
      );
    }

    subjectResults.forEach((subject) => {
      validateCompleteSubjectScore(subject);
    });

    /*
     * Validate all required non-academic
     * assessment information.
     */
    try {
      validateCompleteAssessment(result);
    } catch (error) {
      return sendError(res, error.statusCode || 400, error.message);
    }

    /*
     * Recalculate the complete result.
     *
     * Third Term additionally requires approved
     * or published First and Second Term results.
     */
    let calculated;

    try {
      calculated = await buildCalculatedResult({
        term: result.term,

        subjectResults,

        student,

        academicSession,

        requirePreviousTerms: result.term === "third",
      });
    } catch (error) {
      return sendError(res, error.statusCode || 400, error.message);
    }

    /*
     * Update all server-calculated values.
     */
    result.subjectResults = calculated.subjectResults;

    result.totalScore = calculated.totalScore;

    result.totalObtainableMarks = calculated.totalObtainableMarks;

    result.overallPercentage = calculated.overallPercentage;

    result.performanceComment = calculated.performanceComment;

    result.promotionStatus = calculated.promotionStatus;

    /*
     * Preserve the principal's decision as
     * pending until the Principal approves.
     */
    result.principalDecision = "pending";

    /*
     * Preserve the result's existing class snapshot.
     */
    result.currentClass = result.currentClass;

    result.termDates = buildTermDates(termConfiguration);

    /*
     * Update lifecycle information.
     */
    result.status = "submitted";

    result.submittedBy = getAdminId(req);

    result.submittedAt = new Date();

    result.updatedBy = getAdminId(req);

    /*
     * A newly submitted result must not retain
     * an old approval/publication timestamp.
     */
    result.approvedBy = null;

    result.approvedAt = null;

    result.publishedBy = null;

    result.publishedAt = null;

    await result.save();

    /*
     * Audit log.
     */
    await createResultAuditLog({
      req,

      action: "SUBMIT",

      description: `${req.admin.fullName} submitted the ${result.term} term result for student ${student.studentId} for Principal review.`,
    });

    /*
     * Activity log.
     */
    await createResultActivityLog({
      req,

      action: "SUBMIT_RESULT",

      studentId: student.studentId,

      details: `Submitted ${result.term} term result for Principal review.`,
    });

    return res.status(200).json({
      success: true,

      message: "Result submitted successfully for Principal review.",

      result,
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to submit result.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| APPROVE RESULT
|--------------------------------------------------------------------------
|
| PATCH /results/:id/approve
|
| Principal reviews the submitted result.
|
| Third Term:
| - System calculates promotion recommendation.
| - Principal must explicitly choose promoted/repeat.
|
|--------------------------------------------------------------------------
*/

exports.approveResult = asyncHandler(async (req, res) => {
  try {
    const result = await findResultById(req.params.id);

    /*
     * Only submitted results can be approved.
     */
    if (result.status !== "submitted") {
      return sendError(
        res,
        409,
        `A result with status "${result.status}" cannot be approved. Only submitted results can be approved.`,
      );
    }

    /*
     * Principal comment is required.
     */
    const principalComment =
      typeof req.body?.principalComment === "string"
        ? req.body.principalComment.trim()
        : "";

    if (!principalComment) {
      return sendError(
        res,
        400,
        "Principal comment is required before approval.",
      );
    }

    /*
     * Load authoritative student.
     */
    const student = await Student.findById(result.student);

    if (!student) {
      return sendError(
        res,
        404,
        "The student associated with this result no longer exists.",
      );
    }

    /*
     * Load authoritative academic session.
     */
    const academicSession = await AcademicSession.findById(
      result.academicSession,
    );

    if (!academicSession) {
      return sendError(
        res,
        404,
        "The academic session associated with this result no longer exists.",
      );
    }

    const termConfiguration = resolveTermConfiguration(
      academicSession,
      result.term,
    );

    /*
     * Resolve subjects from the authoritative
     * Subject collection.
     */
    const subjectResults = await resolveSubjects(
      result.subjectResults.map((subject) => ({
        subjectId: subject.subject?.toString() || subject.subjectId?.toString(),

        offered: Boolean(subject.offered),

        ca1: subject.ca1 ?? null,

        ca2: subject.ca2 ?? null,

        exam: subject.exam ?? null,

        teacherComment: subject.teacherComment || "",
      })),
    );

    /*
     * Revalidate complete subject scores.
     */
    if (!hasCompleteSubjectScores(subjectResults)) {
      return sendError(
        res,
        400,
        "All offered subject scores must be completed before approval.",
      );
    }

    subjectResults.forEach((subject) => {
      validateCompleteSubjectScore(subject);
    });

    /*
     * Revalidate attendance, affective domain,
     * psychomotor domain and class teacher comment.
     */
    try {
      validateCompleteAssessment(result);
    } catch (error) {
      return sendError(res, error.statusCode || 400, error.message);
    }

    /*
     * Recalculate AGAIN before approval.
     *
     * This is important because calculated values
     * must always be derived from authoritative
     * source data.
     */
    let calculated;

    try {
      calculated = await buildCalculatedResult({
        term: result.term,

        subjectResults,

        student,

        academicSession,

        requirePreviousTerms: result.term === "third",
      });
    } catch (error) {
      return sendError(res, error.statusCode || 400, error.message);
    }

    /*
     * Third Term requires an explicit Principal
     * decision.
     */
    let principalDecision = "pending";

    if (result.term === "third") {
      const requestedDecision = req.body?.principalDecision;

      if (!["promoted", "repeat"].includes(requestedDecision)) {
        return sendError(
          res,
          400,
          "For Third Term, the Principal must explicitly choose either promoted or repeat.",
        );
      }

      /*
       * The system recommendation is retained
       * separately in promotionStatus.
       *
       * The Principal remains the final authority.
       */
      principalDecision = requestedDecision;
    }

    /*
     * Update authoritative calculated fields.
     */
    result.subjectResults = calculated.subjectResults;

    result.totalScore = calculated.totalScore;

    result.totalObtainableMarks = calculated.totalObtainableMarks;

    result.overallPercentage = calculated.overallPercentage;

    result.performanceComment = calculated.performanceComment;

    result.promotionStatus = calculated.promotionStatus;

    /*
     * Store the Principal's comment.
     */
    result.comments = {
      classTeacher: result.comments?.classTeacher || "",

      principal: principalComment,

      performance: calculated.performanceComment || "",
    };

    /*
     * For First and Second Term there is no
     * promotion decision.
     */
    if (result.term !== "third") {
      principalDecision = "pending";
    }

    result.principalDecision = principalDecision;

    /*
     * Update lifecycle fields.
     */
    result.status = "approved";

    result.approvedBy = getAdminId(req);

    result.approvedAt = new Date();

    result.updatedBy = getAdminId(req);

    /*
     * A result that has just been approved
     * has not yet been published.
     */
    result.publishedBy = null;

    result.publishedAt = null;

    result.termDates = buildTermDates(termConfiguration);

    await result.save();

    /*
     * Audit log.
     */
    await createResultAuditLog({
      req,

      action: "APPROVE",

      description: `${req.admin.fullName} approved the ${result.term} term result for student ${student.studentId}.`,
    });

    /*
     * Activity log.
     */
    await createResultActivityLog({
      req,

      action: "APPROVE_RESULT",

      studentId: student.studentId,

      details: `Approved ${result.term} term result. Principal decision: ${principalDecision}.`,
    });

    return res.status(200).json({
      success: true,

      message: "Result approved successfully.",

      result,
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to approve result.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| UPDATE PRINCIPAL COMMENT
|--------------------------------------------------------------------------
|
| PATCH /results/:id/principal-comment
|
| Allows the Principal to update the comment while
| the result is still under review/approval.
|
| A draft cannot receive a Principal comment because
| it has not reached the Principal review stage.
|
|--------------------------------------------------------------------------
*/

exports.updatePrincipalComment = asyncHandler(async (req, res) => {
  try {
    const result = await findResultById(req.params.id);

    /*
     * Principal comments are only meaningful
     * after class teacher submission.
     */
    if (!["submitted", "approved"].includes(result.status)) {
      return sendError(
        res,
        409,
        `A Principal comment cannot be updated while the result has status "${result.status}".`,
      );
    }

    const principalComment =
      typeof req.body?.principal === "string" ? req.body.principal.trim() : "";

    if (!principalComment) {
      return sendError(res, 400, "Principal comment is required.");
    }

    result.comments = {
      classTeacher: result.comments?.classTeacher || "",

      principal: principalComment,

      performance: result.performanceComment || "",
    };

    result.updatedBy = getAdminId(req);

    await result.save();

    /*
     * Audit log.
     */
    await createResultAuditLog({
      req,

      action: "UPDATE_PRINCIPAL_COMMENT",

      description: `${req.admin.fullName} updated the Principal comment for result ${result._id}.`,
    });

    /*
     * Activity log.
     */
    await createResultActivityLog({
      req,

      action: "UPDATE_PRINCIPAL_COMMENT",

      studentId: result.student?.toString() || null,

      details: "Updated Principal comment on result.",
    });

    return res.status(200).json({
      success: true,

      message: "Principal comment updated successfully.",

      result,
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to update Principal comment.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| PUBLISH RESULT
|--------------------------------------------------------------------------
|
| PATCH /results/:id/publish
|
| Only approved results can be published.
|
| Once published, the result becomes visible to
| the authenticated student.
|
|--------------------------------------------------------------------------
*/

exports.publishResult = asyncHandler(async (req, res) => {
  try {
    const result = await findResultById(req.params.id);

    /*
     * Only approved results can be published.
     */
    if (result.status !== "approved") {
      return sendError(
        res,
        409,
        `A result with status "${result.status}" cannot be published. Only approved results can be published.`,
      );
    }

    /*
     * Publishing must be an explicit action.
     */
    if (req.body?.confirm !== true) {
      return sendError(res, 400, "Publishing must be explicitly confirmed.");
    }

    /*
     * A Principal comment must exist before
     * publication.
     */
    const principalComment = result.comments?.principal;

    if (typeof principalComment !== "string" || !principalComment.trim()) {
      return sendError(
        res,
        400,
        "A Principal comment is required before the result can be published.",
      );
    }

    /*
     * Third Term must have an explicit Principal
     * decision before publication.
     */
    if (result.term === "third") {
      if (!["promoted", "repeat"].includes(result.principalDecision)) {
        return sendError(
          res,
          400,
          "A final Principal decision of promoted or repeat is required before Third Term publication.",
        );
      }
    }

    /*
     * Load the authoritative student.
     */
    const student = await Student.findById(result.student);

    if (!student) {
      return sendError(
        res,
        404,
        "The student associated with this result no longer exists.",
      );
    }

    /*
     * Load the academic session.
     */
    const academicSession = await AcademicSession.findById(
      result.academicSession,
    );

    if (!academicSession) {
      return sendError(
        res,
        404,
        "The academic session associated with this result no longer exists.",
      );
    }

    const termConfiguration = resolveTermConfiguration(
      academicSession,
      result.term,
    );

    /*
     * Re-resolve all subjects from the
     * authoritative Subject collection.
     */
    const subjectResults = await resolveSubjects(
      result.subjectResults.map((subject) => ({
        subjectId: subject.subject?.toString() || subject.subjectId?.toString(),

        offered: Boolean(subject.offered),

        ca1: subject.ca1 ?? null,

        ca2: subject.ca2 ?? null,

        exam: subject.exam ?? null,

        teacherComment: subject.teacherComment || "",
      })),
    );

    /*
     * Validate complete subject scores.
     */
    if (!hasCompleteSubjectScores(subjectResults)) {
      return sendError(
        res,
        400,
        "All offered subject scores must be completed before publication.",
      );
    }

    subjectResults.forEach((subject) => {
      validateCompleteSubjectScore(subject);
    });

    /*
     * Validate all required assessment
     * information again.
     */
    try {
      validateCompleteAssessment(result);
    } catch (error) {
      return sendError(res, error.statusCode || 400, error.message);
    }

    /*
     * Recalculate before publication as the
     * final server-side integrity check.
     *
     * Third Term again requires approved or
     * published First and Second Term results.
     */
    let calculated;

    try {
      calculated = await buildCalculatedResult({
        term: result.term,

        subjectResults,

        student,

        academicSession,

        requirePreviousTerms: result.term === "third",
      });
    } catch (error) {
      return sendError(res, error.statusCode || 400, error.message);
    }

    /*
     * Update calculated values one final time.
     */
    result.subjectResults = calculated.subjectResults;

    result.totalScore = calculated.totalScore;

    result.totalObtainableMarks = calculated.totalObtainableMarks;

    result.overallPercentage = calculated.overallPercentage;

    result.performanceComment = calculated.performanceComment;

    result.promotionStatus = calculated.promotionStatus;

    /*
     * Keep the Principal's existing final
     * decision.
     */
    if (result.term !== "third") {
      result.principalDecision = "pending";
    }

    /*
     * Refresh the term dates from the
     * authoritative academic session.
     */
    result.termDates = buildTermDates(termConfiguration);

    /*
     * Publish.
     */
    result.status = "published";

    result.publishedBy = getAdminId(req);

    result.publishedAt = new Date();

    result.updatedBy = getAdminId(req);

    await result.save();

    /*
     * Audit log.
     */
    await createResultAuditLog({
      req,

      action: "PUBLISH",

      description: `${req.admin.fullName} published the ${result.term} term result for student ${student.studentId}.`,
    });

    /*
     * Activity log.
     */
    await createResultActivityLog({
      req,

      action: "PUBLISH_RESULT",

      studentId: student.studentId,

      details: `Published ${result.term} term result. Student can now access the result.`,
    });

    return res.status(200).json({
      success: true,

      message: "Result published successfully.",

      result,
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to publish result.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| GET MY PUBLISHED RESULTS
|--------------------------------------------------------------------------
|
| GET /results/my
|
| Student endpoint.
|
| IMPORTANT:
| The authenticated student's identity comes
| from req.student.
|
| The browser cannot choose another student's
| ID to access results.
|
|--------------------------------------------------------------------------
*/

exports.getMyPublishedResults = asyncHandler(async (req, res) => {
  try {
    const studentAuthId = getStudentAuthId(req);

    if (!studentAuthId) {
      return sendError(res, 401, "Student authentication is required.");
    }

    if (!isValidObjectId(studentAuthId)) {
      return sendError(res, 401, "Invalid authenticated student identity.");
    }

    const results = await Result.find({
      student: studentAuthId,

      status: "published",
    })
      .populate({
        path: "academicSession",
        select: "name terms",
      })

      .populate({
        path: "student",
        select:
          "studentId firstName lastName otherName currentClass session photo",
      })

      .sort({
        academicSession: -1,

        term: 1,
      })

      .lean();

    return res.status(200).json({
      success: true,

      results,
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to fetch published results.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| GET MY PUBLISHED RESULT
|--------------------------------------------------------------------------
|
| GET /results/my/:resultId
|
| Student can only access a result belonging
| to the authenticated student.
|
|--------------------------------------------------------------------------
*/

exports.getMyPublishedResult = asyncHandler(async (req, res) => {
  try {
    const studentAuthId = getStudentAuthId(req);

    if (!studentAuthId) {
      return sendError(res, 401, "Student authentication is required.");
    }

    if (!isValidObjectId(studentAuthId)) {
      return sendError(res, 401, "Invalid authenticated student identity.");
    }

    const resultId = req.params.id;

    if (!isValidObjectId(resultId)) {
      return sendError(res, 400, "Invalid result ID.");
    }

    /*
     * Ownership is enforced directly in the
     * database query.
     *
     * This is safer than:
     *
     * 1. finding any result
     * 2. checking student ID afterward.
     *
     * The authenticated student must match
     * the result owner.
     */
    const result = await Result.findOne({
      _id: resultId,

      student: studentAuthId,

      status: "published",
    })
      .populate({
        path: "student",
        select:
          "studentId firstName lastName otherName gender dateOfBirth currentClass session photo",
      })

      .populate({
        path: "academicSession",
        select: "name terms",
      })

      .populate({
        path: "subjectResults.subject",
        select: "name code",
      })

      .lean();

    /*
     * Return 404 rather than revealing whether
     * another student's result exists.
     */
    if (!result) {
      return sendError(res, 404, "Published result not found.");
    }

    return res.status(200).json({
      success: true,

      result,
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to fetch published result.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| GET STUDENT RESULT HISTORY
|--------------------------------------------------------------------------
|
| GET /results/student/:studentId/history
|
| ADMIN endpoint.
|
| This endpoint is different from the student
| endpoint above because administrators are
| allowed to inspect a student's history when
| their route permission allows it.
|
|--------------------------------------------------------------------------
*/

exports.getStudentResultHistory = asyncHandler(async (req, res) => {
  try {
    const student = await resolveStudent(req.params.studentId);

    const results = await Result.find({
      student: student._id,
    })
      .populate({
        path: "academicSession",
        select: "name terms",
      })

      .sort({
        createdAt: -1,
      })

      .lean();

    return res.status(200).json({
      success: true,

      student: {
        _id: student._id,

        studentId: student.studentId,

        firstName: student.firstName,

        lastName: student.lastName,

        otherName: student.otherName,

        currentClass: student.currentClass,

        session: student.session,
      },

      results,
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to fetch student result history.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| GET RESULT STATISTICS
|--------------------------------------------------------------------------
|
| GET /results/statistics
|
| Admin endpoint for result analytics.
|
| By default, statistics are calculated from
| approved and published results only.
|
|--------------------------------------------------------------------------
*/

exports.getResultStatistics = asyncHandler(async (req, res) => {
  try {
    const { academicSessionId, term, currentClass, status } = req.query;

    const filter = {};

    /*
     * Only approved/published results should
     * normally contribute to academic statistics.
     *
     * This prevents incomplete drafts from
     * affecting school analytics.
     */
    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return sendError(res, 400, "Invalid result status.");
      }

      filter.status = status;
    } else {
      filter.status = {
        $in: ["approved", "published"],
      };
    }

    /*
     * Academic session filter.
     */
    if (academicSessionId) {
      if (!isValidObjectId(academicSessionId)) {
        return sendError(res, 400, "Invalid academic session ID.");
      }

      filter.academicSession = new mongoose.Types.ObjectId(academicSessionId);
    }

    /*
     * Term filter.
     */
    if (term) {
      if (!VALID_TERMS.includes(term)) {
        return sendError(res, 400, "Invalid term.");
      }

      filter.term = term;
    }

    /*
     * Class filter.
     */
    if (currentClass) {
      filter.currentClass = currentClass.trim();
    }

    /*
     * Aggregate result statistics.
     */
    const [summary, byTerm, byClass, promotionSummary] = await Promise.all([
      Result.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: null,

            totalResults: {
              $sum: 1,
            },

            averagePercentage: {
              $avg: "$overallPercentage",
            },

            highestPercentage: {
              $max: "$overallPercentage",
            },

            lowestPercentage: {
              $min: "$overallPercentage",
            },

            totalScore: {
              $sum: "$totalScore",
            },

            totalObtainableMarks: {
              $sum: "$totalObtainableMarks",
            },
          },
        },

        {
          $project: {
            _id: 0,

            totalResults: 1,

            averagePercentage: {
              $round: ["$averagePercentage", 2],
            },

            highestPercentage: {
              $round: ["$highestPercentage", 2],
            },

            lowestPercentage: {
              $round: ["$lowestPercentage", 2],
            },

            totalScore: 1,

            totalObtainableMarks: 1,
          },
        },
      ]),

      Result.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: "$term",

            totalResults: {
              $sum: 1,
            },

            averagePercentage: {
              $avg: "$overallPercentage",
            },

            highestPercentage: {
              $max: "$overallPercentage",
            },

            lowestPercentage: {
              $min: "$overallPercentage",
            },
          },
        },

        {
          $project: {
            _id: 0,

            term: "$_id",

            totalResults: 1,

            averagePercentage: {
              $round: ["$averagePercentage", 2],
            },

            highestPercentage: {
              $round: ["$highestPercentage", 2],
            },

            lowestPercentage: {
              $round: ["$lowestPercentage", 2],
            },
          },
        },

        {
          $sort: {
            term: 1,
          },
        },
      ]),

      Result.aggregate([
        {
          $match: filter,
        },

        {
          $group: {
            _id: "$currentClass",

            totalResults: {
              $sum: 1,
            },

            averagePercentage: {
              $avg: "$overallPercentage",
            },

            highestPercentage: {
              $max: "$overallPercentage",
            },

            lowestPercentage: {
              $min: "$overallPercentage",
            },
          },
        },

        {
          $project: {
            _id: 0,

            currentClass: "$_id",

            totalResults: 1,

            averagePercentage: {
              $round: ["$averagePercentage", 2],
            },

            highestPercentage: {
              $round: ["$highestPercentage", 2],
            },

            lowestPercentage: {
              $round: ["$lowestPercentage", 2],
            },
          },
        },

        {
          $sort: {
            currentClass: 1,
          },
        },
      ]),

      Result.aggregate([
        {
          $match: {
            ...filter,

            term: "third",
          },
        },

        {
          $group: {
            _id: "$principalDecision",

            count: {
              $sum: 1,
            },
          },
        },

        {
          $project: {
            _id: 0,

            decision: "$_id",

            count: 1,
          },
        },

        {
          $sort: {
            decision: 1,
          },
        },
      ]),
    ]);

    /*
     * If no results exist, return a predictable
     * empty statistics structure.
     */
    const statistics = summary[0] || {
      totalResults: 0,

      averagePercentage: 0,

      highestPercentage: 0,

      lowestPercentage: 0,

      totalScore: 0,

      totalObtainableMarks: 0,
    };

    return res.status(200).json({
      success: true,

      statistics: {
        summary: statistics,

        byTerm,

        byClass,

        thirdTermPromotion: promotionSummary,
      },
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to calculate result statistics.",
    );
  }
});

/*
|--------------------------------------------------------------------------
| MODULE EXPORTS
|--------------------------------------------------------------------------
|
| All controller functions are exported above
| through exports.<functionName>.
|
| No additional module.exports assignment is
| required here.
|
|--------------------------------------------------------------------------
*/
