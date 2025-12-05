const express = require("express");
const multer = require("multer");
const router = express.Router();
const path = require("path");

const {
  createGvm,
  getBoMonList,
} = require("../controllers/createGvmController");

const storage = multer.memoryStorage();

// Map extension → MIME gốc
const mimeMap = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  jfif: "image/jpeg",

  pdf: "application/pdf",

  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

// Danh sách ext cho phép (tự động từ mimeMap)
const allowedExtensions = Object.keys(mimeMap);

// Hàm filter thông minh
const fileFilter = (req, file, cb) => {
  if (!file) return cb(null, false);

  // Lấy ext (không có dấu chấm)
  const ext = path.extname(file.originalname).replace(".", "").toLowerCase();

  // ❌ Không nằm trong danh sách ext cho phép
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error("Định dạng file không được phép!"), false);
  }

  // MIME cần theo đúng map
  const expectedMime = mimeMap[ext];

  // Nếu file gửi lên đúng MIME → ok
  if (file.mimetype === expectedMime) {
    return cb(null, true);
  }

  // Nếu trình duyệt gửi "application/octet-stream"
  // → cho phép, vì file memoryStorage sẽ dùng ext để xử lý tiếp
  if (file.mimetype === "application/octet-stream") {
    return cb(null, true);
  }

  // ❌ Nếu khác MIME → người dùng đã đổi tên file (fake extension)
  return cb(new Error("MIME không hợp lệ hoặc file bị đổi tên!"), false);
};


let upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // giới hạn 5MB
});

router.post(
  "/daotaonhap",
  upload.fields([
    { name: "truocCCCD", maxCount: 1 },
    { name: "sauCCCD", maxCount: 1 },
    { name: "bangTotNghiep", maxCount: 1 },
    { name: "FileLyLich", maxCount: 1 },
    { name: "fileBoSung", maxCount: 1 },
    { name: "QrCode", maxCount: 1 },
  ]),
  createGvm
);

router.get("/getMaBoMon/:maPhongBan/:isKhoa", getBoMonList);

module.exports = router;
