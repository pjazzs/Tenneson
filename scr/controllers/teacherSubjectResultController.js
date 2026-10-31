const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const TeacherAssignment = require("../models/TeacherAssignment");
const SubjectResultResponsibility = require("../models/SubjectResultResponsibility");
const SubjectResultSubmission = require("../models/SubjectResultSubmission");
const ClassSubjectAllocation = require("../models/ClassSubjectAllocation");
const AcademicSession = require("../models/AcademicSession");
const Student = require("../models/student");
const createAuditLog = require("../utils/createAuditLog");

const VALID_TERMS = ["first", "second", "third"];

const isValidObjectId = (value) =>
  typeof value === "string" && mongoose.isValidObjectId(value);

const invalidId = (res, field) =>
  res.status(400).json({
    success: false,
    message: `Invalid ${field} ID.`,
  });

const getTermAndSession = async (academicSessionId, term, res) => {
  if (!isValidObjectId(academicSessionId)) {
    invalidId(res, "academic session");
    return null;
  }

  if (!VALID_TERMS.includes(term)) {
    res.status(400).json({
      success: false,
      message: "Term must be first, second or third.",
    });
    return null;
  }

  const session = await AcademicSession.findById(academicSessionId);

  if (!session) {
    res.status(404).json({
      success: false,
      message: "Academic session not found.",
    });
    return null;
  }

  const sessionTerm = session.terms.find((item) => item.key === term);

  if (!sessionTerm) {
    res.status(400).json({
      success: false,
      message: "The selected term does not exist in this academic session.",
    });
    return null;
  }

  return { session, sessionTerm };
};

/*
|--------------------------------------------------------------------------
| LOAD AND VALIDATE THE CURRENT RESULT RESPONSIBILITY
|--------------------------------------------------------------------------
*/

const getTeacherResultContext = async ({
  teacherId,
  allocationId,
  academicSessionId,
  term,
}) => {
  const responsibility = await SubjectResultResponsibility.findOne({
    allocation: allocationId,
    academicSession: academicSessionId,
    term,
  });

  if (!responsibility) {
    return {
      error: {
        status: 404,
        message:
          "No result teacher has been designated for this subject, session and term.",
      },
    };
  }

  const assignment = await TeacherAssignment.findById(
    responsibility.teacherAssignment,
  )
    .populate("teacher", "fullName isActive")
    .populate({
      path: "allocation",
      populate: [
        { path: "schoolClass", select: "name level isActive" },
        { path: "department", select: "name isActive" },
        { path: "subject", select: "name code isActive" },
      ],
    })
    .populate("academicSession", "name isActive");

  if (!assignment) {
    return {
      error: {
        status: 404,
        message: "The designated teacher assignment no longer exists.",
      },
    };
  }

  if (assignment.teacher._id.toString() !== teacherId.toString()) {
    return {
      error: {
        status: 403,
        message: "You are not the designated result teacher for this subject.",
      },
    };
  }

  if (!assignment.isActive || !assignment.teacher.isActive) {
    return {
      error: {
        status: 403,
        message: "Your teacher assignment is inactive.",
      },
    };
  }

  const allocation = assignment.allocation;

  if (
    !allocation ||
    !allocation.isActive ||
    !allocation.schoolClass?.isActive ||
    !allocation.subject?.isActive ||
    (allocation.department && !allocation.department.isActive)
  ) {
    return {
      error: {
        status: 400,
        message:
          "This subject allocation or one of its linked records is inactive.",
      },
    };
  }

  return {
    responsibility,
    assignment,
    allocation,
    session: assignment.academicSession,
  };
};

/*
|--------------------------------------------------------------------------
| GET STUDENTS OFFERING THE ALLOCATED SUBJECT
|--------------------------------------------------------------------------
|
| Eligibility is determined from the current student records:
|
| - Student must be active.
| - Student class must match the allocation class.
| - Student session must match the academic session name.
| - Senior students must belong to the allocation department.
|
*/

const getEligibleStudents = async ({ allocation, sessionName }) => {
  const filter = {
    isActive: true,
    currentClass: allocation.schoolClass.name,
    session: sessionName,
  };

  if (allocation.department) {
    filter.department = allocation.department._id;
  } else {
    filter.$or = [{ department: null }, { department: { $exists: false } }];
  }

  return Student.find(filter)
    .select(
      "_id studentId firstName lastName otherName currentClass department session",
    )
    .sort({ lastName: 1, firstName: 1, studentId: 1 })
    .lean();
};

const formatStudentName = (student) =>
  [student.firstName, student.otherName, student.lastName]
    .filter(Boolean)
    .join(" ");

/*
|--------------------------------------------------------------------------
| VALIDATE A TEACHER'S SCORE INPUT
|--------------------------------------------------------------------------
*/

const validateScore = (value, field, maximum) => {
  if (value === undefined || value === null) return value;

  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > maximum
  ) {
    throw new Error(`${field} must be a number between 0 and ${maximum}.`);
  }

  return value;
};

const validateScorePayload = (studentResults) => {
  if (!Array.isArray(studentResults)) {
    throw new Error("studentResults must be an array.");
  }

  const seen = new Set();

  return studentResults.map((item) => {
    if (!item || !isValidObjectId(item.student)) {
      throw new Error("Every score entry must contain a valid student ID.");
    }

    const studentId = item.student.toString();

    if (seen.has(studentId)) {
      throw new Error(
        "A student cannot appear more than once in a score update.",
      );
    }

    seen.add(studentId);

    if (
      item.teacherComment !== undefined &&
      typeof item.teacherComment !== "string"
    ) {
      throw new Error("Teacher comment must be a string.");
    }

    const validatedItem = {
      student: studentId,
      ca1: validateScore(item.ca1, "CA1", 20),
      ca2: validateScore(item.ca2, "CA2", 10),
      exam: validateScore(item.exam, "Examination", 70),
    };

    // Only include teacherComment when the client actually supplies it.
    // This allows buildStudentRows() to preserve an existing comment
    // when the teacher updates scores only.
    if (item.teacherComment !== undefined) {
      validatedItem.teacherComment = item.teacherComment.trim();
    }

    return validatedItem;
  });
};

/*
|--------------------------------------------------------------------------
| POPULATE SCORE ROWS FROM THE CURRENT ELIGIBLE STUDENT LIST
|--------------------------------------------------------------------------
|
| The client cannot add students or control the offered flag.
| Existing scores are preserved when the teacher saves only
| some of the students in a draft.
|
*/

const buildStudentRows = (
  eligibleStudents,
  existingRows = [],
  updates = [],
) => {
  const existingMap = new Map(
    existingRows.map((row) => [row.student.toString(), row]),
  );

  const updateMap = new Map(updates.map((row) => [row.student, row]));

  return eligibleStudents.map((student) => {
    const id = student._id.toString();
    const existing = existingMap.get(id);
    const update = updateMap.get(id);

    return {
      student: student._id,
      studentId: student.studentId,
      studentName: formatStudentName(student),
      offered: true,

      ca1: update?.ca1 !== undefined ? update.ca1 : (existing?.ca1 ?? null),
      ca2: update?.ca2 !== undefined ? update.ca2 : (existing?.ca2 ?? null),
      exam: update?.exam !== undefined ? update.exam : (existing?.exam ?? null),

      teacherComment:
        update?.teacherComment !== undefined
          ? update.teacherComment
          : existing?.teacherComment || "",
    };
  });
};

const updateStudentSnapshotRows = (existingRows = [], updates = []) => {
  const updateMap = new Map(updates.map((item) => [item.student, item]));

  return existingRows.map((row) => {
    const id = row.student.toString();
    const update = updateMap.get(id);

    return {
      student: row.student,
      studentId: row.studentId,
      studentName: row.studentName,
      offered: row.offered ?? true,

      ca1: update?.ca1 !== undefined ? update.ca1 : (row.ca1 ?? null),

      ca2: update?.ca2 !== undefined ? update.ca2 : (row.ca2 ?? null),

      exam: update?.exam !== undefined ? update.exam : (row.exam ?? null),

      teacherComment:
        update?.teacherComment !== undefined
          ? update.teacherComment
          : row.teacherComment || "",
    };
  });
};

const populateSubmission = (query) =>
  query
    .populate("allocation")
    .populate("academicSession", "name")
    .populate("responsibility")
    .populate("createdByTeacher", "fullName email")
    .populate("updatedByTeacher", "fullName email")
    .populate("submittedByTeacher", "fullName email");

/*
|--------------------------------------------------------------------------
| GET MY SUBJECT RESULT RESPONSIBILITIES
|--------------------------------------------------------------------------
|
| GET /teacher/my-subject-results
| Query: academicSessionId, term
|
| Returns assigned allocations, ownership and submission progress.
|--------------------------------------------------------------------------
*/

exports.getMySubjectResultResponsibilities = asyncHandler(async (req, res) => {
  const { academicSessionId, term } = req.query;

  const context = await getTermAndSession(academicSessionId, term, res);

  if (!context) return;

  // Get all active assignments belonging to this teacher.
  const assignments = await TeacherAssignment.find({
    teacher: req.teacher._id,
    academicSession: academicSessionId,
    isActive: true,
  })
    .populate({
      path: "allocation",
      populate: [
        { path: "schoolClass", select: "name level isActive" },
        { path: "department", select: "name isActive" },
        { path: "subject", select: "name code isActive" },
      ],
    })
    .lean();

  // Keep only assignments with active linked records.
  const availableAssignments = assignments.filter((item) => {
    const allocation = item.allocation;

    return (
      allocation?.isActive &&
      allocation.schoolClass?.isActive &&
      allocation.subject?.isActive &&
      (!allocation.department || allocation.department.isActive)
    );
  });

  const allocationIds = availableAssignments.map((item) => item.allocation._id);

  // Get the designated result responsibilities.
  const responsibilities = await SubjectResultResponsibility.find({
    allocation: { $in: allocationIds },
    academicSession: academicSessionId,
    term,
  }).lean();

  const responsibilityMap = new Map(
    responsibilities.map((item) => [item.allocation.toString(), item]),
  );

  // Build assignment and submission progress information.
  const results = await Promise.all(
    availableAssignments.map(async (assignment) => {
      const allocation = assignment.allocation;

      const responsibility = responsibilityMap.get(allocation._id.toString());

      const isOwner =
        responsibility?.teacherAssignment.toString() ===
        assignment._id.toString();

      // Fetch the current submission.
      const submission = await SubjectResultSubmission.findOne({
        allocation: allocation._id,
        academicSession: academicSessionId,
        term,
      }).select("status studentResults submittedAt updatedAt");

      let eligibleCount;

      if (submission) {
        /*
         * An existing submission owns its original roster.
         * Do not use the current eligible-student count here.
         */
        eligibleCount = submission.studentResults.length;
      } else {
        /*
         * No draft exists yet.
         * Use the current eligible students to show the initial count.
         */
        const eligibleStudents = await getEligibleStudents({
          allocation,
          sessionName: context.session.name,
        });

        eligibleCount = eligibleStudents.length;
      }

      // Count students with all three score components completed.
      const studentsWithScores = submission
        ? submission.studentResults.filter(
            (item) =>
              item.ca1 !== null &&
              item.ca1 !== undefined &&
              item.ca2 !== null &&
              item.ca2 !== undefined &&
              item.exam !== null &&
              item.exam !== undefined,
          ).length
        : 0;

      return {
        assignmentId: assignment._id,

        allocation: {
          _id: allocation._id,
          schoolClass: allocation.schoolClass,
          department: allocation.department,
          subject: allocation.subject,
        },

        isResultOwner: isOwner,

        canEdit: isOwner && submission?.status !== "submitted",

        responsibilityId: responsibility?._id || null,

        submission: {
          status: submission?.status || "not_started",
          eligibleStudents: eligibleCount,
          studentsWithScores,
          submittedAt: submission?.submittedAt || null,
          updatedAt: submission?.updatedAt || null,
        },
      };
    }),
  );

  return res.status(200).json({
    success: true,

    academicSession: {
      _id: context.session._id,
      name: context.session.name,
    },

    term,

    assignments: results,
  });
});

/*
|--------------------------------------------------------------------------
| GET ONE SUBJECT RESULT ENTRY
|--------------------------------------------------------------------------
|
| GET /teacher/subject-results/:allocationId
| Query: academicSessionId, term
|
| Assigned teachers can view.
| Only the designated owner can save or submit.
|--------------------------------------------------------------------------
*/

exports.getTeacherSubjectResult = asyncHandler(async (req, res) => {
  const { allocationId } = req.params;
  const { academicSessionId, term } = req.query;

  // Validate allocation ID
  if (!isValidObjectId(allocationId)) {
    return invalidId(res, "subject allocation");
  }

  // Validate academic session and term
  const context = await getTermAndSession(academicSessionId, term, res);

  if (!context) return;

  // Confirm that the teacher has an active assignment for this allocation
  const assignment = await TeacherAssignment.findOne({
    teacher: req.teacher._id,
    allocation: allocationId,
    academicSession: academicSessionId,
    isActive: true,
  });

  if (!assignment) {
    return res.status(403).json({
      success: false,
      message: "You are not assigned to this subject allocation.",
    });
  }

  // Retrieve the designated result-submission owner
  const resultContext = await getTeacherResultContext({
    teacherId: req.teacher._id,
    allocationId,
    academicSessionId,
    term,
  });

  // Retrieve the subject allocation and its related records
  const allocation = await ClassSubjectAllocation.findById(allocationId)
    .populate("schoolClass", "name level isActive")
    .populate("department", "name isActive")
    .populate("subject", "name code isActive");

  if (!allocation) {
    return res.status(404).json({
      success: false,
      message: "Subject allocation not found.",
    });
  }

  // Check whether a draft or submitted result already exists
  const submission = await SubjectResultSubmission.findOne({
    allocation: allocationId,
    academicSession: academicSessionId,
    term,
  }).lean();

  let studentResults;

  if (submission) {
    /*
     * An existing submission owns its original student roster.
     *
     * Do not rebuild this roster from current eligible students.
     * This ensures that:
     * - Students who become inactive remain in the draft.
     * - Students who change class or department remain in the draft.
     * - Newly eligible students are not silently added.
     * - Previously entered scores and teacher comments are preserved.
     */
    studentResults = submission.studentResults || [];
  } else {
    /*
     * No submission exists yet.
     * Fetch the current eligible students to establish the initial roster.
     */
    const eligibleStudents = await getEligibleStudents({
      allocation,
      sessionName: context.session.name,
    });

    studentResults = buildStudentRows(eligibleStudents);
  }

  // Determine whether this teacher owns result submission for this term
  const isOwner =
    !resultContext.error &&
    resultContext.assignment._id.toString() === assignment._id.toString();

  // Count students whose three score components are complete
  const completedStudents = studentResults.filter(
    (item) =>
      item.ca1 !== null &&
      item.ca1 !== undefined &&
      item.ca2 !== null &&
      item.ca2 !== undefined &&
      item.exam !== null &&
      item.exam !== undefined,
  ).length;

  return res.status(200).json({
    success: true,
    allocationId,

    academicSession: {
      _id: context.session._id,
      name: context.session.name,
    },

    term,

    isResultOwner: isOwner,

    canEdit: isOwner && submission?.status !== "submitted",

    status: submission?.status || "not_started",

    totalEligibleStudents: studentResults.length,

    completedStudents,

    studentResults,
  });
});
/*
|--------------------------------------------------------------------------
| SAVE SUBJECT RESULT DRAFT
|--------------------------------------------------------------------------
|
| PUT /teacher/subject-results/:allocationId/draft
|
| Body:
| {
|   academicSessionId: "...",
|   term: "first",
|   studentResults: [
|     {
|       student: "...",
|       ca1: 15,
|       ca2: 8,
|       exam: 60,
|       teacherComment: ""
|     }
|   ]
| }
|--------------------------------------------------------------------------
*/

exports.saveTeacherSubjectResultDraft = asyncHandler(async (req, res) => {
  const { allocationId } = req.params;
  const { academicSessionId, term, studentResults } = req.body;

  // Validate allocation ID
  if (!isValidObjectId(allocationId)) {
    return invalidId(res, "subject allocation");
  }

  // Validate academic session and term
  const context = await getTermAndSession(academicSessionId, term, res);

  if (!context) return;

  // Verify that the teacher is the designated result owner
  const resultContext = await getTeacherResultContext({
    teacherId: req.teacher._id,
    allocationId,
    academicSessionId,
    term,
  });

  if (resultContext.error) {
    return res.status(resultContext.error.status).json({
      success: false,
      message: resultContext.error.message,
    });
  }

  // Validate the submitted score updates
  let updates;

  try {
    updates = validateScorePayload(studentResults);
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  // Find an existing draft before deciding which roster to use
  let submission = await SubjectResultSubmission.findOne({
    allocation: allocationId,
    academicSession: academicSessionId,
    term,
  });

  const isNewSubmission = !submission;

  // Submitted results can no longer be edited
  if (submission?.status === "submitted") {
    return res.status(409).json({
      success: false,
      message:
        "This subject result has already been submitted and can no longer be edited.",
    });
  }

  let rows;

  if (!submission) {
    /*
     * FIRST DRAFT:
     * No saved roster exists yet.
     * Fetch currently eligible students to establish the initial snapshot.
     */
    const eligibleStudents = await getEligibleStudents({
      allocation: resultContext.allocation,
      sessionName: context.session.name,
    });

    if (eligibleStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "There are no eligible active students for this subject allocation.",
      });
    }

    // Only students in the initial eligible roster can receive scores.
    const eligibleIds = new Set(
      eligibleStudents.map((student) => student._id.toString()),
    );

    const unknownStudent = updates.find(
      (item) => !eligibleIds.has(item.student),
    );

    if (unknownStudent) {
      return res.status(400).json({
        success: false,
        message:
          "One or more students are not eligible for this subject allocation.",
      });
    }

    // Create the initial permanent roster and apply the submitted scores.
    rows = buildStudentRows(eligibleStudents, [], updates);

    submission = new SubjectResultSubmission({
      allocation: allocationId,
      academicSession: academicSessionId,
      term,
      responsibility: resultContext.responsibility._id,
      studentResults: rows,
      status: "draft",
      createdByTeacher: req.teacher._id,
      updatedByTeacher: req.teacher._id,
    });
  } else {
    /*
     * EXISTING DRAFT:
     * The saved roster is now the source of truth.
     * Do not fetch or rebuild from currently eligible students.
     */

    const existingRows = submission.studentResults || [];

    const snapshotIds = new Set(
      existingRows.map((item) => item.student.toString()),
    );

    // Reject attempts to add students outside the saved roster.
    const unknownStudent = updates.find(
      (item) => !snapshotIds.has(item.student),
    );

    if (unknownStudent) {
      return res.status(400).json({
        success: false,
        message:
          "One or more students are not in this draft's saved roster. The roster cannot be changed during a teacher draft update.",
      });
    }

    // Update existing rows without removing students or losing scores.
    rows = updateStudentSnapshotRows(existingRows, updates);

    submission.responsibility = resultContext.responsibility._id;
    submission.studentResults = rows;
    submission.updatedByTeacher = req.teacher._id;
  }

  // Save the draft
  try {
    await submission.save();
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A draft already exists. Refresh the page and try again.",
      });
    }

    if (error.name === "VersionError") {
      return res.status(409).json({
        success: false,
        message:
          "This draft was changed elsewhere. Refresh it before saving again.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  }

  const allocationLabel = [
    resultContext.allocation?.schoolClass?.name,
    resultContext.allocation?.department?.name,
    resultContext.allocation?.subject?.name,
  ]
    .filter(Boolean)
    .join(" / ");

  await createAuditLog({
    teacher: req.teacher._id,
    action: isNewSubmission ? "CREATE_DRAFT" : "UPDATE_DRAFT",
    module: "SUBJECT_RESULTS",
    description: `${req.teacher.fullName} ${
      isNewSubmission ? "created" : "updated"
    } a subject result draft for ${allocationLabel}, ${term} term (${context.session.name}).`,
    req,
  });

  // Count students with complete scores
  const completedStudents = rows.filter(
    (item) =>
      item.ca1 !== null &&
      item.ca1 !== undefined &&
      item.ca2 !== null &&
      item.ca2 !== undefined &&
      item.exam !== null &&
      item.exam !== undefined,
  ).length;

  return res.status(200).json({
    success: true,
    message: "Subject result draft saved successfully.",
    submission: {
      _id: submission._id,
      status: submission.status,
      totalEligibleStudents: rows.length,
      completedStudents,
      updatedAt: submission.updatedAt,
    },
  });
});

/*
|--------------------------------------------------------------------------
| SUBMIT SUBJECT RESULTS
|--------------------------------------------------------------------------
|
| POST /teacher/subject-results/:allocationId/submit
|
| Submission is accepted only when every eligible student has:
| CA1, CA2 and examination scores.
|--------------------------------------------------------------------------
*/

exports.submitTeacherSubjectResult = asyncHandler(async (req, res) => {
  const { allocationId } = req.params;
  const { academicSessionId, term } = req.body;

  // Validate allocation ID
  if (!isValidObjectId(allocationId)) {
    return invalidId(res, "subject allocation");
  }

  // Validate academic session and term
  const context = await getTermAndSession(academicSessionId, term, res);

  if (!context) return;

  // Verify that the teacher is the designated result owner
  const resultContext = await getTeacherResultContext({
    teacherId: req.teacher._id,
    allocationId,
    academicSessionId,
    term,
  });

  if (resultContext.error) {
    return res.status(resultContext.error.status).json({
      success: false,
      message: resultContext.error.message,
    });
  }

  // Retrieve the existing draft
  const submission = await SubjectResultSubmission.findOne({
    allocation: allocationId,
    academicSession: academicSessionId,
    term,
  });

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: "Save a subject result draft before submitting.",
    });
  }

  // Prevent duplicate submission
  if (submission.status === "submitted") {
    return res.status(409).json({
      success: false,
      message: "This subject result has already been submitted.",
    });
  }

  /*
   * VALIDATE AGAINST THE SAVED ROSTER
   *
   * Do not fetch currently eligible students here.
   * The saved roster is the source of truth once a draft exists.
   */

  const roster = submission.studentResults.filter(
    (item) => item.offered !== false,
  );

  if (roster.length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "This draft has no students in its saved roster. It cannot be submitted.",
    });
  }

  // Find students whose CA1, CA2 or examination score is missing
  const missingStudents = roster.filter(
    (item) =>
      item.ca1 === null ||
      item.ca1 === undefined ||
      item.ca2 === null ||
      item.ca2 === undefined ||
      item.exam === null ||
      item.exam === undefined,
  );

  if (missingStudents.length > 0) {
    const completedStudents = roster.length - missingStudents.length;

    return res.status(400).json({
      success: false,
      message:
        "Every student in the saved roster must have complete scores before submission.",

      completion: {
        eligibleStudents: roster.length,
        completedStudents,
        incompleteStudents: missingStudents.length,
        staleStudentEntries: 0,
      },

      incompleteStudents: missingStudents.map((item) => ({
        student: item.student,
        studentId: item.studentId,
        studentName: item.studentName,
      })),
    });
  }

  // All students have complete scores. Mark the submission as submitted.
  submission.responsibility = resultContext.responsibility._id;
  submission.status = "submitted";
  submission.submittedByTeacher = req.teacher._id;
  submission.updatedByTeacher = req.teacher._id;
  submission.submittedAt = new Date();

  try {
    await submission.save();
  } catch (error) {
    if (error.name === "VersionError") {
      return res.status(409).json({
        success: false,
        message: "This submission changed elsewhere. Refresh and try again.",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  }

  // AUDIT LOG — runs only after successful submission
  const allocationLabel = [
    resultContext.allocation?.schoolClass?.name,
    resultContext.allocation?.department?.name,
    resultContext.allocation?.subject?.name,
  ]
    .filter(Boolean)
    .join(" / ");

  await createAuditLog({
    teacher: req.teacher._id,
    action: "SUBMIT",
    module: "SUBJECT_RESULTS",
    description: `${req.teacher.fullName} submitted subject results for ${allocationLabel}, ${term} term (${context.session.name}).`,
    req,
  });

  // SUCCESS RESPONSE
  return res.status(200).json({
    success: true,
    message: "Subject results submitted successfully.",

    submission: {
      _id: submission._id,
      status: submission.status,
      totalStudents: roster.length,
      completedStudents: roster.length,
      submittedAt: submission.submittedAt,
    },
  });
});
