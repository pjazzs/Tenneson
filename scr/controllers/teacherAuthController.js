const jwt = require("jsonwebtoken");
const asyncHandler = require("express-async-handler");

const Teacher = require("../models/Teacher");
const createAuditLog = require("../utils/createAuditLog");

const TEACHER_TOKEN_EXPIRES_IN = process.env.TEACHER_JWT_EXPIRES_IN || "7d";

const PASSWORD_CHANGE_TOKEN_EXPIRES_IN = "15m";

/*
|--------------------------------------------------------------------------
| PASSWORD VALIDATION
|--------------------------------------------------------------------------
*/

const isStrongPassword = (password) => {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    return false;
  }

  return (
    /[a-z]/.test(password) &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^a-zA-Z0-9]/.test(password)
  );
};

/*
|--------------------------------------------------------------------------
| SAFE TEACHER PROFILE
|--------------------------------------------------------------------------
*/

const getSafeTeacher = (teacher) => ({
  _id: teacher._id,
  fullName: teacher.fullName,
  email: teacher.email,
  phone: teacher.phone,
  employeeId: teacher.employeeId,
  isActive: teacher.isActive,
  mustChangePassword: teacher.mustChangePassword,
});

/*
|--------------------------------------------------------------------------
| JWT GENERATORS
|--------------------------------------------------------------------------
*/

const generateTeacherToken = (teacher) => {
  return jwt.sign(
    {
      id: teacher._id.toString(),
      type: "teacher",
      tokenVersion: teacher.tokenVersion || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: TEACHER_TOKEN_EXPIRES_IN,
    },
  );
};

const generatePasswordChangeToken = (teacher) => {
  return jwt.sign(
    {
      id: teacher._id.toString(),
      type: "teacher_password_change",
      tokenVersion: teacher.tokenVersion || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: PASSWORD_CHANGE_TOKEN_EXPIRES_IN,
    },
  );
};

/*
|--------------------------------------------------------------------------
| TEACHER LOGIN
|--------------------------------------------------------------------------
|
| POST /teacher/login
|
*/

exports.loginTeacher = asyncHandler(async (req, res) => {
  const email =
    typeof req.body.email === "string"
      ? req.body.email.trim().toLowerCase()
      : "";

  const password =
    typeof req.body.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  const teacher = await Teacher.findOne({ email }).select("+password");

  if (!teacher) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  if (!teacher.isActive) {
    return res.status(401).json({
      success: false,
      message: "This teacher account is inactive.",
    });
  }

  const passwordMatches = await teacher.comparePassword(password);

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | FIRST LOGIN
  |--------------------------------------------------------------------------
  */

  if (teacher.mustChangePassword) {
    const passwordChangeToken = generatePasswordChangeToken(teacher);

    return res.status(200).json({
      success: true,
      message:
        "Login successful. You must change your password before accessing your account.",
      requiresPasswordChange: true,
      passwordChangeToken,
      teacher: getSafeTeacher(teacher),
    });
  }

  /*
  |--------------------------------------------------------------------------
  | NORMAL LOGIN
  |--------------------------------------------------------------------------
  */

  const token = generateTeacherToken(teacher);

  await createAuditLog({
    user: teacher._id,
    action: "TEACHER_LOGIN",
    module: "TEACHER_AUTH",
    description: `${teacher.fullName} logged into the teacher portal.`,
    req,
  });

  return res.status(200).json({
    success: true,
    message: "Login successful.",
    requiresPasswordChange: false,
    token,
    teacher: getSafeTeacher(teacher),
  });
});

/*
|--------------------------------------------------------------------------
| CHANGE TEACHER PASSWORD
|--------------------------------------------------------------------------
|
| PATCH /teacher/change-password
|
| Accepts:
| 1. teacher
| 2. teacher_password_change
|
*/

exports.changeTeacherPassword = asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;

  const authToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

  if (!authToken) {
    return res.status(401).json({
      success: false,
      message: "Teacher authentication is required.",
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(authToken, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }

  const allowedTypes = ["teacher", "teacher_password_change"];

  if (!allowedTypes.includes(decoded.type) || !decoded.id) {
    return res.status(401).json({
      success: false,
      message: "Invalid teacher authentication token.",
    });
  }

  const teacher = await Teacher.findById(decoded.id).select("+password");

  if (!teacher) {
    return res.status(401).json({
      success: false,
      message: "Teacher account no longer exists.",
    });
  }

  if (!teacher.isActive) {
    return res.status(401).json({
      success: false,
      message: "Teacher account is inactive.",
    });
  }

  const currentTokenVersion = teacher.tokenVersion || 0;
  const tokenVersion = decoded.tokenVersion ?? 0;

  if (tokenVersion !== currentTokenVersion) {
    return res.status(401).json({
      success: false,
      message: "Teacher authentication token is no longer valid.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | FIRST-LOGIN TOKEN VALIDATION
  |--------------------------------------------------------------------------
  */

  if (
    decoded.type === "teacher_password_change" &&
    !teacher.mustChangePassword
  ) {
    return res.status(401).json({
      success: false,
      message: "This password-change session is no longer valid.",
    });
  }

  if (decoded.type === "teacher" && teacher.mustChangePassword) {
    return res.status(403).json({
      success: false,
      message: "You must change your temporary password first.",
      requiresPasswordChange: true,
    });
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (typeof newPassword !== "string" || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "New password is required.",
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "New password and confirmation password do not match.",
    });
  }

  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({
      success: false,
      message:
        "Password must be 8-128 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | CURRENT PASSWORD
  |--------------------------------------------------------------------------
  |
  | Normal password change requires the current password.
  | First-login password change does not because the teacher
  | has already authenticated with the temporary password.
  |
  */

  if (decoded.type === "teacher") {
    if (typeof currentPassword !== "string" || !currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is required.",
      });
    }

    const currentPasswordMatches =
      await teacher.comparePassword(currentPassword);

    if (!currentPasswordMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }
  }

  const samePassword = await teacher.comparePassword(newPassword);

  if (samePassword) {
    return res.status(400).json({
      success: false,
      message: "New password must be different from your current password.",
    });
  }

  /*
  |--------------------------------------------------------------------------
  | UPDATE PASSWORD
  |--------------------------------------------------------------------------
  |
  | The Teacher model automatically hashes modified passwords
  | in its pre-save hook. Do not bcrypt-hash this value here.
  |
  */

  teacher.password = newPassword;
  teacher.mustChangePassword = false;
  teacher.tokenVersion = currentTokenVersion + 1;

  await teacher.save();

  await createAuditLog({
    user: teacher._id,
    action: "TEACHER_PASSWORD_CHANGE",
    module: "TEACHER_AUTH",
    description: `${teacher.fullName} changed their password.`,
    req,
  });

  /*
  |--------------------------------------------------------------------------
  | ISSUE FRESH ACCESS TOKEN
  |--------------------------------------------------------------------------
  */

  const token = generateTeacherToken(teacher);

  return res.status(200).json({
    success: true,
    message: "Password changed successfully.",
    requiresPasswordChange: false,
    token,
    teacher: getSafeTeacher(teacher),
  });
});

/*
|--------------------------------------------------------------------------
| GET CURRENT TEACHER PROFILE
|--------------------------------------------------------------------------
|
| GET /teacher/me
|
*/

exports.getMyTeacherProfile = asyncHandler(async (req, res) => {
  if (!req.teacher) {
    return res.status(401).json({
      success: false,
      message: "Teacher authentication is required.",
    });
  }

  return res.status(200).json({
    success: true,
    teacher: getSafeTeacher(req.teacher),
  });
});
