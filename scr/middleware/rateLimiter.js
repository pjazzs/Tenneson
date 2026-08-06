const rateLimit = require("express-rate-limit");

exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});


exports.authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5,

  standardHeaders: true,
  legacyHeaders: false,

  message: {
    message:
      "Too many login attempts. Please try again in 1 minute.",
  },

  skip: () => process.env.NODE_ENV === "test",
});