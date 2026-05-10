/**
 * VUOT GIO V2 Routes
 * Route prefix: /v2/vuotgio
 * Date: 2026-01-29
 */

const express = require("express");
const router = express.Router();

// Controllers
const baseController = require("../controllers/vuotgio_v2/base.controller");
const lopNgoaiQCController = require("../controllers/vuotgio_v2/lopNgoaiQC.controller");
const lopNgoaiQCImportController = require("../controllers/vuotgio_v2/lopNgoaiQCImport.controller");
const themKTHPController = require("../controllers/vuotgio_v2/themKTHP.controller");
const duyetKTHPController = require("../controllers/vuotgio_v2/duyetKTHP.controller");
const tongHopController = require("../controllers/vuotgio_v2/tongHop.controller");
const xuatFileController = require("../controllers/vuotgio_v2/xuatFile.controller");
const thongKeGiangDayController = require("../controllers/vuotgio_v2/thongKeGiangDay.controller");
const previewController = require("../controllers/vuotgio_v2/preview.controller");

// Middleware
const { uploadSingleFile } = require("../middlewares/TKBImportMiddleware");

// =====================================================
// API DÙNG CHUNG
// =====================================================

router.get("/api/teachers", baseController.getTeachers);
router.get("/api/hocphan", baseController.getHocPhan);
router.get("/api/lophoc", baseController.getLopHoc);
router.get("/api/dinhmuc", baseController.getDinhMuc);
router.get("/thong-ke-giang-day", baseController.getThongKeGiangDay);
router.get("/thong-ke-giang-day/filters", thongKeGiangDayController.getFilters);
router.post("/thong-ke-giang-day/data", thongKeGiangDayController.getData);

// =====================================================
// LỚP NGOÀI QUY CHUẨN
// =====================================================

// --- Views ---
router.get("/them-lop-ngoai-qc", baseController.getThemLopNgoaiQC);
router.get("/danh-sach-lop-ngoai-qc", baseController.getDanhSachLopNgoaiQC);

// --- Nháp (course_schedule_details) ---
router.post("/lop-ngoai-quy-chuan", lopNgoaiQCController.save);
router.get("/lop-ngoai-quy-chuan/nhap/:Dot/:KiHoc/:NamHoc/:Khoa", lopNgoaiQCController.getTable);
router.post("/lop-ngoai-quy-chuan/edit", lopNgoaiQCController.edit);
router.delete("/lop-ngoai-quy-chuan/row", lopNgoaiQCController.delete);
router.delete("/lop-ngoai-quy-chuan/all", lopNgoaiQCController.deleteByFilter);
router.post("/lop-ngoai-quy-chuan/confirm", lopNgoaiQCController.confirmToMain);

// --- Chính thức (lopngoaiquychuan) ---
router.get("/lop-ngoai-quy-chuan/chinh-thuc/:NamHoc/:Khoa", lopNgoaiQCController.getChinhThuc);
router.post("/lop-ngoai-quy-chuan/edit-chinh-thuc/:ID", lopNgoaiQCController.editChinhThuc);
router.delete("/lop-ngoai-quy-chuan/chinh-thuc/:ID", lopNgoaiQCController.deleteChinhThuc);
router.post("/lop-ngoai-quy-chuan/approve/:ID", lopNgoaiQCController.approve);
router.post("/lop-ngoai-quy-chuan/unapprove/:ID", lopNgoaiQCController.unapprove);
router.post("/lop-ngoai-quy-chuan/batch-approve", lopNgoaiQCController.batchApprove);

// --- Import file Lớp Ngoài QC ---
router.post("/lop-ngoai-qc/parse-excel", uploadSingleFile, lopNgoaiQCImportController.parseExcel);
router.post("/lop-ngoai-qc/confirm-import", lopNgoaiQCImportController.confirmImport);
router.post("/lop-ngoai-qc/check-data-exist", lopNgoaiQCImportController.checkDataExist);

// =====================================================
// THÊM KẾT THÚC HỌC PHẦN
// =====================================================

router.get("/them-kthp", baseController.getThemKTHP);
router.post("/them-kthp", themKTHPController.save);
router.post("/them-kthp/batch", themKTHPController.saveBatch);
router.get("/them-kthp/:NamHoc/:Khoa", themKTHPController.getTable);
router.post("/them-kthp/edit/:ID", themKTHPController.edit);
router.delete("/them-kthp/:ID", themKTHPController.delete);

// =====================================================
// DUYỆT KẾT THÚC HỌC PHẦN
// =====================================================

router.get("/duyet-kthp", baseController.getDuyetKTHP);
router.get("/duyet-kthp/:NamHoc/:Khoa", duyetKTHPController.getTable);
router.post("/duyet-kthp/batch-approve", duyetKTHPController.batchApprove);
router.post("/duyet-kthp/edit/:ID", duyetKTHPController.edit);
router.delete("/duyet-kthp/:ID", duyetKTHPController.delete);
router.post("/duyet-kthp/approve/:ID", duyetKTHPController.approve); // Deprecated, kept for compatibility

// =====================================================
// TỔNG HỢP
// =====================================================

router.get("/tong-hop-giang-vien", baseController.getTongHopGV);
router.get("/tong-hop/giang-vien", tongHopController.tongHopTheoGV);
router.get("/tong-hop-khoa", baseController.getTongHopKhoa);
router.get("/tong-hop/khoa", tongHopController.tongHopTheoKhoa);
router.get("/tong-hop/chi-tiet/:MaGV", tongHopController.chiTietGV);
router.get("/tong-hop/preview/:MaGV", previewController.getPreviewData);
router.get("/tong-hop/data-chuan/:MaGV", tongHopController.getStandardSummaryData);

// Snapshot (Chốt dữ liệu)
router.post("/tong-hop/chot-du-lieu", tongHopController.chotDuLieu);
router.get("/tong-hop/lich-su-chot", tongHopController.getLichSuChot);
router.get("/tong-hop/snapshot-data", tongHopController.getSnapshotData);

// =====================================================
// XUẤT FILE
// =====================================================

router.get("/xuat-file", xuatFileController.renderPage);
router.get("/xuat-file/excel", xuatFileController.exportExcel);

// =====================================================
// HƯỚNG DẪN ĐỒ ÁN TỐT NGHIỆP
// =====================================================

const huongDanDATNController = require("../controllers/vuotgio_v2/huongDanDATN.controller");

router.get("/huong-dan-datn", baseController.getHuongDanDATN);
router.get("/huong-dan-datn/table", huongDanDATNController.getTable);
router.get("/huong-dan-datn/chi-tiet/:GiangVien", huongDanDATNController.getChiTiet);

// =====================================================
// HƯỚNG DẪN THAM QUAN THỰC TẾ
// =====================================================

const huongDanThamQuanController = require("../controllers/vuotgio_v2/huongDanThamQuan.controller");

router.get("/huong-dan-tham-quan", baseController.getHuongDanThamQuan);
router.get("/huong-dan-tham-quan/add", baseController.getHuongDanThamQuanAdd);
router.get("/huong-dan-tham-quan/filters", huongDanThamQuanController.getFilters);
router.get("/huong-dan-tham-quan/table", huongDanThamQuanController.getTable);
router.post("/huong-dan-tham-quan/save", huongDanThamQuanController.save);
router.post("/huong-dan-tham-quan/edit/:id", huongDanThamQuanController.edit);
router.delete("/huong-dan-tham-quan/:id", huongDanThamQuanController.delete);

module.exports = router;
