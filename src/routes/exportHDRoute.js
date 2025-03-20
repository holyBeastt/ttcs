const express = require("express");
const router = express.Router();
const exportHDController = require("../controllers/exportHDController");

// Route để hiển thị trang exportHD
router.get("/exportHD", exportHDController.getExportHDSite);

// Route để xuất hợp đồng cho nhiều giảng viên
router.get("/exportHD/downloadAll", exportHDController.exportMultipleContracts);

// Phần xuất thông tin bổ sung giảng viên mời

router.get(
  "/api/hd-gvm/additional-file-site",
  exportHDController.getExportAdditionalInfoGvmSite
);

router.get(
  "/api/hd-gvm/export-additional-file",
  exportHDController.exportAdditionalInfoGvm
);

module.exports = router;
