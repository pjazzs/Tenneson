const ActivityLog = require("../models/activityLog");

const logActivity = async ({
  adminId,
  action,
  studentId = null,
  details = "",
}) => {
  await ActivityLog.create({
    admin: adminId,
    action,
    studentId,
    details,
  });
};

module.exports = logActivity;
