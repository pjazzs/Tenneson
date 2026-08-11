const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const asyncHandler = require("express-async-handler");
const createAuditLog = require("../utils/createAuditLog");

// ===============================
// Get All Admins
// ===============================

exports.getAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find()
    .select("-password")
    .sort({
      createdAt: -1,
    });

  return res.status(200).json({
    success: true,
    count: admins.length,
    admins,
  });
});

// ===============================
// Update Admin Permissions
// ===============================

exports.updatePermissions = asyncHandler(async (req, res) => {
  const { permissions } = req.body;

  // ===============================
  // Validate Admin ID
  // ===============================

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid admin ID.",
    });
  }

  // ===============================
  // Validate Permissions
  // ===============================

  if (!Array.isArray(permissions)) {
    return res.status(400).json({
      success: false,
      message: "Permissions must be an array.",
    });
  }

  // ===============================
  // Find Admin
  // ===============================

  const admin = await Admin.findById(req.params.id);

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: "Admin not found.",
    });
  }

  // ===============================
  // Prevent Permission Changes
  // To Super Admin
  // ===============================

  if (admin.role === "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Super admin permissions cannot be modified.",
    });
  }

  // ===============================
  // Update Permissions
  // ===============================

  admin.permissions = permissions;

  await admin.save();

  // ===============================
  // Audit Log
  // ===============================

  await createAuditLog({
    user: req.admin._id,
    action: "UPDATE_PERMISSION",
    module: "ADMIN",
    description: `${req.admin.fullName} updated permissions for ${admin.fullName}`,
    req,
  });

  // ===============================
  // Remove Password
  // ===============================

  const safeAdmin = admin.toObject();

  delete safeAdmin.password;

  // ===============================
  // Response
  // ===============================

  return res.status(200).json({
    success: true,
    message: "Permissions updated successfully.",
    admin: safeAdmin,
  });
});

// ===============================
// Delete Admin
// ===============================

exports.deleteAdmin = asyncHandler(async (req, res) => {
  const adminId = req.params.id;

  // ===============================
  // Validate Admin ID
  // ===============================

  if (!mongoose.Types.ObjectId.isValid(adminId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid admin ID.",
    });
  }

  // ===============================
  // Prevent Self Deletion
  // ===============================

  if (req.admin._id.toString() === adminId) {
    return res.status(400).json({
      success: false,
      message: "You cannot delete your own account.",
    });
  }

  // ===============================
  // Find Admin
  // ===============================

  const admin = await Admin.findById(adminId);

  if (!admin) {
    return res.status(404).json({
      success: false,
      message: "Admin not found.",
    });
  }

  // ===============================
  // Prevent Super Admin Deletion
  // ===============================

  if (admin.role === "super_admin") {
    return res.status(403).json({
      success: false,
      message: "Super admin accounts cannot be deleted.",
    });
  }

  // ===============================
  // Delete Admin
  // ===============================

  await Admin.findByIdAndDelete(adminId);

  // ===============================
  // Audit Log
  // ===============================

  await createAuditLog({
    user: req.admin._id,
    action: "DELETE_ADMIN",
    module: "ADMIN",
    description: `${req.admin.fullName} deleted admin ${admin.fullName}`,
    req,
  });

  // ===============================
  // Response
  // ===============================

  return res.status(200).json({
    success: true,
    message: "Admin deleted successfully.",
  });
});