const multer = require("multer");
const path = require("path");

// Cấu hình multer để lưu file tải lên
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Chỉ định thư mục lưu trữ
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname); // Lưu file với tên gốc
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // Giới hạn dung lượng 500MB
});

module.exports = upload;
