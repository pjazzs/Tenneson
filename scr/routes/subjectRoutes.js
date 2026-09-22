const express = require("express");

const { getSubjects, getSubject } = require("../controllers/subjectController");

const { protect } = require("../middleware/authMiddleware");

const { authorizePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

// ===============================
// Get All Subjects
// ===============================

router.get(
  "/subjects",
  protect,
  authorizePermission("subjects.view"),
  getSubjects,
);

// ===============================
// Get Single Subject
// ===============================

router.get(
  "/subjects/:id",
  protect,
  authorizePermission("subjects.view"),
  getSubject,
);

module.exports = router;
