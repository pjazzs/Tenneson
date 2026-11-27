const crypto = require("crypto");
const mongoose = require("mongoose");
const asyncHandler = require("express-async-handler");

const Result = require("../models/Result");
const Promotion = require("../models/Promotion");
const ResultDocument = require("../models/ResultDocument");
const SchoolDocumentSettings = require("../models/SchoolDocumentSettings");

const {
  generateOfficialResultPdf,
} = require("../services/officialResultPdfService");

const downloadOfficialResult = asyncHandler(async (req, res) => {
  const studentId = req.student?._id;
  const resultId = req.params.id;

  if (!studentId) {
    return res.status(401).json({
      success: false,
      message: "Student authentication is required.",
    });
  }

  if (!mongoose.Types.ObjectId.isValid(resultId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid result ID.",
    });
  }

  // Enforce ownership and publication status in the database query.
  const result = await Result.findOne({
    _id: resultId,
    student: studentId,
    status: "published",
  })
    .populate({
      path: "student",
      select:
        "studentId firstName lastName otherName gender dateOfBirth currentClass session photo department",
      populate: {
        path: "department",
        select: "name code",
      },
    })
    .populate({
      path: "academicSession",
      select: "name terms",
    })
    .populate({
      path: "subjectResults.subject",
      select: "name code",
    })
    .lean();

  if (!result) {
    return res.status(404).json({
      success: false,
      message: "Published result not found.",
    });
  }

  const [settings, promotion] = await Promise.all([
    SchoolDocumentSettings.findOne({
      key: "official_result_documents",
    }).lean(),

    Promotion.findOne({
      sourceResult: result._id,
    })
      .select("decision fromClass toClass appliedAt")
      .lean(),
  ]);

  const assetSnapshot = {
    stampUrl: settings?.stamp?.url || "",
    signatureUrl: settings?.signature?.url || "",
    assetVersion: settings?.assetVersion || 1,
  };

  const resultForPdf = {
    ...result,
    promotion: promotion || null,
  };

  const verificationCode = crypto.randomBytes(18).toString("hex").toUpperCase();

  const publicAppUrl = (
    process.env.PUBLIC_APP_URL || "https://www.tenneson.com.ng"
  ).replace(/\/+$/, "");

  const verificationUrl = `${publicAppUrl}/verify-result/${verificationCode}`;

  let issuedDocument = null;

  try {
    const pdfBuffer = await generateOfficialResultPdf({
      result: resultForPdf,
      verificationUrl,
      assetSnapshot,
    });

    issuedDocument = await ResultDocument.create({
      result: result._id,
      student: studentId,
      verificationCode,
      resultSnapshot: {
        ...resultForPdf,
      },
      assetSnapshot,
      status: "valid",
      issuedAt: new Date(),
    });

    const safeStudentId = String(
      result.student?.studentId || "student",
    ).replace(/[^a-zA-Z0-9-_]/g, "-");

    const safeTerm = String(result.term || "result").replace(
      /[^a-zA-Z0-9-_]/g,
      "-",
    );

    const safeSession = String(
      result.academicSession?.name || "session",
    ).replace(/[^a-zA-Z0-9-_]/g, "-");

    const filename = `${safeStudentId}-${safeSession}-${safeTerm}-official-result.pdf`;

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": pdfBuffer.length,
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    });

    return res.status(200).send(pdfBuffer);
  } catch (error) {
    if (issuedDocument?._id) {
      await ResultDocument.deleteOne({
        _id: issuedDocument._id,
      });
    }

    console.error("Official result PDF generation failed:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to generate the official result document.",
    });
  }
});

module.exports = {
  downloadOfficialResult,
};
