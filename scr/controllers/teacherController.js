const crypto = require("crypto");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const Teacher = require("../models/Teacher");
const createAuditLog = require("../utils/createAuditLog");

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const escapeRegex = (value) => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const generateTemporaryPassword = () => {
  return crypto.randomBytes(12).toString("base64url").slice(0, 16);
};

const validateTeacherId = (id, res) => {
  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid teacher ID.",
    });
    return false;
  }

  return true;
};

const handleDuplicateError = (error, res) => {
  if (error.code !== 11000) return false;

  const duplicateField = Object.keys(error.keyPattern || {})[0];

  const messages = {
    email: "A teacher with this email address already exists.",
    employeeId: "This employee ID is already assigned to another teacher.",
  };

  res.status(409).json({
    success: false,
    message: messages[duplicateField] || "A duplicate teacher record exists.",
  });

  return true;
};

/*
|--------------------------------------------------------------------------
| CREATE TEACHER
|--------------------------------------------------------------------------
*/

exports.createTeacher = asyncHandler(async (req, res) => {
  const { fullName, email, phone, employeeId } = req.body;

  if (
    typeof fullName !== "string" ||
    !fullName.trim() ||
    typeof email !== "string" ||
    !email.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Teacher's full name and email are required.",
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const normalizedEmployeeId =
    typeof employeeId === "string" && employeeId.trim()
      ? employeeId.trim().toUpperCase()
      : undefined;

  if (normalizedEmail.length > 254) {
    return res.status(400).json({
      success: false,
      message: "Email address is too long.",
    });
  }

  if (normalizedEmployeeId && normalizedEmployeeId.length > 50) {
    return res.status(400).json({
      success: false,
      message: "Employee ID must not exceed 50 characters.",
    });
  }

  if (phone !== undefined && typeof phone !== "string") {
    return res.status(400).json({
      success: false,
      message: "Phone number must be a string.",
    });
  }

  if (phone && phone.trim().length > 30) {
    return res.status(400).json({
      success: false,
      message: "Phone number must not exceed 30 characters.",
    });
  }

  const temporaryPassword = generateTemporaryPassword();

  let teacher;

  try {
    teacher = await Teacher.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : "",
      employeeId: normalizedEmployeeId,
      password: temporaryPassword,
      mustChangePassword: true,
      isActive: true,
      createdBy: req.admin._id,
      updatedBy: req.admin._id,
    });
  } catch (error) {
    if (handleDuplicateError(error, res)) return;

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  }

  await createAuditLog({
    user: req.admin._id,
    action: "CREATE",
    module: "TEACHER",
    description: `${req.admin.fullName} created teacher account for ${teacher.fullName}`,
    req,
  });

  // Remove the password hash before returning the teacher object.
  const safeTeacher = teacher.toObject();
  delete safeTeacher.password;

  return res.status(201).json({
    success: true,
    message: "Teacher account created successfully.",
    teacher: safeTeacher,
    credentials: {
      email: teacher.email,
      temporaryPassword,
      mustChangePassword: true,
    },
  });
});

/*
|--------------------------------------------------------------------------
| GET TEACHERS
|--------------------------------------------------------------------------
*/

exports.getTeachers = asyncHandler(async (req, res) => {
  const requestedPage = Number(req.query.page);
  const requestedLimit = Number(req.query.limit);

  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const limit =
    Number.isInteger(requestedLimit) && requestedLimit > 0
      ? Math.min(requestedLimit, 100)
      : 10;

  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";

  const status =
    typeof req.query.status === "string" ? req.query.status : "active";

  const query = {};

  if (status === "active") {
    query.isActive = true;
  } else if (status === "inactive") {
    query.isActive = false;
  } else if (status !== "all") {
    return res.status(400).json({
      success: false,
      message: "Status must be active, inactive, or all.",
    });
  }

  if (search) {
    const escapedSearch = escapeRegex(search);

    query.$or = [
      { fullName: { $regex: escapedSearch, $options: "i" } },
      { email: { $regex: escapedSearch, $options: "i" } },
      { employeeId: { $regex: escapedSearch, $options: "i" } },
      { phone: { $regex: escapedSearch, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [teachers, totalTeachers] = await Promise.all([
    Teacher.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Teacher.countDocuments(query),
  ]);

  return res.status(200).json({
    success: true,
    teachers,
    pagination: {
      currentPage: page,
      limit,
      totalTeachers,
      totalPages: Math.ceil(totalTeachers / limit),
    },
  });
});

/*
|--------------------------------------------------------------------------
| GET SINGLE TEACHER
|--------------------------------------------------------------------------
*/

exports.getTeacher = asyncHandler(async (req, res) => {
  if (!validateTeacherId(req.params.id, res)) return;

  const teacher = await Teacher.findById(req.params.id)
    .select("-password")
    .populate("createdBy", "fullName email")
    .populate("updatedBy", "fullName email")
    .lean();

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: "Teacher not found.",
    });
  }

  return res.status(200).json({
    success: true,
    teacher,
  });
});

/*
|--------------------------------------------------------------------------
| UPDATE TEACHER
|--------------------------------------------------------------------------
*/

exports.updateTeacher = asyncHandler(async (req, res) => {
  if (!validateTeacherId(req.params.id, res)) return;

  const allowedFields = ["fullName", "email", "phone", "employeeId"];

  const updateData = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(req.body, field)) {
      updateData[field] = req.body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({
      success: false,
      message: "Provide at least one valid teacher field to update.",
    });
  }

  if (Object.prototype.hasOwnProperty.call(updateData, "fullName")) {
    if (
      typeof updateData.fullName !== "string" ||
      !updateData.fullName.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Teacher's full name cannot be empty.",
      });
    }

    updateData.fullName = updateData.fullName.trim();
  }

  if (Object.prototype.hasOwnProperty.call(updateData, "email")) {
    if (typeof updateData.email !== "string" || !updateData.email.trim()) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required.",
      });
    }

    updateData.email = updateData.email.trim().toLowerCase();

    if (updateData.email.length > 254) {
      return res.status(400).json({
        success: false,
        message: "Email address is too long.",
      });
    }
  }

  if (Object.prototype.hasOwnProperty.call(updateData, "phone")) {
    if (typeof updateData.phone !== "string") {
      return res.status(400).json({
        success: false,
        message: "Phone number must be a string.",
      });
    }

    updateData.phone = updateData.phone.trim();

    if (updateData.phone.length > 30) {
      return res.status(400).json({
        success: false,
        message: "Phone number must not exceed 30 characters.",
      });
    }
  }

  if (Object.prototype.hasOwnProperty.call(updateData, "employeeId")) {
    if (typeof updateData.employeeId !== "string") {
      return res.status(400).json({
        success: false,
        message: "Employee ID must be a string.",
      });
    }

    updateData.employeeId = updateData.employeeId.trim()
      ? updateData.employeeId.trim().toUpperCase()
      : undefined;
  }

  const teacher = await Teacher.findById(req.params.id);

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: "Teacher not found.",
    });
  }

  Object.assign(teacher, updateData);

  teacher.updatedBy = req.admin._id;

  try {
    await teacher.save();
  } catch (error) {
    if (handleDuplicateError(error, res)) return;

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  }

  await createAuditLog({
    user: req.admin._id,
    action: "UPDATE",
    module: "TEACHER",
    description: `${req.admin.fullName} updated teacher account for ${teacher.fullName}`,
    req,
  });

  const safeTeacher = teacher.toObject();
  delete safeTeacher.password;

  return res.status(200).json({
    success: true,
    message: "Teacher details updated successfully.",
    teacher: safeTeacher,
  });
});

/*
|--------------------------------------------------------------------------
| ACTIVATE / DEACTIVATE TEACHER
|--------------------------------------------------------------------------
*/

exports.updateTeacherStatus = asyncHandler(async (req, res) => {
  if (!validateTeacherId(req.params.id, res)) return;

  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isActive must be either true or false.",
    });
  }

  const teacher = await Teacher.findById(req.params.id);

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: "Teacher not found.",
    });
  }

  if (teacher.isActive === isActive) {
    return res.status(200).json({
      success: true,
      message: `Teacher account is already ${isActive ? "active" : "inactive"}.`,
      teacher: {
        _id: teacher._id,
        fullName: teacher.fullName,
        email: teacher.email,
        isActive: teacher.isActive,
      },
    });
  }

  teacher.isActive = isActive;
  teacher.updatedBy = req.admin._id;

  // Invalidate existing teacher sessions when status changes.
  teacher.tokenVersion = (teacher.tokenVersion || 0) + 1;

  await teacher.save();

  await createAuditLog({
    user: req.admin._id,
    action: isActive ? "ACTIVATE" : "DEACTIVATE",
    module: "TEACHER",
    description: `${req.admin.fullName} ${isActive ? "activated" : "deactivated"} teacher account for ${teacher.fullName}`,
    req,
  });

  return res.status(200).json({
    success: true,
    message: `Teacher account ${isActive ? "activated" : "deactivated"} successfully.`,
    teacher: {
      _id: teacher._id,
      fullName: teacher.fullName,
      email: teacher.email,
      isActive: teacher.isActive,
      tokenVersion: teacher.tokenVersion,
    },
  });
});

/*
|--------------------------------------------------------------------------
| RESET TEACHER PASSWORD
|--------------------------------------------------------------------------
*/

exports.resetTeacherPassword = asyncHandler(async (req, res) => {
  if (!validateTeacherId(req.params.id, res)) return;

  const teacher = await Teacher.findById(req.params.id);

  if (!teacher) {
    return res.status(404).json({
      success: false,
      message: "Teacher not found.",
    });
  }

  if (!teacher.isActive) {
    return res.status(400).json({
      success: false,
      message: "An inactive teacher's password cannot be reset.",
    });
  }

  const temporaryPassword = generateTemporaryPassword();

  teacher.password = temporaryPassword;
  teacher.mustChangePassword = true;
  teacher.tokenVersion = (teacher.tokenVersion || 0) + 1;
  teacher.updatedBy = req.admin._id;

  await teacher.save();

  await createAuditLog({
    user: req.admin._id,
    action: "RESET_PASSWORD",
    module: "TEACHER",
    description: `${req.admin.fullName} reset the password for teacher ${teacher.fullName}`,
    req,
  });

  return res.status(200).json({
    success: true,
    message: "Teacher password reset successfully.",
    credentials: {
      email: teacher.email,
      temporaryPassword,
      mustChangePassword: true,
    },
  });
});
