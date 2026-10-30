const express = require("express");

const {
  getMyTeacherAssignments,
} = require("../controllers/teacherPortalController");

const {
  getMySubjectResultResponsibilities,
  getTeacherSubjectResult,
  saveTeacherSubjectResultDraft,
  submitTeacherSubjectResult,
} = require("../controllers/teacherSubjectResultController");

const { requireTeacher } = require("../middleware/teacherAuthMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| TEACHER ASSIGNMENTS
|--------------------------------------------------------------------------
*/

router.get("/teacher/my-assignments", requireTeacher, getMyTeacherAssignments);

/*
|--------------------------------------------------------------------------
| TEACHER SUBJECT RESULTS
|--------------------------------------------------------------------------
*/

// List the teacher's assigned subject-result responsibilities.
router.get(
  "/teacher/my-subject-results",
  requireTeacher,
  getMySubjectResultResponsibilities,
);

// View eligible students and existing scores for one subject.
router.get(
  "/teacher/subject-results/:allocationId",
  requireTeacher,
  getTeacherSubjectResult,
);

// Save or update a subject-result draft.
router.put(
  "/teacher/subject-results/:allocationId/draft",
  requireTeacher,
  saveTeacherSubjectResultDraft,
);

// Submit a completed subject result.
router.post(
  "/teacher/subject-results/:allocationId/submit",
  requireTeacher,
  submitTeacherSubjectResult,
);

module.exports = router;
