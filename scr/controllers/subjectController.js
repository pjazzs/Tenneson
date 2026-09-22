const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const Subject = require("../models/Subject");

// ===============================
// Get All Subjects
// ===============================

exports.getSubjects = asyncHandler(async (req, res) => {
  const { active } = req.query;

  const filter = {};

  if (active === "true") {
    filter.isActive = true;
  }

  if (active === "false") {
    filter.isActive = false;
  }

  const subjects = await Subject.find(filter)
    .sort({
      name: 1,
    })
    .lean();

  return res.status(200).json({
    success: true,
    count: subjects.length,
    subjects,
  });
});

// ===============================
// Get Single Subject
// ===============================

exports.getSubject = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ===============================
  // Validate Subject ID
  // ===============================

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid subject ID.",
    });
  }

  // ===============================
  // Find Subject
  // ===============================

  const subject = await Subject.findById(id).lean();

  if (!subject) {
    return res.status(404).json({
      success: false,
      message: "Subject not found.",
    });
  }

  return res.status(200).json({
    success: true,
    subject,
  });
});
