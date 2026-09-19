const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");
const generateToken = require("../utils/generateToken");
const createAuditLog = require("../utils/createAuditLog");
const asyncHandler = require("express-async-handler");
exports.registerAdmin = async (req, res) => {
  try {
    const { fullName, email, password, role, permissions } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "All fields are required.",
      });
    }

    const existingAdmin = await Admin.findOne({
      email: email.toLowerCase(),
    });

    if (existingAdmin) {
      return res.status(409).json({
        success: false,
        message: "Admin already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await Admin.create({
      fullName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || "admin",
      permissions: permissions || [],
    });

    const token = generateToken(admin);

    return res.status(201).json({
      success: true,
      message: "Admin registered successfully.",
      token,
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // Find admin
    const admin = await Admin.findOne({
      email: email.toLowerCase(),
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // Generate JWT
    const token = generateToken(admin);

    // Create audit log

    await createAuditLog({
      user: admin._id,
      action: "LOGIN",
      module: "AUTH",
      description: `${admin.fullName} logged into the system`,
      req,
    });

    // Send response
    res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        message: "Admin not found",
      });
    }

    if (admin.role === "super_admin") {
      return res.status(403).json({
        message: "Cannot delete super admin",
      });
    }

    await admin.deleteOne();

    res.json({
      message: "Admin deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

exports.changeAdminPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // 1. Validate required fields
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      success: false,
      message: "Current password and new password are required.",
    });
  }

  // 2. Get the currently authenticated admin
  const admin = await Admin.findById(req.admin._id);

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: "Admin not found.",
    });
  }

  // 3. Verify the current password
  const isCurrentPasswordValid = await bcrypt.compare(
    currentPassword,
    admin.password,
  );

  if (!isCurrentPasswordValid) {
    return res.status(401).json({
      success: false,
      message: "Current password is incorrect.",
    });
  }

  // 4. Prevent password reuse
  // This must happen BEFORE password-strength validation.
  const isPasswordReused = await bcrypt.compare(newPassword, admin.password);

  if (isPasswordReused) {
    return res.status(400).json({
      success: false,
      message: "New password must be different from your current password.",
    });
  }

  // 5. Validate new password length
  if (newPassword.length < 8) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 8 characters long.",
    });
  }

  if (newPassword.length > 128) {
    return res.status(400).json({
      success: false,
      message: "New password must not exceed 128 characters.",
    });
  }

  // 6. Validate password complexity
  if (!/[A-Z]/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message: "New password must contain at least one uppercase letter.",
    });
  }

  if (!/[a-z]/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message: "New password must contain at least one lowercase letter.",
    });
  }

  if (!/[0-9]/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message: "New password must contain at least one number.",
    });
  }

  if (!/[^A-Za-z0-9]/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message: "New password must contain at least one special character.",
    });
  }

  // 7. Hash the new password
  const hashedPassword = await bcrypt.hash(newPassword, 12);

  admin.password = hashedPassword;

  // 8. Increment token version
  // This invalidates all previously issued admin tokens.
  admin.tokenVersion = (admin.tokenVersion || 0) + 1;

  // 9. Save the updated admin
  await admin.save();

  // 10. Create audit log
  await createAuditLog({
    user: admin._id,
    action: "CHANGE_PASSWORD",
    module: "AUTH",
    description: `${admin.fullName} changed their password`,
    req,
  });

  // 11. Generate a fresh token
  const token = generateToken(admin);

  // 12. Return response
  return res.status(200).json({
    success: true,
    message: "Password changed successfully.",
    token,
  });
});
