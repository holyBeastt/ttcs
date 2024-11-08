const express = require("express");
const router = express.Router();
const exportHDController = require("../controllers/exportHDController");

// Route để hiển thị trang exportHD
router.get("/exportHD", exportHDController.getExportHDSite);
// Route để xuất hợp đồng cho một giảng viên
router.get("/exportHD/download", exportHDController.exportSingleContract);

// Route để xuất hợp đồng cho nhiều giảng viên
router.get("/exportHD/downloadAll", exportHDController.exportMultipleContracts);

module.exports = router;
