const express = require("express");
const router = express.Router();
const nckh = require("../controllers/NckhController"); // Import hàm xử lý từ controller


// render site đề tài, dự án
router.get("/detai-duan", nckh.getDeTaiDuAn);

// lưu đề tài dự án
router.post("/detai-duan", nckh.saveDeTaiDuAn);

// lấy dữ liệu giảng viên cơ hữu
router.get("/giang-vien-co-huu", nckh.getTeacher);


module.exports = router;
