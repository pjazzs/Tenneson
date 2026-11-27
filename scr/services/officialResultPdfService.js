const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const SCHOOL_NAME = "TENNESON COMPREHENSIVE COLLEGE";
const SCHOOL_ADDRESS = "Obantoko, Abeokuta, Ogun State";
const SCHOOL_MOTTO = "Excellence in Learning and Character";

const PAGE_LEFT = 30;
const PAGE_RIGHT = 30;
const PAGE_TOP = 22;
const PAGE_BOTTOM = 30;

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

    // Only accept HTTPS images delivered by Cloudinary.
    if (
      parsedUrl.protocol !== "https:" ||
      parsedUrl.hostname !== "res.cloudinary.com"
    ) {
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

  const isSeniorClass = /^SS[123]$/i.test(
    String(result.currentClass || student.currentClass || "").trim(),
  );

  const department = isSeniorClass
    ? student.department?.name
      ? `${student.department.name} (${student.department.code || ""})`
      : "—"
    : null;

  // --------------------------------------------------
  // LOAD SCHOOL AND STUDENT IMAGES
  // --------------------------------------------------

  const logoPath = path.join(__dirname, "../assets/logo.jpeg");

  let logoBuffer = null;

  try {
    if (fs.existsSync(logoPath)) {
      logoBuffer = fs.readFileSync(logoPath);
    }
  } catch (error) {
    console.error("Unable to load school logo:", error.message);
  }

  const [qrBuffer, stampBuffer, signatureBuffer, studentPhotoBuffer] =
    await Promise.all([
      QRCode.toBuffer(verificationUrl, {
        type: "png",
        width: 220,
        margin: 1,
        errorCorrectionLevel: "H",
      }),

      fetchImageBuffer(assetSnapshot.stampUrl),
      fetchImageBuffer(assetSnapshot.signatureUrl),
      fetchImageBuffer(student.photo?.url),
    ]);

  // --------------------------------------------------
  // INITIALIZE PDF
  // --------------------------------------------------

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margins: {
      top: PAGE_TOP,
      bottom: PAGE_BOTTOM,
      left: PAGE_LEFT,
      right: PAGE_RIGHT,
    },
    bufferPages: true,
    info: {
      Title: `Official Result - ${studentName}`,
      Author: SCHOOL_NAME,
      Subject: "Official Student Academic Result",
      Creator: "Tenneson School Management System",
    },
  });

  const chunks = [];

  const pdfBufferPromise = new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;

  const contentWidth = pageWidth - PAGE_LEFT - PAGE_RIGHT;
  const bottomLimit = pageHeight - PAGE_BOTTOM - 12;

  // --------------------------------------------------
  // PAGE SPACE MANAGEMENT
  // --------------------------------------------------

  const addContentPage = () => {
    doc.addPage();
    doc.y = PAGE_TOP;
  };

  const ensureSpace = (height) => {
    if (doc.y + height > bottomLimit) {
      addContentPage();
      return true;
    }

    return false;
  };

  // --------------------------------------------------
  // SECTION TITLE
  // --------------------------------------------------

  const drawSectionTitle = (title) => {
    ensureSpace(21);

    // Capture the starting position before drawing.
    const sectionY = doc.y;

    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor("#17365D")
      .text(title.toUpperCase(), PAGE_LEFT, sectionY, {
        lineBreak: false,
      });

    const lineY = sectionY + 13;

    doc
      .moveTo(PAGE_LEFT, lineY)
      .lineTo(pageWidth - PAGE_RIGHT, lineY)
      .lineWidth(0.7)
      .strokeColor("#AAB7C4")
      .stroke();

    // Explicitly control the next content position.
    doc.y = sectionY + 18;
  };

  // --------------------------------------------------
  // FIXED-POSITION DETAIL FIELD
  // --------------------------------------------------

  const drawDetail = (label, value, x, y, width) => {
    const previousY = doc.y;

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor("#657080")
      .text(String(label || ""), x, y, {
        width,
        height: 9,
        lineBreak: false,
        ellipsis: true,
      });

    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor("#172033")
      .text(String(value ?? "—"), x, y + 10, {
        width,
        height: 11,
        lineBreak: false,
        ellipsis: true,
      });

    // Prevent fixed-position text from moving the document cursor.
    doc.y = previousY;
  };

  // --------------------------------------------------
  // SCHOOL HEADER
  // --------------------------------------------------

  const headerY = PAGE_TOP;

  if (logoBuffer) {
    try {
      doc.image(logoBuffer, PAGE_LEFT, headerY, {
        fit: [58, 58],
        align: "center",
        valign: "center",
      });
    } catch (error) {
      console.error("Unable to embed school logo:", error.message);
    }
  }

  if (studentPhotoBuffer) {
    try {
      doc.image(studentPhotoBuffer, pageWidth - PAGE_RIGHT - 65, headerY, {
        fit: [62, 62],
        align: "center",
        valign: "center",
      });
    } catch (error) {
      console.error("Unable to embed student photograph:", error.message);
    }
  }

  const headerTextX = PAGE_LEFT + 70;
  const headerTextWidth = contentWidth - 140;

  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor("#17365D")
    .text(SCHOOL_NAME, headerTextX, headerY + 3, {
      width: headerTextWidth,
      align: "center",
    });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#333333")
    .text(SCHOOL_ADDRESS, headerTextX, headerY + 26, {
      width: headerTextWidth,
      align: "center",
    });

  doc
    .font("Helvetica-Oblique")
    .fontSize(8)
    .fillColor("#555555")
    .text(SCHOOL_MOTTO, headerTextX, headerY + 38, {
      width: headerTextWidth,
      align: "center",
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#17365D")
    .text("OFFICIAL STUDENT RESULT", headerTextX, headerY + 51, {
      width: headerTextWidth,
      align: "center",
    });

  doc.y = headerY + 77;

  // --------------------------------------------------
  // STUDENT INFORMATION
  // --------------------------------------------------

  drawSectionTitle("Student Information");

  const columns = isSeniorClass ? 5 : 4;
  const infoColumnWidth = contentWidth / columns;
  const firstInfoY = doc.y;

  const infoItems = [
    ["Student Name", studentName],
    ["Student ID", student.studentId],
    ["Class", result.currentClass || student.currentClass],
    ["Gender", student.gender],
  ];

  if (isSeniorClass) {
    infoItems.push(["Department", department]);
  }

  infoItems.forEach(([label, value], index) => {
    drawDetail(
      label,
      value,
      PAGE_LEFT + index * infoColumnWidth,
      firstInfoY,
      infoColumnWidth - 8,
    );
  });

  doc.y = firstInfoY + 27;

  const secondInfoY = doc.y;
  const dateColumnWidth = contentWidth / 4;

  const academicInfo = [
    ["Academic Session", academicSession.name],
    ["Term", formatTerm(result.term)],
    ["Closing Date", formatDate(result.termDates?.closingDate)],
    ["Resumption Date", formatDate(result.termDates?.resumptionDate)],
  ];

  academicInfo.forEach(([label, value], index) => {
    drawDetail(
      label,
      value,
      PAGE_LEFT + index * dateColumnWidth,
      secondInfoY,
      dateColumnWidth - 8,
    );
  });

  doc.y = secondInfoY + 27;

  // --------------------------------------------------
  // ACADEMIC PERFORMANCE TABLE
  // --------------------------------------------------

  drawSectionTitle("Academic Performance");

  const tableColumns = isThirdTerm
    ? [
        { label: "SUBJECT", width: 150, key: "subject" },
        { label: "1ST TERM", width: 65, key: "firstTerm" },
        { label: "2ND TERM", width: 65, key: "secondTerm" },
        { label: "CA 1", width: 45, key: "ca1" },
        { label: "CA 2", width: 45, key: "ca2" },
        { label: "EXAM", width: 50, key: "exam" },
        { label: "TOTAL", width: 55, key: "total" },
        { label: "CUMULATIVE", width: 65, key: "cumulative" },
        { label: "AVERAGE", width: 55, key: "average" },
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

  const originalTableWidth = tableColumns.reduce(
    (sum, column) => sum + column.width,
    0,
  );

  const tableScale = contentWidth / originalTableWidth;

  const scaledColumns = tableColumns.map((column) => ({
    ...column,
    width: column.width * tableScale,
  }));

  const rowHeight = 18;
  const headerHeight = 19;

  const drawTableHeader = () => {
    const headerY = doc.y;
    let x = PAGE_LEFT;

    doc.rect(PAGE_LEFT, headerY, contentWidth, headerHeight).fill("#17365D");

    scaledColumns.forEach((column) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(6)
        .fillColor("#FFFFFF")
        .text(column.label, x + 3, headerY + 6, {
          width: column.width - 6,
          align: column.align || "left",
          height: 9,
          lineBreak: false,
          ellipsis: true,
        });

      x += column.width;
    });

    doc.y = headerY + headerHeight;
  };

  const drawSubjectRow = (subject, index) => {
    if (doc.y + rowHeight > bottomLimit) {
      addContentPage();
      drawTableHeader();
    }

    const rowY = doc.y;

    if (index % 2 === 0) {
      doc.rect(PAGE_LEFT, rowY, contentWidth, rowHeight).fill("#F0F4F8");
    }

    const values = {
      subject: subject.subject?.name || subject.subjectName || "—",
      firstTerm: formatScore(subject.firstTerm?.total),
      secondTerm: formatScore(subject.secondTerm?.total),
      ca1: formatScore(subject.ca1),
      ca2: formatScore(subject.ca2),
      exam: formatScore(subject.exam),
      total: formatScore(subject.total),
      cumulative: formatScore(subject.cumulativeScore),
      average: formatScore(subject.weightedAverage),
      grade: subject.grade || "—",
      remark: subject.remark || "—",
    };

    let x = PAGE_LEFT;

    scaledColumns.forEach((column) => {
      doc
        .font("Helvetica")
        .fontSize(7)
        .fillColor("#172033")
        .text(String(values[column.key] ?? "—"), x + 3, rowY + 5, {
          width: column.width - 6,
          align:
            column.key === "subject" || column.key === "remark"
              ? "left"
              : "center",
          lineBreak: false,
          ellipsis: true,
        });

      x += column.width;
    });

    doc.y = rowY + rowHeight;
  };

  // Ensure the table heading and at least one row stay together.
  if (doc.y + headerHeight + rowHeight > bottomLimit) {
    addContentPage();
  }

  drawTableHeader();

  subjects.forEach((subject, index) => {
    drawSubjectRow(subject, index);
  });

  if (subjects.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#555555")
      .text("No subject results are available.", PAGE_LEFT, doc.y + 4);

    doc.y += 20;
  }

  doc.y += 3;

  // --------------------------------------------------
  // RESULT SUMMARY
  // --------------------------------------------------

  drawSectionTitle("Result Summary");

  const summaryY = doc.y;
  const summaryColumnWidth = contentWidth / 4;

  const summaryItems = [
    ["Total Score", result.totalScore],
    ["Total Obtainable", result.totalObtainableMarks],
    [
      "Overall Percentage",
      result.overallPercentage !== undefined &&
      result.overallPercentage !== null
        ? `${Number(result.overallPercentage).toFixed(2)}%`
        : "—",
    ],
    ["Performance", result.performanceComment],
  ];

  summaryItems.forEach(([label, value], index) => {
    drawDetail(
      label,
      value,
      PAGE_LEFT + index * summaryColumnWidth,
      summaryY,
      summaryColumnWidth - 8,
    );
  });

  doc.y = summaryY + 25;

  // --------------------------------------------------
  // ATTENDANCE
  // --------------------------------------------------

  const attendance = result.attendance || {};

  drawSectionTitle("Attendance");

  const attendanceY = doc.y;
  const attendanceColumnWidth = contentWidth / 3;

  [
    ["Days School Opened", attendance.daysSchoolOpened],
    ["Days Present", attendance.daysPresent],
    ["Days Absent", attendance.daysAbsent],
  ].forEach(([label, value], index) => {
    drawDetail(
      label,
      value,
      PAGE_LEFT + index * attendanceColumnWidth,
      attendanceY,
      attendanceColumnWidth - 8,
    );
  });

  doc.y = attendanceY + 25;

  // --------------------------------------------------
  // SCHOOL COMMENTS
  // --------------------------------------------------

  const comments = result.comments || {};

  const commentEntries = [
    ["Class Teacher", comments.classTeacher],
    ["Principal", comments.principal],
    ["Performance", comments.performance],
  ].filter(([, value]) => Boolean(value));

  if (commentEntries.length > 0) {
    drawSectionTitle("School Comments");

    commentEntries.forEach(([label, value]) => {
      const commentText = `${label}: ${value}`;

      doc.font("Helvetica").fontSize(8);

      const estimatedHeight =
        doc.heightOfString(commentText, {
          width: contentWidth,
          lineGap: 1,
        }) + 4;

      ensureSpace(estimatedHeight);

      const commentY = doc.y;

      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor("#17365D")
        .text(`${label}:`, PAGE_LEFT, commentY, {
          continued: true,
        });

      doc.font("Helvetica").fontSize(8).fillColor("#172033").text(` ${value}`, {
        width: contentWidth,
        lineGap: 1,
      });

      // Use the measured height instead of automatic cursor spacing.
      doc.y = commentY + estimatedHeight;
    });
  }

  // --------------------------------------------------
  // PROMOTION
  // --------------------------------------------------

  if (isThirdTerm) {
    drawSectionTitle("Promotion");

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

    const promotionLines = [
      `System Recommendation: ${
        recommendationLabels[result.promotionStatus] || "Not Available"
      }`,
      `Principal's Final Decision: ${
        principalDecisionLabels[actualDecision] ||
        principalDecisionLabels[result.principalDecision] ||
        "Pending"
      }`,
    ];

    if (result.promotion?.toClass) {
      promotionLines.push(`Next Class: ${result.promotion.toClass}`);
    }

    promotionLines.forEach((line) => {
      doc.font("Helvetica").fontSize(8);

      const lineHeight =
        doc.heightOfString(line, {
          width: contentWidth,
        }) + 3;

      ensureSpace(lineHeight);

      const lineY = doc.y;

      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#172033")
        .text(line, PAGE_LEFT, lineY, {
          width: contentWidth,
        });

      doc.y = lineY + lineHeight;
    });
  }

  // --------------------------------------------------
  // SIGNATURE, STAMP AND VERIFICATION
  // --------------------------------------------------

  // Compact approval block: approximately 75 points high.
  const approvalHeight = 76;

  ensureSpace(approvalHeight);

  const approvalY = doc.y + 2;

  const signatureX = PAGE_LEFT;
  const stampX = PAGE_LEFT + 205;

  const qrLabelX = pageWidth - PAGE_RIGHT - 105;
  const qrX = qrLabelX + 27;

  // Proprietor signature heading.
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor("#17365D")
    .text("PROPRIETOR'S SIGNATURE", signatureX, approvalY, {
      lineBreak: false,
    });

  // Signature image.
  if (signatureBuffer) {
    try {
      doc.image(signatureBuffer, signatureX, approvalY + 10, {
        fit: [125, 24],
      });
    } catch (error) {
      console.error("Unable to embed signature:", error.message);
    }
  }

  // Signature line.
  doc
    .strokeColor("#333333")
    .lineWidth(0.6)
    .moveTo(signatureX, approvalY + 39)
    .lineTo(signatureX + 135, approvalY + 39)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#555555")
    .text("Proprietor", signatureX, approvalY + 43, {
      lineBreak: false,
    });

  // School stamp.
  if (stampBuffer) {
    try {
      doc.image(stampBuffer, stampX, approvalY + 5, {
        fit: [65, 52],
        align: "center",
        valign: "center",
      });
    } catch (error) {
      console.error("Unable to embed stamp:", error.message);
    }
  }

  // QR verification heading.
  doc
    .font("Helvetica-Bold")
    .fontSize(7)
    .fillColor("#17365D")
    .text("SCAN TO VERIFY", qrLabelX, approvalY, {
      width: 105,
      align: "center",
      lineBreak: false,
    });

  // QR code.
  doc.image(qrBuffer, qrX, approvalY + 10, {
    fit: [50, 50],
  });

  // Verification instruction.
  doc
    .font("Helvetica")
    .fontSize(6.5)
    .fillColor("#555555")
    .text("Verify this result online.", qrLabelX, approvalY + 61, {
      width: 105,
      align: "center",
      lineBreak: false,
    });

  doc.y = approvalY + approvalHeight;

  // --------------------------------------------------
  // PAGE FOOTERS
  // --------------------------------------------------

  const pages = doc.bufferedPageRange();

  for (let i = 0; i < pages.count; i += 1) {
    doc.switchToPage(i);

    doc
      .font("Helvetica")
      .fontSize(6.5)
      .fillColor("#777777")
      .text(
        `Official Result | ${student.studentId || ""} | Page ${
          i + 1
        } of ${pages.count}`,
        PAGE_LEFT,
        pageHeight - PAGE_BOTTOM - 9,
        {
          width: contentWidth,
          height: 8,
          align: "center",
          lineBreak: false,
        },
      );
  }

  doc.end();

  return pdfBufferPromise;
};

module.exports = {
  generateOfficialResultPdf,
};
