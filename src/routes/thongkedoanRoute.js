const express = require("express");
const router = express.Router();
const thongkedoanController = require("../controllers/thongkedoanController");

// API lấy dữ liệu đồ án theo giảng viên
router.get("/data", thongkedoanController.getData);

// API lấy danh sách năm học và khoa
router.get("/getNamHoc", thongkedoanController.getFilterOptions);
router.get("/getPhongBan", thongkedoanController.getPhongBanOptions);

module.exports = router;
