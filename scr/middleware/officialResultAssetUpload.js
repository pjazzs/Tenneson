const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "official-result-assets",
    allowed_formats: ["jpg", "jpeg", "png"],
  },
});

const uploadOfficialResultAsset = multer({
  storage,
  limits: {
    fileSize: 3 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];

    if (allowedTypes.includes(file.mimetype)) {
      return cb(null, true);
    }

    return cb(new Error("Only JPG, JPEG and PNG images are allowed."));
  },
});

module.exports = uploadOfficialResultAsset;
