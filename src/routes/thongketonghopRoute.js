const express = require("express");
const thongketonghopController = require("../controllers/thongketonghopController");
const router = express.Router();

// Route để hiển thị trang biểu đồ tổng hợp
router.get("/thongketonghop", (req, res) => {
  res.render("thongketonghop");
});

// API để lấy dữ liệu biểu đồ tổng hợp
router.get("/api/thongketonghop-data", thongketonghopController.getChartData);

// Thêm route mới để lấy dữ liệu năm học
router.get("/getNamHocTH", thongketonghopController.getNamHocData);

// Thêm route mới để lấy dữ liệu phòng ban (Removed)
// router.get("/getPhongBanTH", thongketonghopController.getPhongBanTH);

// Thêm route mới để lấy dữ liệu hệ đào tạo (Removed)
// router.get("/getHeDaoTaoTH", thongketonghopController.getHeDaoTaoTH);

module.exports = router;
