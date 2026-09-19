const Joi = require("joi");

exports.studentSchema = Joi.object({
  firstName: Joi.string().trim().required(),

  lastName: Joi.string().trim().required(),

  otherName: Joi.string().allow("").optional(),

  gender: Joi.string().valid("Male", "Female").required(),

  dateOfBirth: Joi.date().required(),

  currentClass: Joi.string().trim().required(),

  session: Joi.string().trim().required(),

  parentName: Joi.string().trim().allow("").optional(),

  parentPhone: Joi.string().trim().allow("").optional(),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[a-z]/)
    .pattern(/[A-Z]/)
    .pattern(/[0-9]/)
    .pattern(/[^a-zA-Z0-9]/)
    .optional()
    .messages({
      "string.min": "Password must be at least 8 characters long.",

      "string.max": "Password cannot exceed 128 characters.",

      "string.pattern.base":
        "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
    }),
});

/*
 * Used when updating an existing student.
 *
 * All fields are optional because the endpoint supports
 * partial updates.
 *
 * Sensitive/system-controlled fields such as studentId,
 * password, isActive, photo, createdBy, etc. are intentionally
 * not included.
 */
exports.studentUpdateSchema = Joi.object({
  firstName: Joi.string().trim().optional(),

  lastName: Joi.string().trim().optional(),

  otherName: Joi.string().trim().allow("").optional(),

  gender: Joi.string().valid("Male", "Female").optional(),

  dateOfBirth: Joi.date().optional(),

  currentClass: Joi.string().trim().optional(),

  session: Joi.string().trim().optional(),

  parentName: Joi.string().trim().allow("").optional(),

  parentPhone: Joi.string().trim().allow("").optional(),
}).min(1);
