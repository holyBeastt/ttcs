const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const upload = require("../middlewares/uploadXlsxMiddleware");

const readXlsxFile = require("read-excel-file");

const {
  getThemFileHocPhan,
  convertExcelToJSON,
  saveToDB,
} = require("../controllers/adminThemFileHocPhanController");

router.get("/getThemFileHocPhan", getThemFileHocPhan);
router.post("/saveDataHocPhanToDB", saveToDB);

// Route để tải lên file
router.post("/postThemFileHocPhan", upload.single("file"), convertExcelToJSON);

module.exports = router;
