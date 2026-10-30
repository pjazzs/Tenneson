const express = require("express");

const {
  createTeacher,
  getTeachers,
  getTeacher,
  updateTeacher,
  updateTeacherStatus,
  resetTeacherPassword,
} = require("../controllers/teacherController");

const { protect } = require("../middleware/authMiddleware");
const { authorizePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| TEACHER MANAGEMENT
|--------------------------------------------------------------------------
*/

// Create teacher.
router.post(
  "/teachers",
  protect,
  authorizePermission("teachers.create"),
  createTeacher,
);

// List teachers.
router.get(
  "/teachers",
  protect,
  authorizePermission("teachers.view"),
  getTeachers,
);

// Activate / deactivate teacher.
router.patch(
  "/teachers/:id/status",
  protect,
  authorizePermission("teachers.update"),
  updateTeacherStatus,
);

// Reset teacher password.
router.patch(
  "/teachers/:id/reset-password",
  protect,
  authorizePermission("teachers.password-reset"),
  resetTeacherPassword,
);

// Retrieve one teacher.
router.get(
  "/teachers/:id",
  protect,
  authorizePermission("teachers.view"),
  getTeacher,
);

// Update teacher profile.
router.patch(
  "/teachers/:id",
  protect,
  authorizePermission("teachers.update"),
  updateTeacher,
);

module.exports = router;
