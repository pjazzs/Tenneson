const express = require("express");

const {
  getSubjectResultCorrectionRequests,
  getSubjectResultCorrectionRequest,
  acceptSubjectResultCorrectionRequest,
  returnSubjectResultCorrectionRequest,
} = require("../controllers/subjectResultCorrectionReviewController");

const { protect } = require("../middleware/authMiddleware");
const { authorizePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| ADMIN SUBJECT RESULT CORRECTION REVIEW
|--------------------------------------------------------------------------
*/

// List correction requests.
// Defaults to submitted requests awaiting administrator review.
router.get(
  "/subject-result-correction-requests",
  protect,
  authorizePermission("results.view"),
  getSubjectResultCorrectionRequests,
);

// Inspect one correction request.
router.get(
  "/subject-result-correction-requests/:id",
  protect,
  authorizePermission("results.view"),
  getSubjectResultCorrectionRequest,
);

// Accept a teacher's proposed correction.
router.patch(
  "/subject-result-correction-requests/:id/accept",
  protect,
  authorizePermission("results.approve"),
  acceptSubjectResultCorrectionRequest,
);

// Return a teacher's proposed correction with a mandatory explanation.
router.patch(
  "/subject-result-correction-requests/:id/return",
  protect,
  authorizePermission("results.approve"),
  returnSubjectResultCorrectionRequest,
);

module.exports = router;
