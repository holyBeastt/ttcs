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
  //limits: { fileSize: 5000000000000000 * 1024 * 1024 }, // Giới hạn dung lượng 500000000000000MB
  //limits: { fileSize: 9000000000 * 1024 * 1024 }, // Giới hạn dung lượng 9 PB
  // limits: { fileSize: Number.MAX_SAFE_INTEGER }, // ~9 petabytes
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn dung lượng 9 PB
});

module.exports = upload;
