const express = require("express");

const {
  createResult,
  getResults,
  getResult,
  updateResult,
  submitResult,
  approveResult,
  updatePrincipalComment,
  publishResult,
  getMyPublishedResults,
  getMyPublishedResult,
  getStudentResultHistory,
  getResultStatistics,
} = require("../controllers/resultController");

const { protect } = require("../middleware/authMiddleware");
const { authorizePermission } = require("../middleware/permissionMiddleware");

const {
  requireStudentPasswordChanged,
} = require("../middleware/studentAuthMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| ADMIN RESULT ROUTES
|--------------------------------------------------------------------------
*/

/*
 * Create a new result draft
 */
router.post(
  "/results",
  protect,
  authorizePermission("results.create"),
  createResult,
);

/*
 * Get result list
 */
router.get(
  "/results",
  protect,
  authorizePermission("results.view"),
  getResults,
);

/*
 * Get result statistics
 *
 * IMPORTANT:
 * This route must appear before /results/:id.
 */
router.get(
  "/results/statistics",
  protect,
  authorizePermission("results.view"),
  getResultStatistics,
);

/*
|--------------------------------------------------------------------------
| STUDENT RESULT ROUTES
|--------------------------------------------------------------------------
|
| These routes use student authentication, not admin authentication.
|
| A student must have completed the required first-login
| password change before accessing published results.
|
| IMPORTANT:
| These routes must appear before /results/:id.
|
|--------------------------------------------------------------------------
*/

/*
 * Get all published results belonging to
 * the authenticated student.
 *
 * IMPORTANT:
 * No studentId is accepted from the browser.
 *
 * The authenticated student's identity comes from
 * the student authentication middleware.
 */
router.get("/results/my", requireStudentPasswordChanged, getMyPublishedResults);

/*
 * Get one published result belonging to
 * the authenticated student.
 *
 * IMPORTANT:
 * The result controller must verify that the result
 * belongs to the authenticated student.
 */
router.get(
  "/results/my/:id",
  requireStudentPasswordChanged,
  getMyPublishedResult,
);

/*
|--------------------------------------------------------------------------
| ADMIN RESULT ROUTES — CONTINUED
|--------------------------------------------------------------------------
*/

/*
 * Get a specific student's complete result history
 */
router.get(
  "/results/student/:studentId/history",
  protect,
  authorizePermission("results.view"),
  getStudentResultHistory,
);

/*
 * Get a single result
 *
 * IMPORTANT:
 * This dynamic route must come AFTER all specific
 * /results/... routes such as:
 *
 * /results/statistics
 * /results/my
 * /results/my/:id
 * /results/student/:studentId/history
 */
router.get(
  "/results/:id",
  protect,
  authorizePermission("results.view"),
  getResult,
);

/*
 * Update a draft result
 */
router.put(
  "/results/:id",
  protect,
  authorizePermission("results.update"),
  updateResult,
);

/*
 * Submit result for Principal review
 */
router.patch(
  "/results/:id/submit",
  protect,
  authorizePermission("results.submit"),
  submitResult,
);

/*
 * Approve result
 */
router.patch(
  "/results/:id/approve",
  protect,
  authorizePermission("results.approve"),
  approveResult,
);

/*
 * Update Principal comment
 */
router.patch(
  "/results/:id/principal-comment",
  protect,
  authorizePermission("results.approve"),
  updatePrincipalComment,
);

/*
 * Publish result
 */
router.patch(
  "/results/:id/publish",
  protect,
  authorizePermission("results.publish"),
  publishResult,
);

module.exports = router;
