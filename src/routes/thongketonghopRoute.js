const express = require("express");
const thongketonghopController = require("../controllers/thongketonghopController");
const router = express.Router();

// Route để hiển thị trang biểu đồ tổng hợp
router.get("/thongketonghop", (req, res) => {
    res.render("thongketonghop");
});

// API để lấy dữ liệu biểu đồ tổng hợp
router.get("/api/thongketonghop-data", thongketonghopController.getChartData);

module.exports = router;
