const express = require("express");
const router = express.Router();
const exportHDController = require("../controllers/exportHDController");

// Route để hiển thị trang exportHD
router.get("/exportHD", exportHDController.getExportHDSite);

// Route để xuất hợp đồng cho nhiều giảng viên
router.get("/exportHD/downloadAll", exportHDController.exportMultipleContracts);

// Phần xuất thông tin bổ sung giảng viên mời

// Tải file bổ sung
router.get(
  "/api/moi-giang/hd-gvm/img-download-site",
  exportHDController.getImageDownloadSite
);

router.get(
  "/api/moi-giang/hd-gvm/img-download-data",
  exportHDController.exportImageDownloadData
);

// Hợp đồng tổng hợp
router.get(
  "/api/hd-gvm/additional-file-site",
  exportHDController.getExportAdditionalInfoGvmSite
);

router.get(
  "/api/hd-gvm/export-additional-file",
  exportHDController.exportAdditionalInfoGvm
);

module.exports = router;
