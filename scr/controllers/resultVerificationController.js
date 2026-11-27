const asyncHandler = require("express-async-handler");
const ResultDocument = require("../models/ResultDocument");

const verifyOfficialResult = asyncHandler(async (req, res) => {
  const { code } = req.params;

  if (!code || !/^[A-F0-9]{36}$/.test(code)) {
    return res.status(400).json({
      success: false,
      message: "Invalid verification code.",
    });
  }

  const document = await ResultDocument.findOne({
    verificationCode: code,
  })
    .select(
      "verificationCode resultSnapshot status issuedAt supersededAt revokedAt revocationReason",
    )
    .lean();

  if (!document) {
    return res.status(404).json({
      success: false,
      valid: false,
      status: "not_found",
      message: "This result document could not be verified.",
    });
  }

  const snapshot = document.resultSnapshot || {};
  const student = snapshot.student || {};
  const academicSession = snapshot.academicSession || {};

  const statusMessages = {
    valid: "This official result document is authentic and currently valid.",
    superseded: "This result document has been superseded by a newer version.",
    revoked: "This result document has been revoked by the school.",
  };

  return res.status(200).json({
    success: true,
    valid: document.status === "valid",
    status: document.status,
    message:
      statusMessages[document.status] ||
      "The document status could not be determined.",

    document: {
      verificationCode: document.verificationCode,
      issuedAt: document.issuedAt,
      supersededAt: document.supersededAt,
      revokedAt: document.revokedAt,
      revocationReason:
        document.status === "revoked" ? document.revocationReason : undefined,
    },

    student: {
      studentId: student.studentId || "",
      name: [student.firstName, student.otherName, student.lastName]
        .filter(Boolean)
        .join(" "),
      class: snapshot.currentClass || "",
    },

    result: {
      academicSession: academicSession.name || "",
      term: snapshot.term || "",
      publishedAt: snapshot.publishedAt || null,
    },
  });
});

module.exports = {
  verifyOfficialResult,
};
