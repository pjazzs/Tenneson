exports.validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      res.status(400);
      throw new Error(
        error.details
          .map((detail) => detail.message.replace(/"/g, ""))
          .join(", "),
      );
    }

    next();
  };
};
