const Joi = require("joi");

exports.studentSchema = Joi.object({
  firstName: Joi.string().trim().required(),

  lastName: Joi.string().trim().required(),

  otherName: Joi.string().allow("").optional(),

  gender: Joi.string().valid("Male", "Female").required(),

  dateOfBirth: Joi.date().required(),

  currentClass: Joi.string().required(),

  session: Joi.string().required(),

  parentName: Joi.string().allow("").optional(),

  parentPhone: Joi.string().allow("").optional(),
});
