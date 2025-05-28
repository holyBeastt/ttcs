const express = require("express");
const thongkemgController = require("../controllers/thongkemgController");
const router = express.Router();
const { showThongkemgPage } = require("../controllers/thongkemgController");
// Route để hiển thị trang vẽ biểu đồ
router.get("/thongkemg", showThongkemgPage);

// Route để lấy dữ liệu biểu đồ dưới dạng JSON
router.get("/api/thongkemg-data", thongkemgController.getThongkemgData);
router.get("/getNamHocmg", thongkemgController.getNamHocData);
router.get("/getPhongBanmg", thongkemgController.getPhongBanMG);
router.get("/getHeDaoTaomg", thongkemgController.getHeDaoTaoMG);

module.exports = router;
