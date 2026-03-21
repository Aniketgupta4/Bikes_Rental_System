// config/upload.js
const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "bike_rental",             // your folder in Cloudinary
    allowed_formats: ["jpg","png","jpeg","webp","avif"],
    transformation: [{ width: 1200, crop: "limit" }]
  },
});

const upload = multer({ storage });

module.exports = upload;
