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

const {
  getMySubjectCorrectionRequests,
  getTeacherSubjectCorrectionRequest,
  submitTeacherSubjectCorrection,
} = require("../controllers/teacherSubjectCorrectionController");

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

router.get(
  "/teacher/my-subject-results",
  requireTeacher,
  getMySubjectResultResponsibilities,
);

router.get(
  "/teacher/subject-results/:allocationId",
  requireTeacher,
  getTeacherSubjectResult,
);

router.put(
  "/teacher/subject-results/:allocationId/draft",
  requireTeacher,
  saveTeacherSubjectResultDraft,
);

router.post(
  "/teacher/subject-results/:allocationId/submit",
  requireTeacher,
  submitTeacherSubjectResult,
);

/*
|--------------------------------------------------------------------------
| TEACHER SUBJECT CORRECTION REQUESTS
|--------------------------------------------------------------------------
*/

// List correction requests routed to the logged-in teacher.
router.get(
  "/teacher/my-subject-corrections",
  requireTeacher,
  getMySubjectCorrectionRequests,
);

// View one correction request.
router.get(
  "/teacher/subject-corrections/:requestId",
  requireTeacher,
  getTeacherSubjectCorrectionRequest,
);

// Submit the teacher's proposed correction.
router.put(
  "/teacher/subject-corrections/:requestId/submit",
  requireTeacher,
  submitTeacherSubjectCorrection,
);

module.exports = router;
