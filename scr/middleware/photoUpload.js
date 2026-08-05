const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");


const storage = new CloudinaryStorage({

  cloudinary,

  params: {

    folder: "student-photos",

    allowed_formats: [
      "jpg",
      "jpeg",
      "png",
    ],

  },

});


const uploadPhoto = multer({

  storage,

});


module.exports = uploadPhoto;