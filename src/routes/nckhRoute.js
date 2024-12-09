const express = require("express");
const router = express.Router();
const nckh = require("../controllers/nckhController"); // Import hàm xử lý từ controller


// render site đề tài, dự án
router.get("/detaiduan", nckh.getDeTaiDuAn);
// lưu đề tài dự án
router.post("/detaiduan", nckh.saveDeTaiDuAn);
// render table đề tài, dự án
router.get("/tabledetaiduan/:NamHoc", nckh.getTableDeTaiDuAn);

// lấy dữ liệu giảng viên cơ hữu
router.get("/giangviencohuu", nckh.getTeacher);

// render site bài báo khoa học
router.get("/baibaokhoahoc", nckh.getBaiBaoKhoaHoc);
// lưu bài báo khoa học
router.post("/baibaokhoahoc", nckh.saveBaiBaoKhoaHoc);
// render table bài báo khoa học
router.get("/baibaokhoahoc/:NamHoc", nckh.getTableBaiBaoKhoaHoc);

// render site bằng sáng chế và giải thưởng
router.get("/bangsangchevagiaithuong", nckh.getBangSangCheVaGiaiThuong);
// lưu bằng sáng chế và giải thưởng
router.post("/bangsangchevagiaithuong", nckh.saveBangSangCheVaGiaiThuong);
// render table bằng sáng chế và giải thưởng
router.get("/bangsangchevagiaithuong/:NamHoc", nckh.getTableBangSangCheVaGiaiThuong);

// render site sách và giáo trình
router.get("/sachvagiaotrinh", nckh.getSachVaGiaoTrinh);
// lưu sách và giáo trình
router.post("/sachvagiaotrinh", nckh.saveSachVaGiaoTrinh);
// render table sách và giáo trình 
router.get("/sachvagiaotrinh/:NamHoc", nckh.getTableSachVaGiaoTrinh);


module.exports = router;
