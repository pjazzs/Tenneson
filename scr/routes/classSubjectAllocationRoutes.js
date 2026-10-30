const express = require("express");

const {
  getAllocationOptions,
  getClassSubjectAllocations,
  createClassSubjectAllocation,
  updateClassSubjectAllocationStatus,
} = require("../controllers/classSubjectAllocationController");

const { protect } = require("../middleware/authMiddleware");

const { authorizePermission } = require("../middleware/permissionMiddleware");

const router = express.Router();

const BASE_PATH = "/class-subject-allocations";

// Get allocation options
router.get(
  `${BASE_PATH}/options`,
  protect,
  authorizePermission("class-subject-allocations.view"),
  getAllocationOptions,
);

// Get all allocations
router.get(
  BASE_PATH,
  protect,
  authorizePermission("class-subject-allocations.view"),
  getClassSubjectAllocations,
);

// Create allocation
router.post(
  BASE_PATH,
  protect,
  authorizePermission("class-subject-allocations.create"),
  createClassSubjectAllocation,
);

// Activate or deactivate allocation
router.patch(
  `${BASE_PATH}/:id/status`,
  protect,
  authorizePermission("class-subject-allocations.update"),
  updateClassSubjectAllocationStatus,
);

module.exports = router;
