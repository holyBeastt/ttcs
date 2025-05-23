const express = require("express");
const multer = require("multer");
const path = require("path");
var appRoot = require("app-root-path");
const router = express.Router();
const fs = require("fs");

const {
  createGvm,
  getBoMonList,
} = require("../controllers/createGvmController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let HoTen = req.body.HoTen ? req.body.HoTen : "unknown-user"; // Sử dụng Họ tên làm định danh
    let Khoa = req.session.MaPhongBan; // Lấy thông tin Khoa từ session
    let BoMon = req.body.monGiangDayChinh; // Lấy thông tin Bộ môn từ body

    // Tạo đường dẫn thư mục chứa các folder con: Khoa/BoMon/HoTen
    const userFolderPath =
      appRoot + `/Giang_Vien_Moi/${Khoa}/${BoMon}/${HoTen}`;

    // Kiểm tra và tạo thư mục con nếu chưa tồn tại
    if (!fs.existsSync(userFolderPath)) {
      fs.mkdirSync(userFolderPath, { recursive: true });
    }

    // Trả về đường dẫn để lưu file
    cb(null, userFolderPath);
  },
  filename: function (req, file, cb) {
    let HoTen = req.body.HoTen ? req.body.HoTen : "unknown-user";
    let Khoa = req.session.MaPhongBan; // Lấy thông tin Khoa từ session
    let fieldName = file.fieldname; // Tên trường (fieldname) để phân loại file

    if (fieldName === "fileBoSung") {
      fieldName = `${Khoa}_${HoTen}`;
    }

    if (fieldName === "FileLyLich") {
      fieldName = `${Khoa}_Lý lịch_${HoTen}`;
    }

    // Tạo tên file theo fieldname (với tên người dùng và fieldname làm định danh)
    let fileName = `${fieldName}${path.extname(file.originalname)}`;
    cb(null, fileName); // Đặt tên file theo định dạng: HoTen_fieldname.extension
  },
});

const imageFilter = function (req, file, cb) {
  if (file == undefined) return;
  // Accept images only
  const allowedExtensions = process.env.ALLOWED_FILE_EXTENSIONS.split(",")
    .map((ext) => ext.trim()) // bỏ khoảng trắng nếu có
    .join("|"); // nối thành regex pattern

  const extensionRegex = new RegExp(`\\.(${allowedExtensions})$`, "i");

  // Dùng trong middleware hoặc hàm kiểm tra
  if (!file.originalname.match(extensionRegex)) {
    return cb(new Error("Chỉ cho phép các định dạng file hợp lệ!"), false);
  }

  cb(null, true);
};

let upload = multer({ storage: storage, fileFilter: imageFilter });

router.post(
  "/daotaonhap",
  upload.fields([
    { name: "truocCCCD", maxCount: 1 },
    { name: "sauCCCD", maxCount: 1 },
    { name: "bangTotNghiep", maxCount: 1 },
    { name: "FileLyLich", maxCount: 1 }, // Thêm dòng này để upload file PDF
    { name: "fileBoSung", maxCount: 1 },
    { name: "QrCode", maxCount: 1 },
  ]),
  createGvm
);

router.get("/getMaBoMon/:maPhongBan/:isKhoa", getBoMonList);

module.exports = router;
