/**
 * NCKH V2 Routes
 * Version 2 - API với prefix /v2/ và tên tiếng Việt không dấu
 * Date: 2026-01-16
 */

const express = require("express");
const router = express.Router();
const nckhV2 = require("../controllers/nckh_v2");

// =====================================================
// RENDER VIEWS
// =====================================================
router.get("/danh-sach-nckh", nckhV2.getDanhSachNCKHV2);

// =====================================================
// ĐỀ TÀI DỰ ÁN
// =====================================================
router.get("/de-tai-du-an", (req, res) => {
    res.render("nckh.danhSachNCKH.ejs", { activeTab: "detaiduan" });
});
router.post("/de-tai-du-an", nckhV2.saveDeTaiDuAnV2);
router.get("/de-tai-du-an/:NamHoc/:Khoa", nckhV2.getTableDeTaiDuAnV2);

// =====================================================
// BÀI BÁO KHOA HỌC (sẽ implement sau Phase 1)
// =====================================================
// router.get("/bai-bao-khoa-hoc", nckhV2.getBaiBaoKhoaHocV2);
// router.post("/bai-bao-khoa-hoc", nckhV2.saveBaiBaoKhoaHocV2);
// router.get("/bai-bao-khoa-hoc/:NamHoc/:Khoa", nckhV2.getTableBaiBaoKhoaHocV2);

// =====================================================
// SÁNG KIẾN (sẽ implement sau Phase 1)
// =====================================================
// router.get("/sang-kien", nckhV2.getSangKienV2);
// router.post("/sang-kien", nckhV2.saveSangKienV2);
// router.get("/sang-kien/:NamHoc/:Khoa", nckhV2.getTableSangKienV2);

// =====================================================
// GIẢI THƯỞNG & BẰNG SÁNG CHẾ (sẽ implement sau Phase 1)
// =====================================================
// router.get("/giai-thuong-bang-sang-che", nckhV2.getGiaiThuongBangSangCheV2);
// router.post("/giai-thuong-bang-sang-che", nckhV2.saveGiaiThuongBangSangCheV2);
// router.get("/giai-thuong-bang-sang-che/:NamHoc/:Khoa", nckhV2.getTableGiaiThuongBangSangCheV2);

// =====================================================
// ĐỀ XUẤT NGHIÊN CỨU (sẽ implement sau Phase 1)
// =====================================================
// router.get("/de-xuat-nghien-cuu", nckhV2.getDeXuatNghienCuuV2);
// router.post("/de-xuat-nghien-cuu", nckhV2.saveDeXuatNghienCuuV2);
// router.get("/de-xuat-nghien-cuu/:NamHoc/:Khoa", nckhV2.getTableDeXuatNghienCuuV2);

// =====================================================
// SÁCH, GIÁO TRÌNH, TÀI LIỆU (sẽ implement sau Phase 1)
// =====================================================
// router.get("/sach-giao-trinh", nckhV2.getSachGiaoTrinhV2);
// router.post("/sach-giao-trinh", nckhV2.saveSachGiaoTrinhV2);
// router.get("/sach-giao-trinh/:NamHoc/:Khoa", nckhV2.getTableSachGiaoTrinhV2);

// =====================================================
// HƯỚNG DẪN SV NCKH (sẽ implement sau Phase 1)
// =====================================================
// router.get("/huong-dan-sv-nckh", nckhV2.getHuongDanSvNckhV2);
// router.post("/huong-dan-sv-nckh", nckhV2.saveHuongDanSvNckhV2);
// router.get("/huong-dan-sv-nckh/:NamHoc/:Khoa", nckhV2.getTableHuongDanSvNckhV2);

// =====================================================
// THÀNH VIÊN HỘI ĐỒNG (sẽ implement sau Phase 1)
// =====================================================
// router.get("/thanh-vien-hoi-dong", nckhV2.getThanhVienHoiDongV2);
// router.post("/thanh-vien-hoi-dong", nckhV2.saveThanhVienHoiDongV2);
// router.get("/thanh-vien-hoi-dong/:NamHoc/:Khoa", nckhV2.getTableThanhVienHoiDongV2);

// =====================================================
// CRUD CHUNG
// =====================================================
router.post("/nckh/edit/:ID/:MaBang", nckhV2.editNckhV2);
router.post("/nckh/update/:ID/:namHoc/:MaBang", nckhV2.updateFieldNckhV2);
router.post("/nckh/delete/:ID/:namHoc/:MaBang", nckhV2.deleteNckhV2);

// =====================================================
// API DỮ LIỆU
// =====================================================
router.get("/giang-vien-co-huu", nckhV2.getTeacherV2);
router.get("/data/:MaBang", nckhV2.getDataV2);

module.exports = router;
