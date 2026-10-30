const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Teacher = require("../models/Teacher");

/*
|--------------------------------------------------------------------------
| REQUIRE TEACHER
|--------------------------------------------------------------------------
*/

const requireTeacher = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : "";

    // No token supplied
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Teacher authentication is required.",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Accept only recognised teacher token types
    const validTokenTypes = ["teacher", "teacher_password_change"];

    if (!validTokenTypes.includes(decoded.type) || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: "Invalid teacher authentication token.",
      });
    }

    // Validate teacher ID
    if (!mongoose.isValidObjectId(decoded.id)) {
      return res.status(401).json({
        success: false,
        message: "Invalid teacher authentication token.",
      });
    }

    // Find teacher
    const teacher = await Teacher.findById(decoded.id).select("-password");

    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: "Teacher account no longer exists.",
      });
    }

    // Check account status
    if (!teacher.isActive) {
      return res.status(401).json({
        success: false,
        message: "Teacher account is inactive.",
      });
    }

    // Validate token version
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
    | BLOCK NORMAL PORTAL ACCESS UNTIL PASSWORD CHANGE
    |--------------------------------------------------------------------------
    |
    | A temporary password-change token is valid for changing the password,
    | but it must not grant access to the normal teacher portal.
    |
    */

    if (
      decoded.type === "teacher_password_change" ||
      teacher.mustChangePassword
    ) {
      return res.status(403).json({
        success: false,
        requiresPasswordChange: true,
        message: "You must change your password before accessing the portal.",
      });
    }

    // Attach authenticated teacher to request
    req.teacher = teacher;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired teacher authentication token.",
    });
  }
};

module.exports = {
  requireTeacher,
};
