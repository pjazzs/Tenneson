const rateLimit = require("express-rate-limit");

const limiterOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    xForwardedForHeader: true,
  },
};

// ===============================
// General API Rate Limiter
// ===============================

exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,

  ...limiterOptions,

  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// ===============================
// Authentication Rate Limiter
// ===============================

exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,

  ...limiterOptions,

  message: {
    success: false,
    message:
      "Too many login attempts. Please try again in 15 minutes.",
  },

  skip: () => process.env.NODE_ENV === "test",
});

// ===============================
// Student Verification Rate Limiter
// ===============================

exports.verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,

  ...limiterOptions,

  message: {
    success: false,
    message:
      "Too many verification attempts. Please try again later.",
  },
});