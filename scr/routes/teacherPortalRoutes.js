const express = require("express");

const {
  getMyTeacherAssignments,
} = require("../controllers/teacherPortalController");

const { requireTeacher } = require("../middleware/teacherAuthMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| TEACHER PORTAL ROUTES
|--------------------------------------------------------------------------
*/

// Get assignments belonging to the authenticated teacher.
router.get("/teacher/my-assignments", requireTeacher, getMyTeacherAssignments);

module.exports = router;
