const express = require("express");
const thongkevuotgioController = require("../controllers/thongkevuotgioController");
const router = express.Router();
const { showThongkevuotgioPage } = require("../controllers/thongkevuotgioController");
// Route để hiển thị trang vẽ biểu đồ
router.get("/thongkevuotgio", showThongkevuotgioPage);

// Route để lấy dữ liệu biểu đồ dưới dạng JSON
router.get("/api/thongkevuotgio-data", thongkevuotgioController.getThongkevuotgioData);

// Thêm route mới
router.get("/getNamHocVG", thongkevuotgioController.getNamHocData);

// Thêm route mới để lấy dữ liệu phòng ban
router.get("/getPhongBanVG", thongkevuotgioController.getPhongBanVG);



module.exports = router;
