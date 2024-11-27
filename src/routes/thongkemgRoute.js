const express = require("express");
const thongkemgController = require("../controllers/thongkemgController");
const router = express.Router();

// Route để hiển thị trang vẽ biểu đồ
router.get("/thongkemg", thongkemgController.showThongkemgPage);

// Route để lấy dữ liệu biểu đồ dưới dạng JSON
router.get("/api/thongkemg-data", thongkemgController.getThongkemgData);

module.exports = router;
