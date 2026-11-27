const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const axios = require("axios");

const SCHOOL_NAME = "TENNESON COMPREHENSIVE COLLEGE";
const SCHOOL_ADDRESS = "Obantoko, Abeokuta, Ogun State";
const SCHOOL_MOTTO = "Excellence in Learning and Character";

const formatTerm = (term) => {
  const terms = {
    first: "First Term",
    second: "Second Term",
    third: "Third Term",
  };

  return terms[String(term || "").toLowerCase()] || term || "Term";
};

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatScore = (value) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number) ? number.toFixed(1) : "—";
};

const fetchImageBuffer = async (url) => {
  if (!url) return null;

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "https:") {
      return null;
    }

    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 10000,
      maxContentLength: 3 * 1024 * 1024,
      maxBodyLength: 3 * 1024 * 1024,
    });

    const contentType = response.headers["content-type"] || "";

    if (!contentType.startsWith("image/")) {
      return null;
    }

    return Buffer.from(response.data);
  } catch (error) {
    console.error("Unable to load official result image:", error.message);
    return null;
  }
};

const generateOfficialResultPdf = async ({
  result,
  verificationUrl,
  assetSnapshot = {},
}) => {
  if (!result || !result.student) {
    throw new Error("A populated result and student are required.");
  }

  if (!verificationUrl) {
    throw new Error("A verification URL is required.");
  }

  const student = result.student;
  const academicSession = result.academicSession || {};
  const subjects = Array.isArray(result.subjectResults)
    ? result.subjectResults.filter((item) => item.offered !== false)
    : [];

  const studentName = [student.firstName, student.otherName, student.lastName]
    .filter(Boolean)
    .join(" ");

  const isThirdTerm = result.term === "third";

  const [qrBuffer, stampBuffer, signatureBuffer] = await Promise.all([
    QRCode.toBuffer(verificationUrl, {
      type: "png",
      width: 220,
      margin: 1,
      errorCorrectionLevel: "H",
    }),

    fetchImageBuffer(assetSnapshot.stampUrl),

    fetchImageBuffer(assetSnapshot.signatureUrl),
  ]);

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: {
      top: 35,
      bottom: 40,
      left: 35,
      right: 35,
    },
    bufferPages: true,
    info: {
      Title: `Official Result - ${studentName}`,
      Author: SCHOOL_NAME,
      Subject: `${formatTerm(result.term)} Result`,
    },
  });

  const chunks = [];

  const pdfBufferPromise = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 70;

  const ensureSpace = (height) => {
    if (doc.y + height > doc.page.height - 55) {
      doc.addPage();
      doc.y = 35;
    }
  };

  const sectionTitle = (title) => {
    ensureSpace(35);

    doc
      .moveDown(0.5)
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#17365D")
      .text(title.toUpperCase());

    doc
      .moveDown(0.3)
      .strokeColor("#B8C7D9")
      .moveTo(35, doc.y)
      .lineTo(pageWidth - 35, doc.y)
      .stroke();

    doc.moveDown(0.5);
  };

  const detail = (label, value, x, y, width = 150) => {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#555555")
      .text(label.toUpperCase(), x, y, { width });

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#172033")
      .text(String(value ?? "—"), x, y + 12, { width });
  };

  // --------------------------------------------------
  // SCHOOL HEADING
  // --------------------------------------------------

  doc
    .font("Helvetica-Bold")
    .fontSize(19)
    .fillColor("#17365D")
    .text(SCHOOL_NAME, 35, 35, {
      width: contentWidth,
      align: "center",
    });

  doc.font("Helvetica").fontSize(9).fillColor("#555555").text(SCHOOL_ADDRESS, {
    align: "center",
  });

  doc.font("Helvetica-Oblique").fontSize(8).text(SCHOOL_MOTTO, {
    align: "center",
  });

  doc.moveDown(0.8);

  doc
    .font("Helvetica-Bold")
    .fontSize(14)
    .fillColor("#111827")
    .text("OFFICIAL STUDENT RESULT", {
      align: "center",
    });

  doc.moveDown(0.8);

  // --------------------------------------------------
  // STUDENT INFORMATION
  // --------------------------------------------------

  sectionTitle("Student Information");

  const infoY = doc.y;
  const colWidth = contentWidth / 4;

  detail("Student Name", studentName, 35, infoY, colWidth - 10);
  detail("Student ID", student.studentId, 35 + colWidth, infoY, colWidth - 10);
  detail("Class", result.currentClass, 35 + colWidth * 2, infoY, colWidth - 10);
  detail("Gender", student.gender, 35 + colWidth * 3, infoY, colWidth - 10);

  doc.y = infoY + 38;

  detail("Academic Session", academicSession.name, 35, doc.y, colWidth - 10);
  detail("Term", formatTerm(result.term), 35 + colWidth, doc.y, colWidth - 10);
  detail(
    "Closing Date",
    formatDate(result.termDates?.closingDate),
    35 + colWidth * 2,
    doc.y,
    colWidth - 10,
  );
  detail(
    "Resumption Date",
    formatDate(result.termDates?.resumptionDate),
    35 + colWidth * 3,
    doc.y,
    colWidth - 10,
  );

  doc.y += 40;

  // --------------------------------------------------
  // SUBJECT RESULTS
  // --------------------------------------------------

  sectionTitle("Academic Performance");

  const columns = isThirdTerm
    ? [
        { label: "SUBJECT", width: 150, key: "subject" },
        { label: "1ST TERM", width: 65, key: "firstTerm" },
        { label: "2ND TERM", width: 65, key: "secondTerm" },
        { label: "CA 1", width: 45, key: "ca1" },
        { label: "CA 2", width: 45, key: "ca2" },
        { label: "EXAM", width: 50, key: "exam" },
        { label: "TOTAL", width: 55, key: "total" },
        { label: "CUMULATIVE", width: 65, key: "cumulativeScore" },
        { label: "AVERAGE", width: 55, key: "weightedAverage" },
        { label: "GRADE", width: 45, key: "grade" },
        { label: "REMARK", width: 85, key: "remark" },
      ]
    : [
        { label: "SUBJECT", width: 210, key: "subject" },
        { label: "CA 1", width: 65, key: "ca1" },
        { label: "CA 2", width: 65, key: "ca2" },
        { label: "EXAM", width: 75, key: "exam" },
        { label: "TOTAL", width: 85, key: "total" },
        { label: "GRADE", width: 65, key: "grade" },
        { label: "REMARK", width: 100, key: "remark" },
      ];

  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const scale = contentWidth / tableWidth;

  const drawTableHeader = () => {
    const y = doc.y;
    let x = 35;

    doc.rect(35, y, contentWidth, 23).fill("#17365D");

    columns.forEach((column) => {
      const width = column.width * scale;

      doc
        .font("Helvetica-Bold")
        .fontSize(7)
        .fillColor("#FFFFFF")
        .text(column.label, x + 3, y + 8, {
          width: width - 6,
          align:
            column.key === "subject" || column.key === "remark"
              ? "left"
              : "center",
        });

      x += width;
    });

    doc.y = y + 23;
  };

  const drawSubjectRow = (subject, index) => {
    const rowHeight = 23;
    ensureSpace(rowHeight + 5);

    if (doc.y < 60) {
      drawTableHeader();
    }

    const y = doc.y;
    let x = 35;

    if (index % 2 === 0) {
      doc.rect(35, y, contentWidth, rowHeight).fill("#F1F5F9");
    }

    const values = {
      subject:
        subject.subjectName || subject.subject?.name || "Unnamed Subject",

      firstTerm: formatScore(subject.firstTerm?.total),
      secondTerm: formatScore(subject.secondTerm?.total),
      ca1: formatScore(subject.ca1),
      ca2: formatScore(subject.ca2),
      exam: formatScore(subject.exam),
      total: formatScore(subject.total),
      cumulativeScore: formatScore(subject.cumulativeScore),
      weightedAverage: formatScore(subject.weightedAverage),
      grade: subject.grade || "—",
      remark: subject.remark || "—",
    };

    columns.forEach((column) => {
      const width = column.width * scale;
      const alignment =
        column.key === "subject" || column.key === "remark" ? "left" : "center";

      doc
        .font("Helvetica")
        .fontSize(7.5)
        .fillColor("#172033")
        .text(String(values[column.key]), x + 3, y + 7, {
          width: width - 6,
          height: 12,
          ellipsis: true,
          align: alignment,
        });

      x += width;
    });

    doc
      .strokeColor("#D8E0EA")
      .moveTo(35, y + rowHeight)
      .lineTo(pageWidth - 35, y + rowHeight)
      .stroke();

    doc.y = y + rowHeight;
  };

  drawTableHeader();

  subjects.forEach((subject, index) => {
    drawSubjectRow(subject, index);
  });

  doc.moveDown(0.8);

  // --------------------------------------------------
  // OVERALL SUMMARY
  // --------------------------------------------------

  sectionTitle("Result Summary");

  const summaryY = doc.y;

  detail("Total Score", result.totalScore, 35, summaryY, 120);
  detail("Total Obtainable", result.totalObtainableMarks, 190, summaryY, 140);
  detail(
    "Overall Percentage",
    `${Number(result.overallPercentage || 0).toFixed(2)}%`,
    365,
    summaryY,
    140,
  );

  detail("Performance", result.performanceComment || "—", 540, summaryY, 180);

  doc.y = summaryY + 42;

  // --------------------------------------------------
  // ATTENDANCE
  // --------------------------------------------------

  sectionTitle("Attendance");

  const attendance = result.attendance || {};
  const attendanceY = doc.y;

  detail(
    "Days School Opened",
    attendance.daysSchoolOpened,
    35,
    attendanceY,
    150,
  );
  detail("Days Present", attendance.daysPresent, 230, attendanceY, 120);
  detail("Days Absent", attendance.daysAbsent, 410, attendanceY, 120);

  doc.y = attendanceY + 40;

  // --------------------------------------------------
  // COMMENTS
  // --------------------------------------------------

  sectionTitle("School Comments");

  const comments = result.comments || {};

  const commentEntries = [
    ["Class Teacher", comments.classTeacher],
    ["Principal", comments.principal],
    ["Performance", comments.performance],
  ];

  commentEntries.forEach(([label, value]) => {
    if (!value) return;

    ensureSpace(35);

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#17365D")
      .text(`${label}:`);

    doc.font("Helvetica").fontSize(9).fillColor("#172033").text(value, {
      width: contentWidth,
    });

    doc.moveDown(0.4);
  });

  // --------------------------------------------------
  // PROMOTION
  // --------------------------------------------------

  if (isThirdTerm) {
    sectionTitle("Promotion");

    const recommendationLabels = {
      recommended_promoted: "Recommended for Promotion",
      recommended_repeat: "Recommended to Repeat",
      not_applicable: "Not Applicable",
    };

    const principalDecisionLabels = {
      promoted: "Promoted",
      repeat: "Repeat",
      pending: "Pending Principal's Decision",
    };

    const actualDecision = result.promotion?.decision;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#172033")
      .text(
        `System Recommendation: ${
          recommendationLabels[result.promotionStatus] || "Not Available"
        }`,
      );

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#172033")
      .text(
        `Principal's Final Decision: ${
          principalDecisionLabels[actualDecision] ||
          principalDecisionLabels[result.principalDecision] ||
          "Pending"
        }`,
      );

    if (result.promotion?.toClass) {
      doc
        .font("Helvetica")
        .fontSize(9)
        .text(`Next Class: ${result.promotion.toClass}`);
    }

    doc.moveDown(0.7);
  }
  // --------------------------------------------------
  // SIGNATURE, STAMP AND VERIFICATION
  // --------------------------------------------------

  ensureSpace(135);

  const approvalY = doc.y + 5;

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#555555")
    .text("PROPRIETOR'S SIGNATURE", 35, approvalY);

  if (signatureBuffer) {
    try {
      doc.image(signatureBuffer, 35, approvalY + 12, {
        fit: [145, 55],
      });
    } catch (error) {
      console.error("Unable to embed signature:", error.message);
    }
  }

  doc
    .strokeColor("#333333")
    .moveTo(35, approvalY + 72)
    .lineTo(180, approvalY + 72)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(8)
    .text("Proprietor", 35, approvalY + 77);

  if (stampBuffer) {
    try {
      doc.image(stampBuffer, 230, approvalY + 5, {
        fit: [105, 95],
        align: "center",
      });
    } catch (error) {
      console.error("Unable to embed stamp:", error.message);
    }
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor("#17365D")
    .text("SCAN TO VERIFY THIS RESULT", 490, approvalY + 5, {
      width: 180,
      align: "center",
    });

  doc.image(qrBuffer, 535, approvalY + 20, {
    fit: [85, 85],
    align: "center",
  });

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#555555")
    .text("This document can be verified online.", 490, approvalY + 110, {
      width: 180,
      align: "center",
    });

  // --------------------------------------------------
  // PAGE FOOTERS
  // --------------------------------------------------

  const pages = doc.bufferedPageRange();

  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(i);

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#777777")
      .text(
        `Official Result | ${student.studentId || ""} | Page ${i + 1} of ${pages.count}`,
        35,
        doc.page.height - 25,
        {
          width: contentWidth,
          align: "center",
        },
      );
  }

  doc.end();

  return pdfBufferPromise;
};

module.exports = {
  generateOfficialResultPdf,
};
