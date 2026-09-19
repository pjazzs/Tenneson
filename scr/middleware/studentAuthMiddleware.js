const jwt = require("jsonwebtoken");
const StudentCredential = require("../models/StudentCredential");

/*
|--------------------------------------------------------------------------
| Student Token Invalidation
|--------------------------------------------------------------------------
*/

/**
 * Determine whether a student JWT has been invalidated.
 *
 * A student's tokenVersion is increased whenever their password
 * is changed or reset.
 *
 * Example:
 *
 * Credential tokenVersion = 0
 *
 * Existing token:
 * {
 *   tokenVersion: 0
 * }
 *
 * Password changes:
 *
 * Credential tokenVersion = 1
 *
 * The old token still contains:
 *
 * tokenVersion: 0
 *
 * Therefore it is rejected.
 */
const isStudentTokenInvalidated = (decoded, credential) => {
  /*
  |--------------------------------------------------------------------------
  | Token Version Check
  |--------------------------------------------------------------------------
  */

  if (
    typeof decoded.tokenVersion === "number" &&
    typeof credential.tokenVersion === "number"
  ) {
    return decoded.tokenVersion !== credential.tokenVersion;
  }

  /*
  |--------------------------------------------------------------------------
  | Legacy Token Fallback
  |--------------------------------------------------------------------------
  |
  | This protects compatibility with tokens created before
  | tokenVersion was introduced.
  |
  */

  if (credential.passwordChangedAt && decoded.iat) {
    const passwordChangedAtSeconds = Math.floor(
      credential.passwordChangedAt.getTime() / 1000,
    );

    return decoded.iat < passwordChangedAtSeconds;
  }

  return false;
};

/*
|--------------------------------------------------------------------------
| Require Student
|--------------------------------------------------------------------------
*/

const requireStudent = async (req, res, next) => {
  try {
    let authToken;

    /*
    |--------------------------------------------------------------------------
    | Get Bearer Token
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
    | Verify JWT
    |--------------------------------------------------------------------------
    */

    const decoded = jwt.verify(authToken, process.env.JWT_SECRET);

    /*
    |--------------------------------------------------------------------------
    | Validate Token Type
    |--------------------------------------------------------------------------
    */

    const validTokenTypes = ["student", "student_password_change"];

    if (!validTokenTypes.includes(decoded.type)) {
      return res.status(401).json({
        success: false,
        message: "Invalid student authentication token.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Validate Credential ID
    |--------------------------------------------------------------------------
    */

    if (!decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid student authentication token.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Find Credential
    |--------------------------------------------------------------------------
    */

    const credential = await StudentCredential.findById(decoded.id).populate({
      path: "student",
      select: "-__v",
    });

    if (!credential) {
      return res.status(401).json({
        success: false,
        message: "Student account no longer exists.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Credential Status
    |--------------------------------------------------------------------------
    */

    if (!credential.isActive) {
      return res.status(401).json({
        success: false,
        message: "Student account is inactive.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Token Invalidation
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
    | Student Record
    |--------------------------------------------------------------------------
    */

    if (!credential.student) {
      return res.status(401).json({
        success: false,
        message: "Student record no longer exists.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Student Status
    |--------------------------------------------------------------------------
    */

    if (!credential.student.isActive) {
      return res.status(401).json({
        success: false,
        message: "Student account is inactive.",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Attach Student Authentication
    |--------------------------------------------------------------------------
    */

    req.student = credential.student;

    req.studentCredential = credential;

    req.studentTokenType = decoded.type;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired student authentication token.",
    });
  }
};

/*
|--------------------------------------------------------------------------
| Require Student Password Changed
|--------------------------------------------------------------------------
*/

const requireStudentPasswordChanged = async (req, res, next) => {
  await requireStudent(req, res, () => {
    if (!req.studentCredential) {
      return res.status(401).json({
        success: false,
        message: "Student authentication is required.",
      });
    }

    if (req.studentCredential.mustChangePassword) {
      return res.status(403).json({
        success: false,
        message:
          "You must change your password before accessing this resource.",
        requiresPasswordChange: true,
      });
    }

    next();
  });
};

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = {
  requireStudent,
  requireStudentPasswordChanged,
  isStudentTokenInvalidated,
};
