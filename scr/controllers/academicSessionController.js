const mongoose = require("mongoose");

const asyncHandler = require("express-async-handler");

const AcademicSession = require("../models/AcademicSession");

// ===============================
// Helpers
// ===============================

const ALLOWED_TERM_KEYS = new Set(["first", "second", "third"]);

const DATE_FIELDS = ["startDate", "endDate", "closingDate", "resumptionDate"];

const normalizeDate = (value, fieldName) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date.`);
    error.statusCode = 400;
    throw error;
  }

  return date;
};

const normalizeTerms = (terms) => {
  if (terms === undefined) {
    return undefined;
  }

  if (!Array.isArray(terms)) {
    const error = new Error("Terms must be an array.");
    error.statusCode = 400;
    throw error;
  }

  const seenKeys = new Set();

  return terms.map((term, index) => {
    if (!term || typeof term !== "object" || Array.isArray(term)) {
      const error = new Error(`Term at index ${index} must be an object.`);

      error.statusCode = 400;
      throw error;
    }

    if (!ALLOWED_TERM_KEYS.has(term.key)) {
      const error = new Error(
        `Term at index ${index} has an invalid key. Expected first, second, or third.`,
      );

      error.statusCode = 400;
      throw error;
    }

    if (seenKeys.has(term.key)) {
      const error = new Error(`Duplicate term key: ${term.key}.`);

      error.statusCode = 400;
      throw error;
    }

    seenKeys.add(term.key);

    const normalizedTerm = {
      key: term.key,
    };

    if (term.name !== undefined) {
      normalizedTerm.name = term.name;
    }

    if (term.isActive !== undefined) {
      if (typeof term.isActive !== "boolean") {
        const error = new Error(
          `isActive for ${term.key} term must be true or false.`,
        );

        error.statusCode = 400;
        throw error;
      }

      normalizedTerm.isActive = term.isActive;
    }

    for (const field of DATE_FIELDS) {
      if (term[field] !== undefined) {
        normalizedTerm[field] = normalizeDate(
          term[field],
          `${field} for ${term.key} term`,
        );
      }
    }

    return normalizedTerm;
  });
};

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

// ===============================
// Create Academic Session
// ===============================

exports.createAcademicSession = asyncHandler(async (req, res) => {
  const { name, terms, isActive } = req.body;

  // ===============================
  // Validate Name
  // ===============================

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: "Academic session name is required.",
    });
  }

  // ===============================
  // Validate isActive
  // ===============================

  if (isActive !== undefined && typeof isActive !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isActive must be true or false.",
    });
  }

  // ===============================
  // Normalize Terms
  // ===============================

  let normalizedTerms;

  try {
    normalizedTerms = normalizeTerms(terms);
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }

  // ===============================
  // Create Academic Session
  // ===============================

  try {
    const academicSession = await AcademicSession.create({
      name: name.trim(),
      ...(normalizedTerms !== undefined ? { terms: normalizedTerms } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    });

    return res.status(201).json({
      success: true,
      message: "Academic session created successfully.",
      academicSession,
    });
  } catch (error) {
    // ===============================
    // Duplicate Session
    // ===============================

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An academic session with this name already exists.",
      });
    }

    // ===============================
    // Mongoose Validation Error
    // ===============================

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  }
});

// ===============================
// Update Academic Session
// ===============================

exports.updateAcademicSession = asyncHandler(async (req, res) => {
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

  const academicSession = await AcademicSession.findById(id);

  if (!academicSession) {
    return res.status(404).json({
      success: false,
      message: "Academic session not found.",
    });
  }

  const { name, terms, isActive } = req.body;

  // ===============================
  // Validate Name
  // ===============================

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Academic session name cannot be empty.",
      });
    }

    academicSession.name = name.trim();
  }

  // ===============================
  // Validate isActive
  // ===============================

  if (isActive !== undefined) {
    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false.",
      });
    }

    academicSession.isActive = isActive;
  }

  // ===============================
  // Normalize Terms
  // ===============================

  if (terms !== undefined) {
    let normalizedTerms;

    try {
      normalizedTerms = normalizeTerms(terms);
    } catch (error) {
      return res.status(error.statusCode || 400).json({
        success: false,
        message: error.message,
      });
    }

    academicSession.terms = normalizedTerms;
  }

  // ===============================
  // Save Changes
  // ===============================

  try {
    await academicSession.save();

    return res.status(200).json({
      success: true,
      message: "Academic session updated successfully.",
      academicSession,
    });
  } catch (error) {
    // ===============================
    // Duplicate Session
    // ===============================

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An academic session with this name already exists.",
      });
    }

    // ===============================
    // Mongoose Validation Error
    // ===============================

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    throw error;
  }
});
