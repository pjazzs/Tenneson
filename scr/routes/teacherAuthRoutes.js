const express = require("express");

const {
  loginTeacher,
  changeTeacherPassword,
  getMyTeacherProfile,
} = require("../controllers/teacherAuthController");

const { requireTeacher } = require("../middleware/teacherAuthMiddleware");

const {
  authLimiter,
  passwordChangeLimiter,
} = require("../middleware/rateLimiter");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| TEACHER LOGIN
|--------------------------------------------------------------------------
|
| POST /api/v1/teacher/login
|
*/

router.post("/teacher/login", authLimiter, loginTeacher);

/*
|--------------------------------------------------------------------------
| CHANGE TEACHER PASSWORD
|--------------------------------------------------------------------------
|
| PATCH /api/v1/teacher/change-password
|
| Supports first-login and normal password changes.
|
*/

router.patch(
  "/teacher/change-password",
  passwordChangeLimiter,
  changeTeacherPassword,
);

/*
|--------------------------------------------------------------------------
| CURRENT TEACHER PROFILE
|--------------------------------------------------------------------------
|
| GET /api/v1/teacher/me
|
| Requires a normal teacher access token and a changed password.
|
*/

router.get("/teacher/me", requireTeacher, getMyTeacherProfile);

module.exports = router;
