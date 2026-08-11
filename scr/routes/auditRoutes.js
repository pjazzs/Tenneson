const express = require("express");

const router = express.Router();

const {
  getAuditLogs,
} = require("../controllers/auditController");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  authorize,
} = require("../middleware/authorize");

// ===============================
// Get Audit Logs
// ===============================

router.get(
  "/audit",
  protect,
  authorize("super_admin", "admin"),
  getAuditLogs
);

module.exports = router;