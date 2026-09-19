const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const asyncHandler = require("express-async-handler");

const Student = require("../models/student");
const StudentCredential = require("../models/StudentCredential");

const {
  isStudentTokenInvalidated,
} = require("../middleware/studentAuthMiddleware");

const createAuditLog = require("../utils/createAuditLog");
const logActivity = require("../utils/logActivity");

/*
|--------------------------------------------------------------------------
| Constants
|--------------------------------------------------------------------------
*/

const BCRYPT_SALT_ROUNDS = 12;

const STUDENT_TOKEN_EXPIRES_IN = process.env.STUDENT_JWT_EXPIRES_IN || "7d";

const PASSWORD_CHANGE_TOKEN_EXPIRES_IN = "15m";

/*
|--------------------------------------------------------------------------
| Password Helpers
|--------------------------------------------------------------------------
*/

/**
 * Validate password strength.
 *
 * Student passwords must contain:
 * - At least 8 characters
 * - Maximum 128 characters
 * - One lowercase letter
 * - One uppercase letter
 * - One number
 * - One special character
 */
const isStrongPassword = (password) => {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128
  ) {
    return false;
  }

  const hasLowercase = /[a-z]/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  return hasLowercase && hasUppercase && hasNumber && hasSpecial;
};

/**
 * Generate a secure temporary password.
 */
const generateTemporaryPassword = () => {
  return crypto.randomBytes(9).toString("base64url").slice(0, 12);
};

/*
|--------------------------------------------------------------------------
| JWT Helpers
|--------------------------------------------------------------------------
*/

/**
 * Generate a normal student access token.
 *
 * The token contains the current tokenVersion.
 *
 * Whenever the student's password is changed or reset,
 * tokenVersion is incremented. This automatically invalidates
 * all previously issued student tokens.
 */
const generateStudentToken = (credential) => {
  return jwt.sign(
    {
      id: credential._id.toString(),

      type: "student",

      tokenVersion: credential.tokenVersion || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: STUDENT_TOKEN_EXPIRES_IN,
    },
  );
};

/**
 * Generate a short-lived password-change token.
 *
 * This token is intended for first-login password changes.
 */
const generatePasswordChangeToken = (credential) => {
  return jwt.sign(
    {
      id: credential._id.toString(),

      type: "student_password_change",

      tokenVersion: credential.tokenVersion || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: PASSWORD_CHANGE_TOKEN_EXPIRES_IN,
    },
  );
};

/*
|--------------------------------------------------------------------------
| Login Student
|--------------------------------------------------------------------------
*/

/**
 * Student login.
 *
 * Username = Student ID.
 */
exports.loginStudent = asyncHandler(async (req, res) => {
  const username = String(req.body.username || "")
    .trim()
    .toUpperCase();

  const password = String(req.body.password || "");

  /*
    |--------------------------------------------------------------------------
    | Basic Validation
    |--------------------------------------------------------------------------
    */

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "Student ID and password are required.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Find Credential
    |--------------------------------------------------------------------------
    */

  const credential = await StudentCredential.findOne({
    username,
  }).populate({
    path: "student",
    select:
      "studentId firstName lastName otherName gender currentClass session photo isActive",
  });

  /*
    |--------------------------------------------------------------------------
    | Generic Authentication Error
    |--------------------------------------------------------------------------
    */

  if (!credential) {
    return res.status(401).json({
      success: false,
      message: "Invalid Student ID or password.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Check Credential Status
    |--------------------------------------------------------------------------
    */

  if (!credential.isActive) {
    return res.status(401).json({
      success: false,
      message: "This student account is inactive.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Check Student Status
    |--------------------------------------------------------------------------
    */

  if (!credential.student || !credential.student.isActive) {
    return res.status(401).json({
      success: false,
      message: "This student account is inactive.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Verify Password
    |--------------------------------------------------------------------------
    */

  const passwordMatches = await bcrypt.compare(
    password,
    credential.passwordHash,
  );

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      message: "Invalid Student ID or password.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Update Last Login
    |--------------------------------------------------------------------------
    */

  credential.lastLoginAt = new Date();

  await credential.save();

  /*
    |--------------------------------------------------------------------------
    | First Login / Password Change Required
    |--------------------------------------------------------------------------
    */

  if (credential.mustChangePassword) {
    const passwordChangeToken = generatePasswordChangeToken(credential);

    return res.status(200).json({
      success: true,

      message:
        "Login successful. You must change your password before accessing your account.",

      requiresPasswordChange: true,

      passwordChangeToken,

      student: {
        studentId: credential.student.studentId,

        firstName: credential.student.firstName,

        lastName: credential.student.lastName,

        otherName: credential.student.otherName,

        gender: credential.student.gender,

        currentClass: credential.student.currentClass,

        session: credential.student.session,

        photo: credential.student.photo,
      },
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Normal Login
    |--------------------------------------------------------------------------
    */

  const accessToken = generateStudentToken(credential);

  return res.status(200).json({
    success: true,

    message: "Login successful.",

    requiresPasswordChange: false,

    token: accessToken,

    student: {
      studentId: credential.student.studentId,

      firstName: credential.student.firstName,

      lastName: credential.student.lastName,

      otherName: credential.student.otherName,

      gender: credential.student.gender,

      currentClass: credential.student.currentClass,

      session: credential.student.session,

      photo: credential.student.photo,
    },
  });
});

/*
|--------------------------------------------------------------------------
| Change Student Password
|--------------------------------------------------------------------------
*/

/**
 * Change password after login.
 *
 * Accepted token types:
 *
 * 1. student
 * 2. student_password_change
 */
exports.changeStudentPassword = asyncHandler(async (req, res) => {
  let authToken;

  /*
    |--------------------------------------------------------------------------
    | Get Authorization Token
    |--------------------------------------------------------------------------
    */

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    authToken = req.headers.authorization.split(" ")[1];
  }

  if (!authToken) {
    return res.status(401).json({
      success: false,
      message: "Student authentication is required.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Verify Token
    |--------------------------------------------------------------------------
    */

  let decoded;

  try {
    decoded = jwt.verify(authToken, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Validate Token Type
    |--------------------------------------------------------------------------
    */

  const allowedTypes = ["student", "student_password_change"];

  if (!allowedTypes.includes(decoded.type)) {
    return res.status(401).json({
      success: false,
      message: "Invalid student authentication token.",
    });
  }

  if (!decoded.id) {
    return res.status(401).json({
      success: false,
      message: "Invalid student authentication token.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Get Credential
    |--------------------------------------------------------------------------
    */

  const credential = await StudentCredential.findById(decoded.id).populate({
    path: "student",
    select:
      "studentId firstName lastName otherName gender currentClass session photo isActive",
  });

  if (!credential) {
    return res.status(401).json({
      success: false,
      message: "Student account no longer exists.",
    });
  }

  if (!credential.isActive) {
    return res.status(401).json({
      success: false,
      message: "Student account is inactive.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Check Whether Token Was Invalidated
    |--------------------------------------------------------------------------
    */

  if (isStudentTokenInvalidated(decoded, credential)) {
    return res.status(401).json({
      success: false,
      message: "Student authentication token is no longer valid.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Check Student
    |--------------------------------------------------------------------------
    */

  if (!credential.student || !credential.student.isActive) {
    return res.status(401).json({
      success: false,
      message: "Student record no longer exists or is inactive.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Prevent Reusing First-Login Password-Change Token
    |--------------------------------------------------------------------------
    */

  if (
    decoded.type === "student_password_change" &&
    !credential.mustChangePassword
  ) {
    return res.status(401).json({
      success: false,
      message: "This password-change session is no longer valid.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Request Body
    |--------------------------------------------------------------------------
    */

  const { currentPassword, newPassword, confirmPassword } = req.body;

  /*
    |--------------------------------------------------------------------------
    | Validate New Password
    |--------------------------------------------------------------------------
    */

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
    | Current Password
    |--------------------------------------------------------------------------
    |
    | Normal student token:
    | current password is required.
    |
    | First-login password-change token:
    | current password is not required because the student
    | already authenticated using the temporary password.
    |
    */

  if (decoded.type === "student") {
    if (typeof currentPassword !== "string" || !currentPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password is required.",
      });
    }

    const currentPasswordMatches = await bcrypt.compare(
      currentPassword,
      credential.passwordHash,
    );

    if (!currentPasswordMatches) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }
  }

  /*
    |--------------------------------------------------------------------------
    | Prevent Reusing Current Password
    |--------------------------------------------------------------------------
    */

  const samePassword = await bcrypt.compare(
    newPassword,
    credential.passwordHash,
  );

  if (samePassword) {
    return res.status(400).json({
      success: false,
      message: "New password must be different from your current password.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Hash New Password
    |--------------------------------------------------------------------------
    */

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);

  /*
    |--------------------------------------------------------------------------
    | Update Credential
    |--------------------------------------------------------------------------
    */

  credential.passwordHash = passwordHash;

  credential.mustChangePassword = false;

  credential.passwordChangedAt = new Date();

  /*
    |--------------------------------------------------------------------------
    | Invalidate Existing Tokens
    |--------------------------------------------------------------------------
    |
    | Incrementing tokenVersion invalidates every
    | previously issued student JWT.
    |
    */

  credential.tokenVersion = (credential.tokenVersion || 0) + 1;

  /*
    | Student changed the password,
    | so this is no longer an admin update.
    */

  credential.updatedBy = null;

  await credential.save();

  /*
    |--------------------------------------------------------------------------
    | Audit Log
    |--------------------------------------------------------------------------
    */

  await createAuditLog({
    user: null,

    action: "STUDENT_PASSWORD_CHANGE",

    module: "STUDENT_AUTH",

    description: `Student ${credential.student.studentId} changed their password.`,

    req,
  });

  /*
    |--------------------------------------------------------------------------
    | Generate Fresh Student Token
    |--------------------------------------------------------------------------
    */

  const accessToken = generateStudentToken(credential);

  return res.status(200).json({
    success: true,

    message: "Password changed successfully.",

    requiresPasswordChange: false,

    token: accessToken,

    student: {
      studentId: credential.student.studentId,

      firstName: credential.student.firstName,

      lastName: credential.student.lastName,

      otherName: credential.student.otherName,

      gender: credential.student.gender,

      currentClass: credential.student.currentClass,

      session: credential.student.session,

      photo: credential.student.photo,
    },
  });
});

/*
|--------------------------------------------------------------------------
| Create Student Credential
|--------------------------------------------------------------------------
*/

exports.createStudentCredential = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId || req.body.studentId;

  const password = req.body.password;

  const normalizedStudentId = String(studentId || "")
    .trim()
    .toUpperCase();

  /*
    |--------------------------------------------------------------------------
    | Validate Student ID
    |--------------------------------------------------------------------------
    */

  if (!normalizedStudentId) {
    return res.status(400).json({
      success: false,
      message: "Student ID is required.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Resolve Student
    |--------------------------------------------------------------------------
    */

  const student = await Student.findOne({
    studentId: normalizedStudentId,
  });

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found.",
    });
  }

  if (!student.isActive) {
    return res.status(400).json({
      success: false,
      message: "Cannot create credentials for an archived student.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Check Existing Credential
    |--------------------------------------------------------------------------
    */

  const existingCredential = await StudentCredential.findOne({
    student: student._id,
  });

  if (existingCredential) {
    return res.status(409).json({
      success: false,
      message: "A login account already exists for this student.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Determine Password
    |--------------------------------------------------------------------------
    */

  let temporaryPassword;

  if (password !== undefined && password !== null && String(password).trim()) {
    temporaryPassword = String(password);

    if (!isStrongPassword(temporaryPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be 8-128 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
    }
  } else {
    temporaryPassword = generateTemporaryPassword();
  }

  /*
    |--------------------------------------------------------------------------
    | Hash Password
    |--------------------------------------------------------------------------
    */

  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);

  /*
    |--------------------------------------------------------------------------
    | Create Credential
    |--------------------------------------------------------------------------
    */

  const credential = await StudentCredential.create({
    student: student._id,

    username: student.studentId.toUpperCase(),

    passwordHash,

    mustChangePassword: true,

    tokenVersion: 0,

    isActive: true,

    createdBy: req.admin._id,

    updatedBy: req.admin._id,
  });

  /*
    |--------------------------------------------------------------------------
    | Audit Log
    |--------------------------------------------------------------------------
    */

  await createAuditLog({
    user: req.admin._id,

    action: "CREATE_STUDENT_CREDENTIAL",

    module: "STUDENT_AUTH",

    description: `${req.admin.fullName} created login credentials for student ${student.studentId}.`,

    req,
  });

  /*
    |--------------------------------------------------------------------------
    | Activity Log
    |--------------------------------------------------------------------------
    */

  await logActivity({
    adminId: req.admin._id,

    action: "CREATE_STUDENT_CREDENTIAL",

    studentId: student.studentId,

    details: `Created login credentials for ${student.firstName} ${student.lastName}`,
  });

  /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

  return res.status(201).json({
    success: true,

    message: "Student login account created successfully.",

    studentCredential: {
      username: credential.username,

      temporaryPassword,

      mustChangePassword: credential.mustChangePassword,
    },
  });
});

/*
|--------------------------------------------------------------------------
| Reset Student Password
|--------------------------------------------------------------------------
*/

/**
 * Reset an existing student's password.
 *
 * This is an ADMIN operation.
 */
exports.resetStudentPassword = asyncHandler(async (req, res) => {
  const studentId = req.params.studentId || req.body.studentId;

  const password = req.body.password;

  const normalizedStudentId = String(studentId || "")
    .trim()
    .toUpperCase();

  /*
    |--------------------------------------------------------------------------
    | Validate Student ID
    |--------------------------------------------------------------------------
    */

  if (!normalizedStudentId) {
    return res.status(400).json({
      success: false,
      message: "Student ID is required.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Resolve Student
    |--------------------------------------------------------------------------
    */

  const student = await Student.findOne({
    studentId: normalizedStudentId,
  });

  if (!student) {
    return res.status(404).json({
      success: false,
      message: "Student not found.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Find Credential
    |--------------------------------------------------------------------------
    */

  const credential = await StudentCredential.findOne({
    student: student._id,
  });

  if (!credential) {
    return res.status(404).json({
      success: false,
      message: "Student login account does not exist.",
    });
  }

  /*
    |--------------------------------------------------------------------------
    | Determine Temporary Password
    |--------------------------------------------------------------------------
    */

  let temporaryPassword;

  if (password !== undefined && password !== null && String(password).trim()) {
    temporaryPassword = String(password);

    if (!isStrongPassword(temporaryPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be 8-128 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
    }
  } else {
    temporaryPassword = generateTemporaryPassword();
  }

  /*
    |--------------------------------------------------------------------------
    | Hash Password
    |--------------------------------------------------------------------------
    */

  const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_SALT_ROUNDS);

  /*
    |--------------------------------------------------------------------------
    | Update Credential
    |--------------------------------------------------------------------------
    */

  credential.passwordHash = passwordHash;

  credential.mustChangePassword = true;

  credential.passwordChangedAt = new Date();

  /*
    |--------------------------------------------------------------------------
    | Invalidate Existing Tokens
    |--------------------------------------------------------------------------
    |
    | Incrementing tokenVersion invalidates all
    | previously issued student access tokens.
    |
    */

  credential.tokenVersion = (credential.tokenVersion || 0) + 1;

  credential.updatedBy = req.admin._id;

  credential.isActive = student.isActive;

  await credential.save();

  /*
    |--------------------------------------------------------------------------
    | Audit Log
    |--------------------------------------------------------------------------
    */

  await createAuditLog({
    user: req.admin._id,

    action: "RESET_STUDENT_PASSWORD",

    module: "STUDENT_AUTH",

    description: `${req.admin.fullName} reset the password for student ${student.studentId}.`,

    req,
  });

  /*
    |--------------------------------------------------------------------------
    | Activity Log
    |--------------------------------------------------------------------------
    */

  await logActivity({
    adminId: req.admin._id,

    action: "RESET_STUDENT_PASSWORD",

    studentId: student.studentId,

    details: `Reset password for ${student.firstName} ${student.lastName}`,
  });

  /*
    |--------------------------------------------------------------------------
    | Response
    |--------------------------------------------------------------------------
    */

  return res.status(200).json({
    success: true,

    message: "Student password reset successfully.",

    studentCredential: {
      username: credential.username,

      temporaryPassword,

      mustChangePassword: credential.mustChangePassword,
    },
  });
});

/*
|--------------------------------------------------------------------------
| Get Current Student Profile
|--------------------------------------------------------------------------
*/

exports.getMyProfile = asyncHandler(async (req, res) => {
  const student = req.student;

  if (!student) {
    return res.status(401).json({
      success: false,
      message: "Student authentication is required.",
    });
  }

  return res.status(200).json({
    success: true,

    student: {
      studentId: student.studentId,

      firstName: student.firstName,

      lastName: student.lastName,

      otherName: student.otherName,

      gender: student.gender,

      dateOfBirth: student.dateOfBirth,

      currentClass: student.currentClass,

      session: student.session,

      photo: student.photo,
    },
  });
});
