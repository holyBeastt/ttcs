const express = require("express");
const router = express.Router();
const hopDongDAController = require("../controllers/hopDongDAController");

// Route để hiển thị trang hopDongDA
router.get("/hopDongDA", hopDongDAController.gethopDongDASite);

// Route để xuất hợp đồng cho nhiều giảng viên
router.get("/exportHDDA/Dowload", hopDongDAController.exportMultipleContracts);

// Phần xuất thông tin đồ án bổ sung giảng viên mời

router.get(
  "/api/do-an/hd-gvm/additional-file-site",
  hopDongDAController.getExportAdditionalDoAnGvmSite
);

router.get(
  "/api/do-an/hd-gvm/export-additional-file",
  hopDongDAController.exportAdditionalDoAnGvm
);

module.exports = router;
