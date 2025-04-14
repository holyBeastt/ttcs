const express = require("express");
// import multer from "multer";
const multer = require("multer");
const path = require("path");
// import path from "path";
var appRoot = require("app-root-path");
const router = express.Router();
const fs = require("fs");

const {
  getUpdateGvm,
  getViewGvm,
  postUpdateGvm,
} = require("../controllers/updateGvmController");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const HoTen = req.body.HoTen || "unknown-user"; // Đảm bảo có giá trị
    const Khoa = req.body.maPhongBan || "unknown-dept"; // Lấy thông tin Khoa từ session
    const BoMon = req.body.monGiangDayChinh || "unknown-subject"; // Lấy thông tin Bộ môn từ body

    // Tạo đường dẫn thư mục chứa các folder con: Khoa/BoMon/HoTen
    const userFolderPath = path.join(
      appRoot.path,
      "Giang_Vien_Moi",
      Khoa,
      BoMon,
      HoTen
    );

    console.log("Đường dẫn thư mục:", userFolderPath);

    // Kiểm tra và tạo thư mục nếu chưa tồn tại
    if (!fs.existsSync(userFolderPath)) {
      try {
        fs.mkdirSync(userFolderPath, { recursive: true });
        console.log("Thư mục đã được tạo:", userFolderPath);
      } catch (err) {
        console.error("Lỗi khi tạo thư mục:", err);
        return cb(err); // Báo lỗi nếu không thể tạo thư mục
      }
    }

    cb(null, userFolderPath); // Trả về đường dẫn lưu file
  },
  filename: function (req, file, cb) {
    const HoTen = req.body.HoTen || "unknown-user"; // Đảm bảo có giá trị
    const Khoa = req.body.maPhongBan || "unknown-dept"; // Lấy thông tin Khoa từ session
    const BoMon = req.body.monGiangDayChinh || "unknown-subject";

    let fieldName = file.fieldname; // Tên trường để phân loại file
    const fileExtension = path.extname(file.originalname); // Lấy phần mở rộng của file

    if (fieldName === "fileBoSung") {
      fieldName = `${Khoa}_${HoTen}`;
    }

    if (fieldName === "FileLyLich") {
      fieldName = `${Khoa}_Lý lịch_${HoTen}`;
    }

    const fileName = `${fieldName}${fileExtension}`; // Tạo tên file mới

    const userFolderPath = path.join(
      appRoot.path,
      "Giang_Vien_Moi",
      Khoa,
      BoMon,
      HoTen
    );

    try {
      // Lấy danh sách file trong thư mục
      const files = fs.readdirSync(userFolderPath);

      // Tìm file có cùng tên (bỏ qua phần mở rộng)
      const baseFileName = path.parse(fileName).name;
      files.forEach((existingFile) => {
        if (path.parse(existingFile).name === baseFileName) {
          const existingFilePath = path.join(userFolderPath, existingFile);
          console.log("Xóa file cũ:", existingFilePath);

          fs.unlinkSync(existingFilePath); // Xóa file cũ
        }
      });
    } catch (error) {
      console.error("Lỗi khi xử lý file cũ:", error);
    }

    cb(null, fileName); // Đặt tên file mới
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

router.get("/updateGvm/:id", getUpdateGvm);
router.get("/viewGvm/:id", getViewGvm);

router.post(
  "/updateGvm/:id",
  upload.fields([
    { name: "truocCCCD", maxCount: 1 },
    { name: "sauCCCD", maxCount: 1 },
    { name: "bangTotNghiep", maxCount: 1 },
    { name: "FileLyLich", maxCount: 1 }, // Thêm dòng này để upload file PDF
    { name: "fileBoSung", maxCount: 1 },
    { name: "QrCode", maxCount: 1 },
  ]),
  postUpdateGvm
);

module.exports = router;
