const express = require("express");

const {
  loginStudent,
  changeStudentPassword,
  createStudentCredential,
  resetStudentPassword,
  getMyProfile,
} = require("../controllers/studentAuthController");

const { protect } = require("../middleware/authMiddleware");

const {
  requireStudentPasswordChanged,
} = require("../middleware/studentAuthMiddleware");

const { authorizePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| STUDENT LOGIN
|--------------------------------------------------------------------------
|
| Public route.
|
| Student logs in with:
|
| username = Student ID
| password = Student password
|
| POST /student/login
|
*/
router.post("/student/login", loginStudent);

/*
|--------------------------------------------------------------------------
| STUDENT CHANGE PASSWORD
|--------------------------------------------------------------------------
|
| Used for:
|
| 1. First-login password change
| 2. Normal authenticated password change
|
| The controller accepts:
|
| - student
|
| or
|
| - student_password_change
|
| JWT tokens.
|
| PATCH /student/change-password
|
*/
router.patch("/student/change-password", changeStudentPassword);

/*
|--------------------------------------------------------------------------
| CURRENT STUDENT PROFILE
|--------------------------------------------------------------------------
|
| Only an authenticated student who has completed
| the required password change can access this route.
|
| GET /student/me
|
*/
router.get("/student/me", requireStudentPasswordChanged, getMyProfile);

/*
|--------------------------------------------------------------------------
| CREATE STUDENT LOGIN CREDENTIAL
|--------------------------------------------------------------------------
|
| ADMIN ONLY
|
| Creates a login account for an existing student.
|
| Example:
|
| POST /students/TCC00001/credentials
|
| Body:
|
| {
|   "password": "Student@123"
| }
|
| The password is optional.
|
| If omitted, the controller generates a secure
| temporary password.
|
| The student will be required to change the
| temporary password after first login.
|
*/
router.post(
  "/students/:studentId/credentials",
  protect,
  authorizePermission("students.update"),
  createStudentCredential,
);

/*
|--------------------------------------------------------------------------
| RESET STUDENT PASSWORD
|--------------------------------------------------------------------------
|
| ADMIN ONLY
|
| Resets an existing student's password.
|
| Example:
|
| PATCH /students/TCC00001/reset-password
|
| Body:
|
| {
|   "password": "NewStudent@123"
| }
|
| The password is optional.
|
| If omitted, the controller generates a secure
| temporary password.
|
| The student will be required to change the
| temporary password after login.
|
*/
router.patch(
  "/students/:studentId/reset-password",
  protect,
  authorizePermission("students.update"),
  resetStudentPassword,
);

/*
|--------------------------------------------------------------------------
| EXPORT ROUTER
|--------------------------------------------------------------------------
*/

module.exports = router;
