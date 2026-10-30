const express = require("express");

const {
  getTeacherAssignmentOptions,
  getTeacherAssignments,
  createTeacherAssignment,
  updateTeacherAssignmentStatus,
  getSubjectResultResponsibilities,
  setSubjectResultResponsibility,
} = require("../controllers/teacherAssignmentController");

const { protect } = require("../middleware/authMiddleware");
const { authorizePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

const BASE_PATH = "/teacher-assignments";

// Assignment form options.
router.get(
  `${BASE_PATH}/options`,
  protect,
  authorizePermission("teacher-assignments.view"),
  getTeacherAssignmentOptions,
);

// List and filter assignments.
router.get(
  BASE_PATH,
  protect,
  authorizePermission("teacher-assignments.view"),
  getTeacherAssignments,
);

// Create assignment.
router.post(
  BASE_PATH,
  protect,
  authorizePermission("teacher-assignments.create"),
  createTeacherAssignment,
);

// Activate or deactivate assignment.
router.patch(
  `${BASE_PATH}/:id/status`,
  protect,
  authorizePermission("teacher-assignments.update"),
  updateTeacherAssignmentStatus,
);

// Get designated result teachers for a session and term.
router.get(
  `${BASE_PATH}/result-responsibilities`,
  protect,
  authorizePermission("teacher-assignments.view"),
  getSubjectResultResponsibilities,
);

// Designate or change the result-owning teacher.
router.put(
  `${BASE_PATH}/result-responsibilities/:allocationId`,
  protect,
  authorizePermission("teacher-assignments.update"),
  setSubjectResultResponsibility,
);

module.exports = router;
