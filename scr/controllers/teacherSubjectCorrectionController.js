const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const SubjectResultCorrectionRequest = require("../models/SubjectResultCorrectionRequest");
const ResultRevision = require("../models/ResultRevision");
const createAuditLog = require("../utils/createAuditLog");

const isValidObjectId = (value) =>
  typeof value === "string" && mongoose.isValidObjectId(value);

const editableStatuses = ["pending_teacher", "returned"];

const validStatuses = [
  "pending_teacher",
  "submitted",
  "accepted",
  "returned",
  "cancelled",
];

const populateCorrectionRequest = (query) =>
  query
    .populate("student", "studentId firstName lastName otherName currentClass")
    .populate("subject", "name code")
    .populate("academicSession", "name")
    .populate({
      path: "allocation",
      populate: [
        { path: "schoolClass", select: "name" },
        { path: "department", select: "name" },
        { path: "subject", select: "name code" },
      ],
    })
    .populate("originalSubmittingTeacher", "fullName employeeId");

/*
|--------------------------------------------------------------------------
| GET MY SUBJECT CORRECTION REQUESTS
|--------------------------------------------------------------------------
|
| GET /teacher/my-subject-corrections
|
| Returns correction requests routed to the authenticated teacher.
| A teacher can see their submitted and resolved requests as history.
|--------------------------------------------------------------------------
*/

exports.getMySubjectCorrectionRequests = asyncHandler(async (req, res) => {
  const { status } = req.query;

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid correction request status.",
    });
  }

  const filter = {
    originalSubmittingTeacher: req.teacher._id,
    isActive: true,
  };

  if (status) {
    filter.status = status;
  }

  const requests = await populateCorrectionRequest(
    SubjectResultCorrectionRequest.find(filter)
      .sort({ createdAt: -1 })
      .select(
        [
          "result",
          "resultRevision",
          "student",
          "academicSession",
          "term",
          "subject",
          "allocation",
          "originalSubmittingTeacher",
          "originalTeacherName",
          "originalScore",
          "proposedScore",
          "requestReason",
          "teacherReason",
          "adminReviewNote",
          "status",
          "requestedAt",
          "submittedAt",
          "reviewedAt",
          "createdAt",
          "updatedAt",
        ].join(" "),
      ),
  );

  return res.status(200).json({
    success: true,
    count: requests.length,
    requests,
  });
});

/*
|--------------------------------------------------------------------------
| GET ONE SUBJECT CORRECTION REQUEST
|--------------------------------------------------------------------------
|
| GET /teacher/subject-corrections/:requestId
|
| The request is scoped to the authenticated teacher.
| Changing the request ID cannot expose another teacher's request.
|--------------------------------------------------------------------------
*/

exports.getTeacherSubjectCorrectionRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;

  if (!isValidObjectId(requestId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid correction request ID.",
    });
  }

  const correctionRequest = await populateCorrectionRequest(
    SubjectResultCorrectionRequest.findOne({
      _id: requestId,
      originalSubmittingTeacher: req.teacher._id,
      isActive: true,
    }),
  );

  if (!correctionRequest) {
    return res.status(404).json({
      success: false,
      message: "Correction request not found.",
    });
  }

  return res.status(200).json({
    success: true,
    request: correctionRequest,
    canSubmit: editableStatuses.includes(correctionRequest.status),
  });
});

/*
|--------------------------------------------------------------------------
| SUBMIT A SUBJECT CORRECTION
|--------------------------------------------------------------------------
|
| PUT /teacher/subject-corrections/:requestId/submit
|
| The teacher submits corrected CA1, CA2, examination score and an
| explanation. The official result and parent ResultRevision remain
| unchanged until the administrator accepts the request.
|--------------------------------------------------------------------------
*/

exports.submitTeacherSubjectCorrection = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const { proposedScore, teacherReason } = req.body;

  if (!isValidObjectId(requestId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid correction request ID.",
    });
  }

  if (
    !proposedScore ||
    typeof proposedScore !== "object" ||
    Array.isArray(proposedScore)
  ) {
    return res.status(400).json({
      success: false,
      message: "A valid proposed score object is required.",
    });
  }

  const reason = typeof teacherReason === "string" ? teacherReason.trim() : "";

  if (reason.length < 5) {
    return res.status(400).json({
      success: false,
      message: "Please provide an explanation of at least 5 characters.",
    });
  }

  if (reason.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "The explanation cannot exceed 1000 characters.",
    });
  }

  let savedRequest;
  let session;

  try {
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      /*
       * 1. LOAD THE REQUEST FOR THIS TEACHER
       *
       * The original submitting teacher is the authority for access.
       * Current teacher assignments are deliberately not consulted.
       */

      const correctionRequest = await SubjectResultCorrectionRequest.findOne({
        _id: requestId,
        originalSubmittingTeacher: req.teacher._id,
        isActive: true,
      }).session(session);

      if (!correctionRequest) {
        const error = new Error("Correction request not found.");
        error.statusCode = 404;
        throw error;
      }

      /*
       * 2. CHECK THE REQUEST STATUS
       *
       * A teacher may submit a new response or revise a request
       * returned by the administrator.
       */

      if (!editableStatuses.includes(correctionRequest.status)) {
        const error = new Error(
          "This correction request is no longer available for editing.",
        );
        error.statusCode = 409;
        throw error;
      }

      /*
       * 3. CHECK THE PARENT REVISION
       *
       * The parent must still be an active subject-teacher revision
       * in draft status. Once submitted to the Principal, approved,
       * published or cancelled, it cannot receive further requests.
       */

      const parentRevision = await ResultRevision.findOne({
        _id: correctionRequest.resultRevision,
        result: correctionRequest.result,
        correctionSource: "subject_teacher",
        isActive: true,
        status: "draft",
      }).session(session);

      if (!parentRevision) {
        const error = new Error(
          "The parent result correction is no longer open for teacher responses.",
        );
        error.statusCode = 409;
        throw error;
      }

      /*
       * 4. VALIDATE THE PROPOSED SCORES
       *
       * The teacher cannot change whether the subject was offered.
       * That value is taken from the immutable original snapshot.
       */

      const originalOffered =
        correctionRequest.originalScore?.offered !== false;

      const scoreFields = [
        {
          field: "ca1",
          maximum: 20,
          label: "CA1",
        },
        {
          field: "ca2",
          maximum: 10,
          label: "CA2",
        },
        {
          field: "exam",
          maximum: 70,
          label: "Examination",
        },
      ];

      const cleanScore = {
        offered: originalOffered,
        ca1: null,
        ca2: null,
        exam: null,
        teacherComment: "",
      };

      if (originalOffered) {
        for (const item of scoreFields) {
          const value = proposedScore[item.field];

          if (
            value === undefined ||
            value === null ||
            value === "" ||
            !Number.isFinite(Number(value))
          ) {
            const error = new Error(`${item.label} score is required.`);
            error.statusCode = 400;
            throw error;
          }

          const numericValue = Number(value);

          if (numericValue < 0 || numericValue > item.maximum) {
            const error = new Error(
              `${item.label} must be between 0 and ${item.maximum}.`,
            );
            error.statusCode = 400;
            throw error;
          }

          cleanScore[item.field] = numericValue;
        }
      }

      if (
        proposedScore.teacherComment !== undefined &&
        proposedScore.teacherComment !== null
      ) {
        if (typeof proposedScore.teacherComment !== "string") {
          const error = new Error("Teacher comment must be text.");
          error.statusCode = 400;
          throw error;
        }

        cleanScore.teacherComment = proposedScore.teacherComment.trim();

        if (cleanScore.teacherComment.length > 1000) {
          const error = new Error(
            "Teacher comment cannot exceed 1000 characters.",
          );
          error.statusCode = 400;
          throw error;
        }
      }

      /*
       * 5. SAVE ONLY THE CORRECTION REQUEST
       *
       * Do not update:
       * - Result.subjectResults
       * - ResultRevision.proposedData
       * - ResultRevision.status
       *
       * The administrator reviews this proposed score separately.
       */

      correctionRequest.proposedScore = cleanScore;
      correctionRequest.teacherReason = reason;
      correctionRequest.status = "submitted";
      correctionRequest.submittedByTeacher = req.teacher._id;
      correctionRequest.submittedAt = new Date();

      correctionRequest.events.push({
        action: "teacher_submitted",
        actorType: "teacher",
        performedByTeacher: req.teacher._id,
        note: reason,
        performedAt: new Date(),
      });

      await correctionRequest.save({ session });

      savedRequest = {
        _id: correctionRequest._id,
        status: correctionRequest.status,
        proposedScore: correctionRequest.proposedScore,
        teacherReason: correctionRequest.teacherReason,
        submittedAt: correctionRequest.submittedAt,
      };
    });
  } catch (error) {
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
          "A conflicting correction operation occurred. Refresh and try again.",
      });
    }

    if (
      error.name === "VersionError" ||
      error.name === "WriteConflict" ||
      error.code === 112 ||
      error.code === 251 ||
      error.hasErrorLabel?.("TransientTransactionError") ||
      error.hasErrorLabel?.("UnknownTransactionCommitResult")
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This correction request changed during submission. Refresh and try again.",
      });
    }

    if (error.name === "ValidationError" || error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  } finally {
    if (session) {
      await session.endSession();
    }
  }

  /*
   * 6. AUDIT LOG AFTER SUCCESSFUL COMMIT
   */

  await createAuditLog({
    teacher: req.teacher._id,
    action: "SUBMIT_CORRECTION",
    module: "SUBJECT_RESULT_CORRECTIONS",
    description: `${req.teacher.fullName} submitted a subject result correction request (${requestId}).`,
    req,
  });

  return res.status(200).json({
    success: true,
    message:
      "Your proposed correction has been submitted for administrator review.",
    request: savedRequest,
  });
});
