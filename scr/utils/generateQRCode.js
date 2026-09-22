const QRCode = require("qrcode");

const generateQRCode = async (studentIdentifier) => {
  if (!studentIdentifier) {
    throw new Error("Student identifier is required.");
  }

  console.log("QR FRONTEND_URL:", process.env.FRONTEND_URL);

  const encodedIdentifier = encodeURIComponent(studentIdentifier.toString());

  const verificationUrl = `${process.env.FRONTEND_URL}/verify/${encodedIdentifier}`;

  console.log("QR verification URL:", verificationUrl);

  return await QRCode.toDataURL(verificationUrl);
};

module.exports = generateQRCode;
