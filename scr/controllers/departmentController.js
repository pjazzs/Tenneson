const asyncHandler = require("express-async-handler");
const Department = require("../models/Department");

// @desc    Get active departments
// @route   GET /api/v1/departments
// @access  Private - students.update permission
exports.getDepartments = asyncHandler(async (req, res) => {
  const departments = await Department.find({
    isActive: true,
  })
    .select("_id name code")
    .sort({ name: 1 });

  return res.status(200).json({
    success: true,
    count: departments.length,
    departments,
  });
});
