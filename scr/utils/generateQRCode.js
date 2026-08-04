const QRCode = require("qrcode");

const generateQRCode = async(studentId)=>{
 return await QRCode.toDataURL(
   `${process.env.FRONTEND_URL}/verify/${studentId}`
 );
};

module.exports = generateQRCode; 