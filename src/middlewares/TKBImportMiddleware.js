const multer = require("multer");

// Sử dụng bộ nhớ RAM, không lưu file ra đĩa
const storage = multer.memoryStorage();

// Tạo instance multer
const upload = multer({ storage });

// Middleware dùng cho upload 1 file input tên là "file"
const uploadSingleFile = upload.single("file");

module.exports = {
  uploadSingleFile,
};
