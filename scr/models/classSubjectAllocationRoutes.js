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

/*
|--------------------------------------------------------------------------
| CLASS-SUBJECT ALLOCATIONS
|--------------------------------------------------------------------------
*/

// Options for the allocation form.
router.get(
  "/class-subject-allocations/options",
  protect,
  authorizePermission("class-subject-allocations.view"),
  getAllocationOptions,
);

// List allocations.
router.get(
  "/class-subject-allocations",
  protect,
  authorizePermission("class-subject-allocations.view"),
  getClassSubjectAllocations,
);

// Create an allocation.
router.post(
  "/class-subject-allocations",
  protect,
  authorizePermission("class-subject-allocations.create"),
  createClassSubjectAllocation,
);

// Activate or deactivate an allocation.
router.patch(
  "/class-subject-allocations/:id/status",
  protect,
  authorizePermission("class-subject-allocations.update"),
  updateClassSubjectAllocationStatus,
);

module.exports = router;
