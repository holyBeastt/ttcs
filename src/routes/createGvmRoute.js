const express = require("express");
const multer = require("multer");
const router = express.Router();

const {
  createGvm,
  getBoMonList,
} = require("../controllers/createGvmController");

const storage = multer.memoryStorage();

// escape string để tránh lỗi regex
const escapeRegExp = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const imageFilter = function (req, file, cb) {
  // luôn phải gọi cb để multer không bị treo
  if (!file) return cb(null, false);

  // extensions từ .env
  const allowedExtensions = (process.env.ALLOWED_FILE_EXTENSIONS || "jpg,png,pdf,jpeg")
    .split(",")
    .map(ext => escapeRegExp(ext.trim()))
    .join("|");

  const extensionRegex = new RegExp(`\\.(${allowedExtensions})$`, "i");

  // check tên file
  if (!file.originalname.match(extensionRegex)) {
    return cb(new Error("Chỉ cho phép các định dạng file hợp lệ!"), false);
  }

  // check MIME type để tránh đổi tên file
  const allowedMimes = ["image/jpeg", "image/png", "application/pdf"];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error("MIME không hợp lệ!"), false);
  }

  cb(null, true);
};

let upload = multer({
  storage: storage,
  fileFilter: imageFilter,
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
