const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const upload = require("../middlewares/uploadXlsxMiddleware");

const readXlsxFile = require("read-excel-file");

const {
  getImportDoAn,
  extractFileData,
  saveToDB,
} = require("../controllers/vuotGioImportDoAnController");

router.get("/importDoAn", getImportDoAn);
router.get("/postSaveDataDoAn", saveToDB);

// Route để tải lên file
router.post("/postImportDoAn", upload.single("file"), extractFileData);

module.exports = router;
