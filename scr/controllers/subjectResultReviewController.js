const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const SubjectResultSubmission = require("../models/SubjectResultSubmission");
const SubjectResultResponsibility = require("../models/SubjectResultResponsibility");
const createAuditLog = require("../utils/createAuditLog");

const VALID_TERMS = ["first", "second", "third"];
const VALID_STATUSES = ["draft", "submitted", "approved", "rejected"];

const isValidObjectId = (value) =>
  typeof value === "string" && mongoose.isValidObjectId(value);

const populateSubmission = (query) =>
  query
    .populate({
      path: "allocation",
      populate: [
        { path: "schoolClass", select: "name level" },
        { path: "department", select: "name" },
        { path: "subject", select: "name code" },
      ],
    })
    .populate("academicSession", "name")
    .populate({
      path: "responsibility",
      populate: {
        path: "teacherAssignment",
        populate: {
          path: "teacher",
          select: "fullName email",
        },
      },
    })
    .populate("createdByTeacher", "fullName email")
    .populate("submittedByTeacher", "fullName email")
    .populate("approvedBy", "fullName")
    .populate("rejectedBy", "fullName");

const getAdminId = (req) => req.admin._id;

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

/*
|--------------------------------------------------------------------------
| GET SUBJECT RESULT SUBMISSIONS
|--------------------------------------------------------------------------
|
| GET /subject-result-submissions
|
| Optional query:
| status, academicSessionId, term, page, limit
|
*/

exports.getSubjectResultSubmissions = asyncHandler(async (req, res) => {
  const { status, academicSessionId, term, page = 1, limit = 20 } = req.query;

  const filter = {};

  if (status) {
    if (!VALID_STATUSES.includes(status)) {
      return sendError(res, 400, "Invalid submission status.");
    }

    filter.status = status;
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

  const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 20));

  const [submissions, total] = await Promise.all([
    populateSubmission(
      SubjectResultSubmission.find(filter)
        .sort({ submittedAt: -1, updatedAt: -1 })
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize),
    ).lean(),

    SubjectResultSubmission.countDocuments(filter),
  ]);

  return res.status(200).json({
    success: true,
    submissions,
    pagination: {
      total,
      page: currentPage,
      limit: pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
});

/*
|--------------------------------------------------------------------------
| GET ONE SUBJECT RESULT SUBMISSION
|--------------------------------------------------------------------------
|
| GET /subject-result-submissions/:id
|
*/

exports.getSubjectResultSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return sendError(res, 400, "Invalid subject result submission ID.");
  }

  const submission = await populateSubmission(
    SubjectResultSubmission.findById(id),
  ).lean();

  if (!submission) {
    return sendError(res, 404, "Subject result submission not found.");
  }

  return res.status(200).json({
    success: true,
    submission,
  });
});

/*
|--------------------------------------------------------------------------
| APPROVE SUBJECT RESULT SUBMISSION
|--------------------------------------------------------------------------
|
| PATCH /subject-result-submissions/:id/approve
|
| This approves the teacher's subject score sheet only.
| It does NOT approve or publish the official student result.
|
*/

exports.approveSubjectResultSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!isValidObjectId(id)) {
    return sendError(res, 400, "Invalid subject result submission ID.");
  }

  const dbSession = await mongoose.startSession();

  let approvedSubmission;
  let allocationLabel = "";
  let sessionName = "";
  let term = "";

  try {
    await dbSession.withTransaction(async () => {
      const submission =
        await SubjectResultSubmission.findById(id).session(dbSession);

      if (!submission) {
        const error = new Error("Subject result submission not found.");
        error.statusCode = 404;
        throw error;
      }

      if (submission.status !== "submitted") {
        const error = new Error(
          "Only submitted subject results can be approved.",
        );
        error.statusCode = 409;
        throw error;
      }

      const responsibility = await SubjectResultResponsibility.findById(
        submission.responsibility,
      ).session(dbSession);

      if (!responsibility) {
        const error = new Error(
          "The subject result responsibility no longer exists.",
        );
        error.statusCode = 409;
        throw error;
      }

      // Ensure this is still the current responsibility record.
      if (
        responsibility.allocation.toString() !==
          submission.allocation.toString() ||
        responsibility.academicSession.toString() !==
          submission.academicSession.toString() ||
        responsibility.term !== submission.term
      ) {
        const error = new Error(
          "The submission no longer matches its assigned responsibility.",
        );
        error.statusCode = 409;
        throw error;
      }

      // Update the shared responsibility document inside the same
      // transaction as the submission to protect against concurrent
      // teacher edits, submissions and administrator reassignment.
      responsibility.writeVersion = (responsibility.writeVersion || 0) + 1;

      await responsibility.save({ session: dbSession });

      submission.status = "approved";
      submission.approvedBy = getAdminId(req);
      submission.approvedAt = new Date();

      // Clear current rejection details, if any.
      submission.rejectionReason = "";
      submission.rejectedBy = null;
      submission.rejectedAt = null;

      await submission.save({ session: dbSession });

      approvedSubmission = submission;
      term = submission.term;
    });

    const populated = await populateSubmission(
      SubjectResultSubmission.findById(approvedSubmission._id),
    );

    const result = await populated;

    const allocation = result.allocation;
    allocationLabel = [
      allocation?.schoolClass?.name,
      allocation?.department?.name,
      allocation?.subject?.name,
    ]
      .filter(Boolean)
      .join(" / ");

    sessionName = result.academicSession?.name || "";

    await createAuditLog({
      user: getAdminId(req),
      action: "APPROVE_SUBJECT_RESULT_SUBMISSION",
      module: "SUBJECT_RESULTS",
      description:
        `${req.admin.fullName} approved the subject result submission for ` +
        `${allocationLabel}, ${term} term (${sessionName}).`,
      req,
    });

    return res.status(200).json({
      success: true,
      message: "Teacher subject result submission approved successfully.",
      submission: result,
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to approve subject result submission.",
    );
  } finally {
    await dbSession.endSession();
  }
});

/*
|--------------------------------------------------------------------------
| REJECT SUBJECT RESULT SUBMISSION
|--------------------------------------------------------------------------
|
| PATCH /subject-result-submissions/:id/reject
|
| Body:
| {
|   "reason": "Some examination scores need correction."
| }
|
| A rejection reason is mandatory.
| Rejection history is retained permanently.
|
*/

exports.rejectSubjectResultSubmission = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const reason =
    typeof req.body.reason === "string" ? req.body.reason.trim() : "";

  if (!isValidObjectId(id)) {
    return sendError(res, 400, "Invalid subject result submission ID.");
  }

  if (!reason) {
    return sendError(res, 400, "A rejection reason is required.");
  }

  if (reason.length > 1000) {
    return sendError(
      res,
      400,
      "The rejection reason cannot exceed 1000 characters.",
    );
  }

  const dbSession = await mongoose.startSession();

  let rejectedSubmission;
  let allocationLabel = "";
  let sessionName = "";
  let term = "";

  try {
    await dbSession.withTransaction(async () => {
      const submission =
        await SubjectResultSubmission.findById(id).session(dbSession);

      if (!submission) {
        const error = new Error("Subject result submission not found.");
        error.statusCode = 404;
        throw error;
      }

      if (submission.status !== "submitted") {
        const error = new Error(
          "Only submitted subject results can be rejected.",
        );
        error.statusCode = 409;
        throw error;
      }

      const responsibility = await SubjectResultResponsibility.findById(
        submission.responsibility,
      ).session(dbSession);

      if (!responsibility) {
        const error = new Error(
          "The subject result responsibility no longer exists.",
        );
        error.statusCode = 409;
        throw error;
      }

      if (
        responsibility.allocation.toString() !==
          submission.allocation.toString() ||
        responsibility.academicSession.toString() !==
          submission.academicSession.toString() ||
        responsibility.term !== submission.term
      ) {
        const error = new Error(
          "The submission no longer matches its assigned responsibility.",
        );
        error.statusCode = 409;
        throw error;
      }

      // Coordinate this review action with teacher writes and reassignment.
      responsibility.writeVersion = (responsibility.writeVersion || 0) + 1;

      await responsibility.save({ session: dbSession });

      const rejectedAt = new Date();

      submission.status = "rejected";
      submission.rejectionReason = reason;
      submission.rejectedBy = getAdminId(req);
      submission.rejectedAt = rejectedAt;

      submission.rejectionHistory.push({
        reason,
        rejectedBy: getAdminId(req),
        rejectedAt,
      });

      // Remove any previous approval metadata.
      submission.approvedBy = null;
      submission.approvedAt = null;

      await submission.save({ session: dbSession });

      rejectedSubmission = submission;
      term = submission.term;
    });

    const populated = await populateSubmission(
      SubjectResultSubmission.findById(rejectedSubmission._id),
    );

    const result = await populated;

    const allocation = result.allocation;
    allocationLabel = [
      allocation?.schoolClass?.name,
      allocation?.department?.name,
      allocation?.subject?.name,
    ]
      .filter(Boolean)
      .join(" / ");

    sessionName = result.academicSession?.name || "";

    await createAuditLog({
      user: getAdminId(req),
      action: "REJECT_SUBJECT_RESULT_SUBMISSION",
      module: "SUBJECT_RESULTS",
      description:
        `${req.admin.fullName} rejected the subject result submission for ` +
        `${allocationLabel}, ${term} term (${sessionName}). Reason: ${reason}`,
      req,
    });

    return res.status(200).json({
      success: true,
      message:
        "Subject result submission rejected and returned to the designated teacher for correction.",
      submission: result,
    });
  } catch (error) {
    return sendError(
      res,
      error.statusCode || 500,
      error.message || "Unable to reject subject result submission.",
    );
  } finally {
    await dbSession.endSession();
  }
});
