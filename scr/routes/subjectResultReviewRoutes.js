const express = require("express");

const {
  getSubjectResultSubmissions,
  getSubjectResultSubmission,
  approveSubjectResultSubmission,
  rejectSubjectResultSubmission,
} = require("../controllers/subjectResultReviewController");

const { protect } = require("../middleware/authMiddleware");
const { authorizePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| ADMIN SUBJECT RESULT REVIEW
|--------------------------------------------------------------------------
*/

// List submissions.
router.get(
  "/subject-result-submissions",
  protect,
  authorizePermission("results.view"),
  getSubjectResultSubmissions,
);

// Get one submission and its score details.
router.get(
  "/subject-result-submissions/:id",
  protect,
  authorizePermission("results.view"),
  getSubjectResultSubmission,
);

// Approve a teacher's subject result submission.
router.patch(
  "/subject-result-submissions/:id/approve",
  protect,
  authorizePermission("results.approve"),
  approveSubjectResultSubmission,
);

// Reject a teacher's subject result submission.
router.patch(
  "/subject-result-submissions/:id/reject",
  protect,
  authorizePermission("results.approve"),
  rejectSubjectResultSubmission,
);

module.exports = router;
