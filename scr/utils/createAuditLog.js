const AuditLog = require("../models/AuditLog");

const createAuditLog = async ({
  user = null,
  teacher = null,
  action,
  module,
  description,
  req,
}) => {
  try {
    await AuditLog.create({
      user,
      teacher,
      action,
      module,
      description,
      ipAddress: req?.ip || "unknown",
    });
  } catch (error) {
    console.log("Audit log error:", error.message);
  }
};

module.exports = createAuditLog;
