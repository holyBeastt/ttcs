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

// render site bài báo khoa học
router.get("/baibaokhoahoc", nckh.getBaiBaoKhoaHoc);
// lưu bài báo khoa học
router.post("/baibaokhoahoc", nckh.saveBaiBaoKhoaHoc);
// render table bài báo khoa học
router.get("/baibaokhoahoc/:NamHoc/:Khoa", nckh.getTableBaiBaoKhoaHoc);

// render site bằng sáng chế và giải thưởng
router.get("/bangsangchevagiaithuong", nckh.getBangSangCheVaGiaiThuong);
// lưu bằng sáng chế và giải thưởng
router.post("/bangsangchevagiaithuong", nckh.saveBangSangCheVaGiaiThuong);
// render table bằng sáng chế và giải thưởng
router.get("/bangsangchevagiaithuong/:NamHoc/:Khoa", nckh.getTableBangSangCheVaGiaiThuong);

// render site sách và giáo trình
router.get("/sachvagiaotrinh", nckh.getSachVaGiaoTrinh);
// lưu sách và giáo trình
router.post("/sachvagiaotrinh", nckh.saveSachVaGiaoTrinh);
// render table sách và giáo trình 
router.get("/sachvagiaotrinh/:NamHoc/:Khoa", nckh.getTableSachVaGiaoTrinh);

// render site nckh và huấn luyện đội tuyển
router.get("/nckhvahuanluyendoituyen", nckh.getNckhVaHuanLuyenDoiTuyen);
// lưu nckh và huấn luyện đội tuyển
router.post("/nckhvahuanluyendoituyen", nckh.saveNckhVaHuanLuyenDoiTuyen);
// render table nckh và huấn luyện đội tuyển
router.get("/nckhvahuanluyendoituyen/:NamHoc/:Khoa", nckh.getTableNckhVaHuanLuyenDoiTuyen);

// render site xây dựng ctdt
router.get("/xaydungctdt", nckh.getXayDungCTDT);
// lưu xây dựng ctdt
router.post("/xaydungctdt", nckh.saveXayDungCTDT);
// render table xây dựng ctdt
router.get("/xaydungctdt/:NamHoc/:Khoa", nckh.getTableXayDungCTDT);

// render site biên soạn giáo trình bài giảng
router.get("/biensoangiaotrinhbaigiang", nckh.getBienSoanGiaoTrinhBaiGiang);
// lưu biên soạn giáo trình bài giảng
router.post("/biensoangiaotrinhbaigiang", nckh.saveBienSoanGiaoTrinhBaiGiang);
// render table biên soạn giáo trình bài giảng
router.get("/biensoangiaotrinhbaigiang/:NamHoc/:Khoa", nckh.getTableBienSoanGiaoTrinhBaiGiang);

// =================================================================

// thêm, sửa số giờ quy đổi nckh cho admin
router.post("/add-detaiduan", nckhAdmin.addDeTaiDuAn);
router.post("/edit-detaiduan", nckhAdmin.editDeTaiDuAn);
router.post("/delete-detaiduan", nckhAdmin.deleteDeTaiDuAn);

router.post("/add-baibaokhoahoc", nckhAdmin.addBaiBaoKhoaHoc);
router.post("/edit-baibaokhoahoc", nckhAdmin.editBaiBaoKhoaHoc);
router.post("/delete-baibaokhoahoc", nckhAdmin.deleteBaiBaoKhoaHoc);

router.post("/add-bangsangchevagiaithuong", nckhAdmin.addBangSangCheVaGiaiThuong);
router.post("/edit-bangsangchevagiaithuong", nckhAdmin.editBangSangCheVaGiaiThuong);
router.post("/delete-bangsangchevagiaithuong", nckhAdmin.deleteBangSangCheVaGiaiThuong);

router.post("/add-sachvagiaotrinh", nckhAdmin.addSachVaGiaoTrinh);
router.post("/edit-sachvagiaotrinh", nckhAdmin.editSachVaGiaoTrinh);
router.post("/delete-sachvagiaotrinh", nckhAdmin.deleteSachVaGiaoTrinh);

router.post("/add-nckhvahuanluyendoituyen", nckhAdmin.addNCKHVaHuanLuyenDoiTuyen);
router.post("/edit-nckhvahuanluyendoituyen", nckhAdmin.editNCKHVaHuanLuyenDoiTuyen);
router.post("/delete-nckhvahuanluyendoituyen", nckhAdmin.deleteNCKHVaHuanLuyenDoiTuyen);

router.post("/add-xaydungctdt", nckhAdmin.addXayDungCTDT);
router.post("/edit-xaydungctdt", nckhAdmin.editXayDungCTDT);
router.post("/delete-xaydungctdt", nckhAdmin.deleteXayDungCTDT);

router.post("/add-biensoangiaotrinhbaigiang", nckhAdmin.addBienSoanGiaoTrinhBaiGiang);
router.post("/edit-biensoangiaotrinhbaigiang", nckhAdmin.editBienSoanGiaoTrinhBaiGiang);
router.post("/delete-biensoangiaotrinhbaigiang", nckhAdmin.deleteBienSoanGiaoTrinhBaiGiang);

module.exports = router;
