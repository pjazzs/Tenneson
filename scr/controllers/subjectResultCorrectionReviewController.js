const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const SubjectResultCorrectionRequest = require("../models/SubjectResultCorrectionRequest");
const ResultRevision = require("../models/ResultRevision");
const Result = require("../models/Result");

const createAuditLog = require("../utils/createAuditLog");

const VALID_TERMS = ["first", "second", "third"];

const VALID_STATUSES = [
  "pending_teacher",
  "submitted",
  "accepted",
  "returned",
  "cancelled",
];

const isValidObjectId = (value) =>
  typeof value === "string" && mongoose.isValidObjectId(value);

const getAdminId = (req) => req.admin._id;

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

const populateCorrectionRequest = (query) =>
  query
    .populate({
      path: "student",
      select: "studentId firstName lastName otherName currentClass",
    })
    .populate({
      path: "subject",
      select: "name code",
    })
    .populate({
      path: "academicSession",
      select: "name",
    })
    .populate({
      path: "result",
      select: "status currentClass term",
    })
    .populate({
      path: "resultRevision",
      select: "revisionNumber correctionSource status isActive",
    })
    .populate({
      path: "allocation",
      populate: [
        {
          path: "schoolClass",
          select: "name level",
        },
        {
          path: "department",
          select: "name",
        },
        {
          path: "subject",
          select: "name code",
        },
      ],
    })
    .populate({
      path: "originalSubmittingTeacher",
      select: "fullName email",
    })
    .populate({
      path: "requestedBy",
      select: "fullName email",
    })
    .populate({
      path: "reviewedBy",
      select: "fullName email",
    });

const createWorkflowError = (message, statusCode = 409) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

/*
|--------------------------------------------------------------------------
| VERIFY THE PARENT REVISION
|--------------------------------------------------------------------------
|
| Both acceptance and return require an active draft parent revision.
| The original published result must also remain unchanged.
|
*/

const findOpenParentRevision = async (correctionRequest, dbSession) => {
  const revision = await ResultRevision.findOne({
    _id: correctionRequest.resultRevision,
    result: correctionRequest.result,
    correctionSource: "subject_teacher",
    isActive: true,
    status: "draft",
  }).session(dbSession);

  if (!revision) {
    throw createWorkflowError(
      "The parent correction revision is no longer open for administrator review.",
    );
  }

  const officialResult = await Result.findById(
    correctionRequest.result,
  ).session(dbSession);

  if (!officialResult || officialResult.status !== "published") {
    throw createWorkflowError(
      "The original published result is no longer available for correction.",
    );
  }

  const originalUpdatedAt = revision.originalSnapshot?.updatedAt
    ? new Date(revision.originalSnapshot.updatedAt).getTime()
    : null;

  const currentUpdatedAt = officialResult.updatedAt
    ? new Date(officialResult.updatedAt).getTime()
    : null;

  if (
    originalUpdatedAt === null ||
    currentUpdatedAt === null ||
    originalUpdatedAt !== currentUpdatedAt
  ) {
    throw createWorkflowError(
      "The published result has changed since this correction revision was opened. Review the latest result before continuing.",
    );
  }

  return revision;
};

/*
|--------------------------------------------------------------------------
| VALIDATE THE TEACHER'S PROPOSED SCORE
|--------------------------------------------------------------------------
*/

const validateProposedScore = (correctionRequest) => {
  const proposed = correctionRequest.proposedScore;
  const originalOffered = correctionRequest.originalScore?.offered !== false;

  if (!proposed || typeof proposed !== "object") {
    throw createWorkflowError(
      "The teacher has not provided a proposed score.",
      400,
    );
  }

  if (proposed.offered !== originalOffered) {
    throw createWorkflowError(
      "The proposed correction cannot change whether the student offered this subject.",
      409,
    );
  }

  const cleanScore = {
    offered: originalOffered,
    ca1: null,
    ca2: null,
    exam: null,
    teacherComment: "",
  };

  if (originalOffered) {
    const scoreFields = [
      { field: "ca1", label: "CA1", maximum: 20 },
      { field: "ca2", label: "CA2", maximum: 10 },
      { field: "exam", label: "Examination", maximum: 70 },
    ];

    for (const item of scoreFields) {
      const value = proposed[item.field];

      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > item.maximum
      ) {
        throw createWorkflowError(
          `${item.label} must be a valid number between 0 and ${item.maximum}.`,
          400,
        );
      }

      cleanScore[item.field] = value;
    }
  }

  console.log(
    "TEACHER COMMENT:",
    proposed.teacherComment,
    typeof proposed.teacherComment,
  );

  if (
    proposed.teacherComment !== undefined &&
    proposed.teacherComment !== null &&
    typeof proposed.teacherComment !== "string"
  ) {
    throw createWorkflowError("The teacher comment must be text.", 400);
  }

  cleanScore.teacherComment =
    typeof proposed.teacherComment === "string"
      ? proposed.teacherComment.trim()
      : "";

  if (cleanScore.teacherComment.length > 1000) {
    throw createWorkflowError(
      "The teacher comment cannot exceed 1000 characters.",
      400,
    );
  }

  return cleanScore;
};

/*
|--------------------------------------------------------------------------
| GET SUBJECT RESULT CORRECTION REQUESTS
|--------------------------------------------------------------------------
|
| GET /subject-result-correction-requests
|
| Query:
| status=submitted (default)
| status=all
| academicSessionId
| term
| resultRevisionId
| page
| limit
|
*/

exports.getSubjectResultCorrectionRequests = asyncHandler(async (req, res) => {
  const {
    status = "submitted",
    academicSessionId,
    term,
    resultRevisionId,
    page = 1,
    limit = 20,
  } = req.query;

  const filter = {};

  if (status !== "all") {
    if (!VALID_STATUSES.includes(status)) {
      return sendError(res, 400, "Invalid subject correction request status.");
    }

    filter.status = status;
    filter.isActive = status !== "cancelled";
  }

  if (academicSessionId) {
    if (!isValidObjectId(academicSessionId)) {
      return sendError(res, 400, "Invalid academic session ID.");
    }

    filter.academicSession = academicSessionId;
  }

  if (term) {
    if (!VALID_TERMS.includes(term)) {
      return sendError(res, 400, "Invalid academic term.");
    }

    filter.term = term;
  }

  if (resultRevisionId) {
    if (!isValidObjectId(resultRevisionId)) {
      return sendError(res, 400, "Invalid result revision ID.");
    }

    filter.resultRevision = resultRevisionId;
  }

  const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);

  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));

  const [correctionRequests, total] = await Promise.all([
    populateCorrectionRequest(
      SubjectResultCorrectionRequest.find(filter)
        .sort({ submittedAt: -1, updatedAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize),
    ).lean(),

    SubjectResultCorrectionRequest.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    correctionRequests,
    pagination: {
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  });
});

/*
|--------------------------------------------------------------------------
| GET ONE SUBJECT RESULT CORRECTION REQUEST
|--------------------------------------------------------------------------
|
| GET /subject-result-correction-requests/:id
|
*/

exports.getSubjectResultCorrectionRequest = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return sendError(res, 400, "Invalid subject correction request ID.");
  }

  const correctionRequest = await populateCorrectionRequest(
    SubjectResultCorrectionRequest.findById(id),
  ).lean();

  if (!correctionRequest) {
    return sendError(res, 404, "Subject correction request not found.");
  }

  return res.status(200).json({
    success: true,
    correctionRequest,
  });
});

/*
|--------------------------------------------------------------------------
| ACCEPT SUBJECT RESULT CORRECTION REQUEST
|--------------------------------------------------------------------------
|
| PATCH /subject-result-correction-requests/:id/accept
|
| Optional body:
| {
|   "note": "Scores verified against the approved correction."
| }
|
| The accepted score is merged into the matching subject in the
| parent ResultRevision. The official Result is never modified here.
|
*/

exports.acceptSubjectResultCorrectionRequest = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, 400, "Invalid subject correction request ID.");
    }

    const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

    if (req.body?.note !== undefined && typeof req.body.note !== "string") {
      return sendError(res, 400, "Review note must be text.");
    }

    if (note.length > 2000) {
      return sendError(res, 400, "Review note cannot exceed 2000 characters.");
    }

    const dbSession = await mongoose.startSession();

    let acceptedRequestId = null;
    let acceptedRevisionId = null;

    try {
      await dbSession.withTransaction(async () => {
        const correctionRequest = await SubjectResultCorrectionRequest.findOne({
          _id: id,
          isActive: true,
        }).session(dbSession);

        if (!correctionRequest) {
          throw createWorkflowError(
            "Subject correction request not found.",
            404,
          );
        }

        if (correctionRequest.status !== "submitted") {
          throw createWorkflowError(
            "Only submitted teacher correction requests can be accepted.",
          );
        }

        const revision = await findOpenParentRevision(
          correctionRequest,
          dbSession,
        );

        const cleanScore = validateProposedScore(correctionRequest);

        /*
         * Find the exact subject in the parent revision.
         * Do not replace the complete subjectResults array with
         * the teacher's individual score.
         */

        const proposedData = revision.proposedData || {};

        if (!Array.isArray(proposedData.subjectResults)) {
          throw createWorkflowError(
            "The parent revision does not contain valid subject result data.",
          );
        }

        const subjectId = correctionRequest.subject.toString();

        const matchingIndexes = [];

        proposedData.subjectResults.forEach((item, index) => {
          if (item.subjectId && item.subjectId.toString() === subjectId) {
            matchingIndexes.push(index);
          }
        });

        if (matchingIndexes.length !== 1) {
          throw createWorkflowError(
            matchingIndexes.length === 0
              ? "The requested subject was not found in the parent correction revision."
              : "The subject appears more than once in the parent correction revision. Manual review is required.",
          );
        }

        const subjectResults = proposedData.subjectResults.map(
          (item, index) => {
            if (index !== matchingIndexes[0]) {
              return item;
            }

            return {
              ...item,
              offered: cleanScore.offered,
              ca1: cleanScore.ca1,
              ca2: cleanScore.ca2,
              exam: cleanScore.exam,
              teacherComment: cleanScore.teacherComment,
            };
          },
        );

        revision.proposedData = {
          ...proposedData,
          subjectResults,
        };

        revision.markModified("proposedData");
        revision.updatedBy = getAdminId(req);

        revision.events.push({
          action: "updated",
          performedBy: getAdminId(req),
          note: `Administrator accepted subject correction request ${correctionRequest._id}.`,
          performedAt: new Date(),
        });

        const reviewedAt = new Date();

        correctionRequest.status = "accepted";
        correctionRequest.adminReviewNote = note;
        correctionRequest.reviewedBy = getAdminId(req);
        correctionRequest.reviewedAt = reviewedAt;

        correctionRequest.events.push({
          action: "accepted",
          actorType: "admin",
          performedByAdmin: getAdminId(req),
          note,
          performedAt: reviewedAt,
        });

        await revision.save({ session: dbSession });
        await correctionRequest.save({ session: dbSession });

        acceptedRequestId = correctionRequest._id;
        acceptedRevisionId = revision._id;
      });

      await createAuditLog({
        user: getAdminId(req),
        action: "ACCEPT_SUBJECT_RESULT_CORRECTION_REQUEST",
        module: "SUBJECT_RESULT_CORRECTIONS",
        description:
          `${req.admin.fullName} accepted subject correction request ` +
          `${acceptedRequestId} in result revision ${acceptedRevisionId}.`,
        req,
      });

      const populatedRequest = await populateCorrectionRequest(
        SubjectResultCorrectionRequest.findById(acceptedRequestId),
      ).lean();

      return res.status(200).json({
        success: true,
        message:
          "Teacher correction accepted and merged into the parent result revision. The published result remains unchanged.",
        correctionRequest: populatedRequest,
      });
    } catch (error) {
      if (error.code === 11000) {
        return sendError(
          res,
          409,
          "A conflicting correction review operation occurred. Refresh and try again.",
        );
      }

      if (
        error.name === "VersionError" ||
        error.name === "WriteConflict" ||
        error.code === 112 ||
        error.code === 251 ||
        error.hasErrorLabel?.("TransientTransactionError") ||
        error.hasErrorLabel?.("UnknownTransactionCommitResult")
      ) {
        return sendError(
          res,
          409,
          "The correction request changed during review. Refresh and try again.",
        );
      }

      return sendError(
        res,
        error.statusCode || 500,
        error.message || "Unable to accept subject correction request.",
      );
    } finally {
      await dbSession.endSession();
    }
  },
);

/*
|--------------------------------------------------------------------------
| RETURN SUBJECT RESULT CORRECTION REQUEST
|--------------------------------------------------------------------------
|
| PATCH /subject-result-correction-requests/:id/return
|
| Body:
| {
|   "reason": "Please verify the examination score and resubmit."
| }
|
| The teacher can edit and resubmit a returned request.
|
*/

exports.returnSubjectResultCorrectionRequest = asyncHandler(
  async (req, res) => {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return sendError(res, 400, "Invalid subject correction request ID.");
    }

    const reason =
      typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (reason.length < 5) {
      return sendError(
        res,
        400,
        "A return explanation of at least 5 characters is required.",
      );
    }

    if (reason.length > 2000) {
      return sendError(
        res,
        400,
        "The return explanation cannot exceed 2000 characters.",
      );
    }

    const dbSession = await mongoose.startSession();

    let returnedRequestId = null;
    let returnedRevisionId = null;

    try {
      await dbSession.withTransaction(async () => {
        const correctionRequest = await SubjectResultCorrectionRequest.findOne({
          _id: id,
          isActive: true,
        }).session(dbSession);

        if (!correctionRequest) {
          throw createWorkflowError(
            "Subject correction request not found.",
            404,
          );
        }

        if (correctionRequest.status !== "submitted") {
          throw createWorkflowError(
            "Only submitted teacher correction requests can be returned.",
          );
        }

        await findOpenParentRevision(correctionRequest, dbSession);

        const reviewedAt = new Date();

        correctionRequest.status = "returned";
        correctionRequest.adminReviewNote = reason;
        correctionRequest.reviewedBy = getAdminId(req);
        correctionRequest.reviewedAt = reviewedAt;

        correctionRequest.events.push({
          action: "returned",
          actorType: "admin",
          performedByAdmin: getAdminId(req),
          note: reason,
          performedAt: reviewedAt,
        });

        await correctionRequest.save({ session: dbSession });

        returnedRequestId = correctionRequest._id;
        returnedRevisionId = correctionRequest.resultRevision;
      });

      await createAuditLog({
        user: getAdminId(req),
        action: "RETURN_SUBJECT_RESULT_CORRECTION_REQUEST",
        module: "SUBJECT_RESULT_CORRECTIONS",
        description:
          `${req.admin.fullName} returned subject correction request ` +
          `${returnedRequestId} to the original teacher. Reason: ${reason}`,
        req,
      });

      const populatedRequest = await populateCorrectionRequest(
        SubjectResultCorrectionRequest.findById(returnedRequestId),
      ).lean();

      return res.status(200).json({
        success: true,
        message:
          "Correction request returned to the original teacher for revision.",
        correctionRequest: populatedRequest,
      });
    } catch (error) {
      if (
        error.name === "VersionError" ||
        error.name === "WriteConflict" ||
        error.code === 112 ||
        error.code === 251 ||
        error.hasErrorLabel?.("TransientTransactionError") ||
        error.hasErrorLabel?.("UnknownTransactionCommitResult")
      ) {
        return sendError(
          res,
          409,
          "The correction request changed during review. Refresh and try again.",
        );
      }

      return sendError(
        res,
        error.statusCode || 500,
        error.message || "Unable to return subject correction request.",
      );
    } finally {
      await dbSession.endSession();
    }
  },
);
