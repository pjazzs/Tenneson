const jwt = require("jsonwebtoken");

const generateToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id,
      role: admin.role,
      permissions: admin.permissions,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  );
};

module.exports = generateToken;
