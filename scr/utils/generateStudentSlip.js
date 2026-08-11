

const PDFDocument = require("pdfkit");
const path = require("path");
const QRCode = require("qrcode");
const axios = require("axios");



const generateStudentSlip = async (student, res) => {

  try {
    // ==========================================
    // Create PDF
    // ==========================================

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
    });

    // ==========================================
    // Collect PDF chunks into memory
    // ==========================================

    const chunks = [];

    doc.on("data", (chunk) => {
      chunks.push(chunk);
    });

    const pdfBufferPromise = new Promise((resolve, reject) => {
      doc.on("end", () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on("error", (error) => {
        reject(error);
      });
    });

    // ==========================================
    // Helpers
    // ==========================================

    const formatDate = (date) => {
      if (!date) return "N/A";

      return new Date(date).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    };

    const addRow = (label, value) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(12)
        .text(label, {
          continued: true,
        });

      doc
        .font("Helvetica")
        .text(value || "N/A");

      doc.moveDown(0.5);
    };

    // ==========================================
    // Logo
    // ==========================================

    const logoPath = path.join(
      __dirname,
      "../assets/logo.jpeg"
    );

    try {
      doc.image(logoPath, 245, 30, {
        width: 100,
      });
    } catch (error) {
      console.log(
        "Logo loading error:",
        error.message
      );
    }

    doc.moveDown(7);

    // ==========================================
    // Header
    // ==========================================

    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .text(
        "TENNESON COMPREHENSIVE COLLEGE",
        {
          align: "center",
        }
      );

    doc
      .fontSize(16)
      .text(
        "STUDENT REGISTRATION SLIP",
        {
          align: "center",
        }
      );

    doc.moveDown();

    // ==========================================
    // Divider
    // ==========================================

    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown();

    // ==========================================
    // Student Details Area
    // ==========================================

    const detailsStartY = doc.y;
    const startX = 50;

    // ==========================================
    // Student Photo
    // ==========================================

    if (student.photo?.url) {
      try {
        const response = await axios.get(
          student.photo.url,
          {
            responseType: "arraybuffer",
            timeout: 10000,
          }
        );

        const imageBuffer = Buffer.from(
          response.data
        );

        doc.image(
          imageBuffer,
          420,
          detailsStartY,
          {
            width: 90,
            height: 110,
          }
        );

        doc
          .rect(
            420,
            detailsStartY,
            90,
            110
          )
          .stroke();

      } catch (error) {
        console.log(
          "Photo loading error:",
          error.message
        );
      }
    }

    // ==========================================
    // Student Information
    // ==========================================

    doc.y = detailsStartY;
    doc.x = startX;

    addRow(
      "Student ID: ",
      student.studentId
    );

    doc.x = startX;

    addRow(
      "Name: ",
      `${student.firstName} ${
        student.otherName || ""
      } ${student.lastName}`.replace(
        /\s+/g,
        " "
      ).trim()
    );

    doc.x = startX;

    addRow(
      "Gender: ",
      student.gender
    );

    doc.x = startX;

    addRow(
      "Date of Birth: ",
      formatDate(student.dateOfBirth)
    );

    doc.x = startX;

    addRow(
      "Admission Date: ",
      formatDate(student.admissionDate)
    );

    doc.x = startX;

    addRow(
      "Class: ",
      student.currentClass
    );

    doc.x = startX;

    addRow(
      "Session: ",
      student.session
    );

    doc.x = startX;

    addRow(
      "Parent Name: ",
      student.parentName
    );

    doc.x = startX;

    addRow(
      "Parent Phone: ",
      student.parentPhone
    );

    // ==========================================
    // Divider
    // ==========================================

    doc.moveDown();

    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();

    doc.moveDown();

    // ==========================================
    // Notice
    // ==========================================

    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .text(
        "Use this Student ID when creating your account on the main school portal.",
        {
          align: "center",
        }
      );

    doc.moveDown();

    doc
      .font("Helvetica")
      .fontSize(11)
      .text(
        "This document confirms that the student ID belongs to a registered student of Tenneson College.",
        {
          align: "center",
        }
      );

    doc.moveDown(3);

    // ==========================================
    // Signature
    // ==========================================

    const signatureY = doc.y;

    doc.text(
      "____________________________",
      60,
      signatureY
    );

    doc.text(
      "Principal's Signature",
      75
    );

    doc.text(
      "____________________________",
      330,
      signatureY
    );

    doc.text(
      "School Stamp",
      380
    );

    doc.moveDown(4);

    // ==========================================
    // Footer
    // ==========================================

    doc
      .fontSize(10)
      .fillColor("gray")
      .text(
        "Generated by Tenneson School Portal",
        {
          align: "center",
        }
      );

    // ==========================================
    // QR Code
    // ==========================================

    const frontendUrl =
      process.env.FRONTEND_URL;

      console.log(
  "FRONTEND_URL:",
  frontendUrl
);

    if (!frontendUrl) {
      throw new Error(
        "FRONTEND_URL is not configured."
      );
    }

    const verifyUrl =
      `${frontendUrl}/verify/${student.studentId}`;

    const qrCode =
      await QRCode.toDataURL(
        verifyUrl
      );

    doc.moveDown(2);

    doc
      .fontSize(12)
      .fillColor("black")
      .text(
        "Scan to verify student",
        {
          align: "center",
        }
      );

    doc.image(qrCode, {
      fit: [120, 120],
      align: "center",
    });

    // ==========================================
    // Finish PDF
    // ==========================================

    doc.end();

    console.log(
  "PDF DOCUMENT ENDING"
);

    // ==========================================
    // Wait until PDF is completely generated
    // ==========================================

    const pdfBuffer =
      await pdfBufferPromise;

    // ==========================================
    // Send PDF only after generation completes
    // ==========================================

    if (res.headersSent) {
      return;
    }

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${student.studentId}-registration-slip.pdf"`
    );

    res.setHeader(
      "Content-Length",
      pdfBuffer.length
    );

    return res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error(
      "Student slip generation error:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: error.message,
          
      });
    }
  }
};

module.exports = generateStudentSlip;