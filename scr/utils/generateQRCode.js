const QRCode = require("qrcode");

const generateQRCode = async (studentIdentifier) => {
  if (!studentIdentifier) {
    throw new Error("Student identifier is required.");
  }

  const encodedIdentifier = encodeURIComponent(studentIdentifier.toString());

  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${encodedIdentifier}`;

  return await QRCode.toDataURL(verificationUrl);
};

module.exports = generateQRCode;
