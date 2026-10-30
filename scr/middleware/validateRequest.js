const Joi = require("joi");

exports.validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      convert: false,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: error.details.map((detail) => detail.message),
      });
    }

    next();
  };
};
