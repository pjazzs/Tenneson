const QRCode = require("qrcode");

const generateQRCode = async(studentId)=>{
 return await QRCode.toDataURL(
   `https://yourdomain.com/api/v1/students/verify/${studentId}`
 );
};

module.exports = generateQRCode;