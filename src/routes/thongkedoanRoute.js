const express = require("express");
const router = express.Router();
const thongkedoanController = require("../controllers/thongkedoanController");

// API lấy dữ liệu đồ án theo giảng viên
router.get("/data", thongkedoanController.getData);

// API lấy danh sách năm học, khoa, đợt
router.get("/getNamHocDoAn", thongkedoanController.getNamHocOptions);
router.get("/getPhongBanDoAn", thongkedoanController.getPhongBanOptions);
router.get("/getDot", thongkedoanController.getDotOptions);
router.get("/getKiDoAn", thongkedoanController.getKiOptions);

module.exports = router;
