const express = require("express");
const router = express.Router();

const { uploadSingleFile } = require("../middlewares/TKBImportMiddleware");
const { importExcelTKB } = require("../controllers/TKBImportController");

router.post("/api/v1/tkb/import", uploadSingleFile, importExcelTKB);

module.exports = router;
