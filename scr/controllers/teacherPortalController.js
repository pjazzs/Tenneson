const asyncHandler = require("express-async-handler");

const TeacherAssignment = require("../models/TeacherAssignment");

/*
|--------------------------------------------------------------------------
| CHECK WHETHER AN ASSIGNMENT IS AVAILABLE TO THE TEACHER
|--------------------------------------------------------------------------
*/

const isAssignmentAvailable = (assignment) => {
  const allocation = assignment.allocation;

  if (!allocation || !allocation.isActive) {
    return false;
  }

  if (!allocation.schoolClass?.isActive) {
    return false;
  }

  if (!allocation.subject?.isActive) {
    return false;
  }

  if (allocation.department && !allocation.department.isActive) {
    return false;
  }

  return true;
};

/*
|--------------------------------------------------------------------------
| GET AUTHENTICATED TEACHER'S ASSIGNMENTS
|--------------------------------------------------------------------------
|
| GET /api/v1/teacher/my-assignments
|
| Returns only active assignments belonging to the authenticated teacher.
| The teacher ID comes from requireTeacher middleware.
|
*/

exports.getMyTeacherAssignments = asyncHandler(async (req, res) => {
  const teacherId = req.teacher._id;

  const assignments = await TeacherAssignment.find({
    teacher: teacherId,
    isActive: true,
  })
    .populate({
      path: "allocation",
      select: "schoolClass department subject isActive",
      populate: [
        {
          path: "schoolClass",
          select: "name level hasDepartments isActive",
        },
        {
          path: "department",
          select: "name code isActive",
        },
        {
          path: "subject",
          select: "name code isActive",
        },
      ],
    })
    .populate({
      path: "academicSession",
      select: "name isActive terms",
    })
    .sort({ createdAt: -1 })
    .lean();

  // Exclude assignments whose allocation or linked academic records
  // have subsequently been deactivated.
  const availableAssignments = assignments.filter(isAssignmentAvailable);

  return res.status(200).json({
    success: true,
    totalAssignments: availableAssignments.length,
    assignments: availableAssignments,
  });
});
