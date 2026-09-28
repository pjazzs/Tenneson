const express = require("express");

const {
  getAcademicSessions,
  getAcademicSession,
  createAcademicSession,
  updateAcademicSession,
} = require("../controllers/academicSessionController");

const { protect } = require("../middleware/authMiddleware");

const { authorizePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// ===============================
// Get All Academic Sessions
// ===============================

router.get(
  "/academic-sessions",
  protect,
  authorizePermission("academic-sessions.view"),
  getAcademicSessions,
);

// ===============================
// Get Single Academic Session
// ===============================

router.get(
  "/academic-sessions/:id",
  protect,
  authorizePermission("academic-sessions.view"),
  getAcademicSession,
);

// ===============================
// Create Academic Session
// ===============================

router.post(
  "/academic-sessions",
  protect,
  authorizePermission("academic-sessions.create"),
  createAcademicSession,
);

// ===============================
// Update Academic Session
// ===============================

router.put(
  "/academic-sessions/:id",
  protect,
  authorizePermission("academic-sessions.update"),
  updateAcademicSession,
);

module.exports = router;
