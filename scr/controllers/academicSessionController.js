const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const AcademicSession = require("../models/AcademicSession");

// ===============================
// Get All Academic Sessions
// ===============================

exports.getAcademicSessions = asyncHandler(async (req, res) => {
  const { active } = req.query;

  const filter = {};

  if (active === "true") {
    filter.isActive = true;
  }

  if (active === "false") {
    filter.isActive = false;
  }

  const academicSessions = await AcademicSession.find(filter)
    .sort({
      name: -1,
    })
    .lean();

  return res.status(200).json({
    success: true,
    count: academicSessions.length,
    academicSessions,
  });
});

// ===============================
// Get Single Academic Session
// ===============================

exports.getAcademicSession = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ===============================
  // Validate Academic Session ID
  // ===============================

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid academic session ID.",
    });
  }

  // ===============================
  // Find Academic Session
  // ===============================

  const academicSession = await AcademicSession.findById(id).lean();

  if (!academicSession) {
    return res.status(404).json({
      success: false,
      message: "Academic session not found.",
    });
  }

  return res.status(200).json({
    success: true,
    academicSession,
  });
});
