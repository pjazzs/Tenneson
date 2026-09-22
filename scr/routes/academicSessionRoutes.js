const express = require("express");

const {
  getAcademicSessions,
  getAcademicSession,
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

module.exports = router;
