const QRCode = require("qrcode");

const generateQRCode = async (studentId) => {
  const encodedStudentId = encodeURIComponent(studentId);

  return await QRCode.toDataURL(
    `${process.env.FRONTEND_URL}/verify/${encodedStudentId}`,
  );
};

module.exports = generateQRCode;
