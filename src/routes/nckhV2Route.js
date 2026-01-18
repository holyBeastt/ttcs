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
// BÀI BÁO KHOA HỌC
// =====================================================
router.get("/bai-bao-khoa-hoc", (req, res) => {
    res.render("nckh.danhSachNCKH.ejs", { activeTab: "baibaokhoahoc" });
});
router.post("/bai-bao-khoa-hoc", nckhV2.saveBaiBaoKhoaHocV2);
router.get("/bai-bao-khoa-hoc/:NamHoc/:Khoa", nckhV2.getTableBaiBaoKhoaHocV2);
router.post("/bai-bao-khoa-hoc/edit/:ID", nckhV2.editBaiBaoKhoaHocV2);

// =====================================================
// SÁNG KIẾN
// =====================================================
router.get("/sang-kien", (req, res) => {
    res.render("nckh.danhSachNCKH.ejs", { activeTab: "sangkien" });
});
router.post("/sang-kien", nckhV2.saveSangKienV2);
router.get("/sang-kien/:NamHoc/:Khoa", nckhV2.getTableSangKienV2);

// =====================================================
// GIẢI THƯỞNG & BẰNG SÁNG CHẾ
// =====================================================
router.get("/giai-thuong", (req, res) => {
    res.render("nckh.danhSachNCKH.ejs", { activeTab: "giaithuong" });
});
router.post("/giai-thuong", nckhV2.saveGiaiThuongV2);
router.get("/giai-thuong/:NamHoc/:Khoa", nckhV2.getTableGiaiThuongV2);
router.post("/giai-thuong/edit/:ID", nckhV2.editGiaiThuongV2);


// =====================================================
// ĐỀ XUẤT NGHIÊN CỨU
// =====================================================
router.get("/de-xuat-nghien-cuu", (req, res) => {
    res.render("nckh.danhSachNCKH.ejs", { activeTab: "dexuat" });
});
router.post("/de-xuat-nghien-cuu", nckhV2.saveDeXuatV2);
router.get("/de-xuat-nghien-cuu/:NamHoc/:Khoa", nckhV2.getTableDeXuatV2);
router.post("/de-xuat-nghien-cuu/edit/:ID", nckhV2.editDeXuatV2);

// =====================================================
// SÁCH, GIÁO TRÌNH, TÀI LIỆU
// =====================================================
router.get("/sach-giao-trinh", (req, res) => {
    res.render("nckh.danhSachNCKH.ejs", { activeTab: "sachgiaotrinh" });
});
router.post("/sach-giao-trinh", nckhV2.saveSachGiaoTrinhV2);
router.get("/sach-giao-trinh/:NamHoc/:Khoa", nckhV2.getTableSachGiaoTrinhV2);
router.post("/sach-giao-trinh/edit/:ID", nckhV2.editSachGiaoTrinhV2);

// =====================================================
// HƯỚNG DẪN SV NCKH
// =====================================================
router.get("/huong-dan-sv-nckh", (req, res) => {
    res.render("nckh.danhSachNCKH.ejs", { activeTab: "huongdansvnckh" });
});
router.post("/huong-dan-sv-nckh", nckhV2.saveHuongDanV2);
router.get("/huong-dan-sv-nckh/:NamHoc/:Khoa", nckhV2.getTableHuongDanV2);
router.post("/huong-dan-sv-nckh/edit/:ID", nckhV2.editHuongDanV2);

// =====================================================
// THÀNH VIÊN HỘI ĐỒNG KHOA HỌC
// =====================================================
router.get("/thanh-vien-hoi-dong", (req, res) => {
    res.render("nckh.danhSachNCKH.ejs", { activeTab: "hoidong" });
});
router.post("/thanh-vien-hoi-dong", nckhV2.saveThanhVienHoiDongV2);
router.get("/thanh-vien-hoi-dong/:NamHoc/:Khoa", nckhV2.getTableThanhVienHoiDongV2);
router.post("/thanh-vien-hoi-dong/edit/:ID", nckhV2.editThanhVienHoiDongV2);

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
