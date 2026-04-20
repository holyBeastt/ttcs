const express = require("express");
const thongketonghopController = require("../controllers/thongketonghopController");
const router = express.Router();

// Route để hiển thị trang biểu đồ tổng hợp
router.get("/thongketonghop", (req, res) => {
  res.render("thongketonghop");
});

// API để lấy dữ liệu biểu đồ tổng hợp
router.get("/api/thongketonghop-data", thongketonghopController.getChartData);

// Thống kê tổng hợp V2
router.get("/thongketonghop-v2", (req, res) => {
  res.render("thongketonghop_v2");
});
router.get("/api/thongketonghop-v2-data", thongketonghopController.getGeneralStatsV2);
router.get("/api/thongketonghop-v2-detail", thongketonghopController.getDetailedStatsV2);
router.get("/api/thongketonghop-v2-export", thongketonghopController.exportGeneralStatsV2);
router.get("/api/thongketonghop-v2-filters", thongketonghopController.getFiltersV2);

// Thêm route mới để lấy dữ liệu năm học
router.get("/getNamHocTH", thongketonghopController.getNamHocData);

// Thêm route mới để lấy dữ liệu phòng ban (Removed)
// router.get("/getPhongBanTH", thongketonghopController.getPhongBanTH);

// Thêm route mới để lấy dữ liệu hệ đào tạo (Removed)
// router.get("/getHeDaoTaoTH", thongketonghopController.getHeDaoTaoTH);

module.exports = router;
