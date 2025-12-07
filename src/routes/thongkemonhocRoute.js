const express = require("express");
const thongkemonhocController = require("../controllers/thongkemonhocController");
const router = express.Router();
const { showThongkemonhocPage } = require("../controllers/thongkemonhocController");
// Route để hiển thị trang thống kê môn học
router.get("/thongkemonhoc", showThongkemonhocPage);

// Route test kết nối
router.get("/api/thongkemonhoc-test", thongkemonhocController.testConnection);

// Route để lấy dữ liệu thống kê môn học dưới dạng JSON
router.get("/api/thongkemonhoc-data", thongkemonhocController.getThongkemonhocData);
router.get("/getNamHocmonhoc", thongkemonhocController.getNamHocData);
router.get("/getKhoamonhoc", thongkemonhocController.getKhoaData);
router.get("/getHeDaoTaomonhoc", thongkemonhocController.getHeDaoTaoOptions);

module.exports = router;