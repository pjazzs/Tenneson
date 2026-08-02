const QRCode = require("qrcode");

const generateQRCode = async(studentId)=>{
 return await QRCode.toDataURL(
   `${process.env.APP_URL}/api/v1/students/qrcode/verify/${studentId}`
 );
};

module.exports = generateQRCode;