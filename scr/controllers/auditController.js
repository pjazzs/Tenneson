const AuditLog = require("../models/AuditLog");

exports.getAuditLogs = async (req, res) => {
  try {
    const requestedPage = Number(req.query.page);
    const requestedLimit = Number(req.query.limit);

    const page =
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    const limit =
      Number.isInteger(requestedLimit) && requestedLimit > 0
        ? Math.min(requestedLimit, 100)
        : 20;

    const skip = (page - 1) * limit;

    const [logs, totalLogs] = await Promise.all([
      AuditLog.find()
        .populate("user", "fullName email role")
        .populate("teacher", "fullName email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      AuditLog.countDocuments(),
    ]);

    const totalPages = Math.ceil(totalLogs / limit);

    return res.status(200).json({
      success: true,
      count: totalLogs,
      page,
      limit,
      totalPages,
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
