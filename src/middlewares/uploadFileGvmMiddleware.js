// middlewares/uploadFileMiddleware.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const appRoot = require("app-root-path");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const HoTen = req.body.HoTen || "unknown-user";
    const Khoa = req.body.maPhongBan || "unknown-dept";
    const BoMon = req.body.monGiangDayChinh || "unknown-subject";

    const userFolderPath = path.join(
      appRoot.path,
      "Giang_Vien_Moi",
      Khoa,
      BoMon,
      HoTen
    );

    if (!fs.existsSync(userFolderPath)) {
      try {
        fs.mkdirSync(userFolderPath, { recursive: true });
      } catch (err) {
        console.error("Lỗi khi tạo thư mục:", err);
        return cb(err);
      }
    }

    cb(null, userFolderPath);
  },

  filename: function (req, file, cb) {
    const HoTen = req.body.HoTen || "unknown-user";
    const Khoa = req.body.maPhongBan || "unknown-dept";
    const BoMon = req.body.monGiangDayChinh || "unknown-subject";

    let fieldName = file.fieldname;
    const fileExtension = path.extname(file.originalname);

    if (fieldName === "fileBoSung") {
      fieldName = `${Khoa}_${HoTen}`;
    }

    if (fieldName === "FileLyLich") {
      fieldName = `${Khoa}_Lý lịch_${HoTen}`;
    }

    const fileName = `${fieldName}${fileExtension}`;
    const userFolderPath = path.join(
      appRoot.path,
      "Giang_Vien_Moi",
      Khoa,
      BoMon,
      HoTen
    );

    try {
      const files = fs.readdirSync(userFolderPath);
      const baseFileName = path.parse(fileName).name;

      files.forEach((existingFile) => {
        if (path.parse(existingFile).name === baseFileName) {
          fs.unlinkSync(path.join(userFolderPath, existingFile));
        }
      });
    } catch (error) {
      console.error("Lỗi khi xử lý file cũ:", error);
    }

    cb(null, fileName);
  },
});

const imageFilter = function (req, file, cb) {
  if (!file) return cb(null, false);

  const allowedExtensions = process.env.ALLOWED_FILE_EXTENSIONS.split(",")
    .map((ext) => ext.trim())
    .join("|");

  const extensionRegex = new RegExp(`\\.(${allowedExtensions})$`, "i");

  if (!file.originalname.match(extensionRegex)) {
    return cb(new Error("Chỉ cho phép các định dạng file hợp lệ!"), false);
  }

  cb(null, true);
};

const upload = multer({ storage: storage, fileFilter: imageFilter });

const uploadFileMiddleware = upload.fields([
  { name: "truocCCCD", maxCount: 1 },
  { name: "sauCCCD", maxCount: 1 },
  { name: "bangTotNghiep", maxCount: 1 },
  { name: "FileLyLich", maxCount: 1 },
  { name: "fileBoSung", maxCount: 1 },
  { name: "QrCode", maxCount: 1 },
]);

module.exports = uploadFileMiddleware;
