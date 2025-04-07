const express = require("express");
const router = express.Router();
const thongkeChiTietMGController = require("../controllers/thongkeChiTietMGController");

// Route để hiển thị trang
router.get("/thongkeChiTietMG", thongkeChiTietMGController.showPage);

// API routes
router.get("/api/thongkeChiTietMG/filter-options", thongkeChiTietMGController.getFilterOptions);
router.get("/api/thongkeChiTietMG/giang-vien", thongkeChiTietMGController.getGiangVien);
router.get("/api/thongkeChiTietMG/data", thongkeChiTietMGController.getData);

module.exports = router;
