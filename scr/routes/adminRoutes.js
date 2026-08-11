const express = require("express");

const router = express.Router();

const {
  getAdmins,
  updatePermissions,
  deleteAdmin,
} = require("../controllers/adminController");

const { protect } = require("../middleware/authMiddleware");

const {
  authorizePermission,
} = require("../middleware/permissionMiddleware");

// ===============================
// Get All Admins
// ===============================

router.get(
  "/admins",
  protect,
  authorizePermission("admins.manage"),
  getAdmins
);

// ===============================
// Update Admin Permissions
// ===============================

router.patch(
  "/admins/:id/permissions",
  protect,
  authorizePermission("admins.update"),
  updatePermissions
);

// ===============================
// Delete Admin
// ===============================

router.delete(
  "/admins/:id",
  protect,
  authorizePermission("admins.delete"),
  deleteAdmin
);

module.exports = router;