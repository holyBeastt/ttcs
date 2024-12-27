const express = require("express");
const router = express.Router();
const infoHDGvmController = require("../controllers/infoHDGvmController"); // Định nghĩa biến infoHDGvmController

// Route để render trang infoHDGvm.ejs
router.get("/infoHDGvm", (req, res) => {
  res.render("infoHDGvm"); // Hiển thị trang thông tin hợp đồng giảng viên mời
});

// Route để xuất dữ liệu ra file Excel
router.get("/hdgvm/export-excel", infoHDGvmController.exportHDGvmToExcel);
router.get("/api/hdgvm", infoHDGvmController.getHDGvmData);

// Phương
router.get("/hop-dong-du-kien", infoHDGvmController.getHopDongDuKienData);
router.get("/hopDongDuKien", infoHDGvmController.getHopDongDuKien);

module.exports = router;
