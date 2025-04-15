const express = require("express");
const router = express.Router();
const nckh = require("../controllers/nckhController"); // Import hàm xử lý từ controller
const nckhAdmin = require("../controllers/nckhAdminQuyDinhSoGioController"); // Import hàm xử lý từ controller


// render site quy định số giờ quy đổi nckh
router.get("/quydinhsogionckh", nckh.getQuyDinhSoGioNCKH);

// render site đề tài, dự án
router.get("/detaiduan", nckh.getDeTaiDuAn);
// lưu đề tài dự án
router.post("/detaiduan", nckh.saveDeTaiDuAn);
// render table đề tài, dự án
router.get("/tabledetaiduan/:NamHoc/:Khoa", nckh.getTableDeTaiDuAn);

// lấy dữ liệu giảng viên cơ hữu
router.get("/giangviencohuu", nckh.getTeacher);

// bài báo khoa học
router.get("/baibaokhoahoc", nckh.getBaiBaoKhoaHoc);
router.post("/baibaokhoahoc", nckh.saveBaiBaoKhoaHoc);
router.get("/baibaokhoahoc/:NamHoc/:Khoa", nckh.getTableBaiBaoKhoaHoc);

router.get("/bangsangchevagiaithuong", nckh.getBangSangCheVaGiaiThuong);
router.post("/bangsangchevagiaithuong", nckh.saveBangSangCheVaGiaiThuong);
router.get("/bangsangchevagiaithuong/:NamHoc/:Khoa", nckh.getTableBangSangCheVaGiaiThuong);

router.get("/sachvagiaotrinh", nckh.getSachVaGiaoTrinh);
router.post("/sachvagiaotrinh", nckh.saveSachVaGiaoTrinh);
router.get("/sachvagiaotrinh/:NamHoc/:Khoa", nckh.getTableSachVaGiaoTrinh);

router.get("/nckhvahuanluyendoituyen", nckh.getNckhVaHuanLuyenDoiTuyen);
router.post("/nckhvahuanluyendoituyen", nckh.saveNckhVaHuanLuyenDoiTuyen);
router.get("/nckhvahuanluyendoituyen/:NamHoc/:Khoa", nckh.getTableNckhVaHuanLuyenDoiTuyen);

router.get("/xaydungctdt", nckh.getXayDungCTDT);
router.post("/xaydungctdt", nckh.saveXayDungCTDT);
router.get("/xaydungctdt/:NamHoc/:Khoa", nckh.getTableXayDungCTDT);

router.get("/biensoangiaotrinhbaigiang", nckh.getBienSoanGiaoTrinhBaiGiang);
router.post("/biensoangiaotrinhbaigiang", nckh.saveBienSoanGiaoTrinhBaiGiang);
router.get("/biensoangiaotrinhbaigiang/:NamHoc/:Khoa", nckh.getTableBienSoanGiaoTrinhBaiGiang);

router.get("/sotietnckhbaoluusangnam", nckh.getSoTietNCKHBaoLuuSangNam);
router.post("/sotietnckhbaoluusangnam", nckh.getDataSoTietNCKHBaoLuuSangNam);
router.post("/sotietnckhbaoluusangnam/save", nckh.saveSoTietNCKHBaoLuuSangNam);
router.get("/sotietnckhbaoluusangnam/:NamHoc/:Khoa", nckh.getTableSoTietNCKHBaoLuuSangNam);


router.get("/tonghopsotietnckh", nckh.getTongHopSoTietNCKH);
router.post("/tonghopsotietnckh/:NamHoc", nckh.tongHopSoTietNckhCuaMotGiangVien);

router.get("/tonghopsotietnckh/dukien", nckh.getTongHopSoTietNCKHDuKien);
router.post("/tonghopsotietnckh/dukien/:NamHoc", nckh.tongHopSoTietNckhCuaMotGiangVienDuKien);

router.get("/nhiemvukhoahoccongnghe", nckh.getNhiemVuKhoaHocCongNghe);
router.post("/nhiemvukhoahoccongnghe", nckh.saveNhiemVuKhoaHocCongNghe);
router.get("/nhiemvukhoahoccongnghe/:NamHoc/:Khoa", nckh.getTableNhiemVuKhoaHocCongNghe);




// =================================================================
// lấy data đổ vào các thẻ select
router.get("/data/:MaBang", nckh.getData);

// =================================================================
// thêm, sửa số giờ quy đổi nckh cho admin
router.post("/add-detaiduan", nckhAdmin.addDeTaiDuAn);
router.post("/edit-detaiduan", nckhAdmin.editDeTaiDuAn);
router.post("/delete-detaiduan", nckhAdmin.deleteRowQuyDinhSoGioNCKH);

router.post("/add-baibaokhoahoc", nckhAdmin.addBaiBaoKhoaHoc);
router.post("/edit-baibaokhoahoc", nckhAdmin.editBaiBaoKhoaHoc);
router.post("/delete-baibaokhoahoc", nckhAdmin.deleteRowQuyDinhSoGioNCKH);

router.post("/add-bangsangchevagiaithuong", nckhAdmin.addBangSangCheVaGiaiThuong);
router.post("/edit-bangsangchevagiaithuong", nckhAdmin.editBangSangCheVaGiaiThuong);
router.post("/delete-bangsangchevagiaithuong", nckhAdmin.deleteRowQuyDinhSoGioNCKH);

router.post("/add-sachvagiaotrinh", nckhAdmin.addSachVaGiaoTrinh);
router.post("/edit-sachvagiaotrinh", nckhAdmin.editSachVaGiaoTrinh);
router.post("/delete-sachvagiaotrinh", nckhAdmin.deleteRowQuyDinhSoGioNCKH);

router.post("/add-nckhvahuanluyendoituyen", nckhAdmin.addNCKHVaHuanLuyenDoiTuyen);
router.post("/edit-nckhvahuanluyendoituyen", nckhAdmin.editNCKHVaHuanLuyenDoiTuyen);
router.post("/delete-nckhvahuanluyendoituyen", nckhAdmin.deleteRowQuyDinhSoGioNCKH);

router.post("/add-xaydungctdt", nckhAdmin.addXayDungCTDT);
router.post("/edit-xaydungctdt", nckhAdmin.editXayDungCTDT);
router.post("/delete-xaydungctdt", nckhAdmin.deleteRowQuyDinhSoGioNCKH);

router.post("/add-biensoangiaotrinhbaigiang", nckhAdmin.addBienSoanGiaoTrinhBaiGiang);
router.post("/edit-biensoangiaotrinhbaigiang", nckhAdmin.editBienSoanGiaoTrinhBaiGiang);
router.post("/delete-biensoangiaotrinhbaigiang", nckhAdmin.deleteRowQuyDinhSoGioNCKH);

router.post("/add-nhiemvukhoahoccongnghe", nckhAdmin.addNhiemVuKhoaHocCongNghe);
router.post("/edit-nhiemvukhoahoccongnghe", nckhAdmin.edtiNhiemVuKhoaHocCongNghe);
router.post("/delete-nhiemvukhoahoccongnghe", nckhAdmin.deleteRowQuyDinhSoGioNCKH);

// =================================================================
// sửa xóa 
router.post("/nckh/edit/:ID/:MaBang", nckh.editNckh);
router.post("/nckh/delete/:ID/:MaBang", nckh.deleteNckh);




module.exports = router;
