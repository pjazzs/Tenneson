exports.authorize = (...roles) => {
  return (req, res, next) => {
    // req.admin was attached by the protect middleware
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action.",
      });
    }

    next();
  };
};
