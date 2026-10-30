const express = require("express");
const router = express.Router();

const { getDepartments } = require("../controllers/departmentController");

const { protect } = require("../middleware/authMiddleware");
const { authorizePermission } = require("../middleware/permissionMiddleware");

router.get(
  "/departments",
  protect,
  authorizePermission("students.update"),
  getDepartments,
);

module.exports = router;
