const express = require("express");
const router = express.Router();
const nckh = require("../controllers/NckhController"); // Import hàm xử lý từ controller


// render site đề tài, dự án
router.get("/detaiduan", nckh.getDeTaiDuAn);

// lưu đề tài dự án
router.post("/detaiduan", nckh.saveDeTaiDuAn);

// lấy dữ liệu giảng viên cơ hữu
router.get("/giangviencohuu", nckh.getTeacher);

// render site bài báo khoa học
router.get("/baibaokhoahoc", nckh.getBaiBaoKhoaHoc);

// lưu bài báo khoa học
router.post("/baibaokhoahoc", nckh.saveBaiBaoKhoaHoc);


module.exports = router;
