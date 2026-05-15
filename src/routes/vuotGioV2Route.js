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
const kthpImportController = require("../controllers/vuotgio_v2/coiChamRaDe.file.controller");
const tongHopController = require("../controllers/vuotgio_v2/tongHop.controller");
const xuatFileController = require("../controllers/vuotgio_v2/xuatFile.controller");
const thongKeGiangDayController = require("../controllers/vuotgio_v2/thongKeGiangDay.controller");
const previewController = require("../controllers/vuotgio_v2/preview.controller");
const dataLockController = require("../controllers/vuotgio_v2/dataLock.controller");

// Middleware
const { uploadSingleFile } = require("../middlewares/TKBImportMiddleware");
const { checkDataLock } = require("../middlewares/dataLockMiddleware");
const { enforceKhoaFilter } = require("../middlewares/khoaFilterMiddleware");
const multer = require("multer");
const uploadMemory = multer({ storage: multer.memoryStorage() });

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
router.post("/lop-ngoai-quy-chuan", enforceKhoaFilter, checkDataLock, lopNgoaiQCController.save);
router.get("/lop-ngoai-quy-chuan/nhap/:Dot/:KiHoc/:NamHoc/:Khoa", enforceKhoaFilter, lopNgoaiQCController.getTable);
router.post("/lop-ngoai-quy-chuan/edit", enforceKhoaFilter, checkDataLock, lopNgoaiQCController.edit);
router.delete("/lop-ngoai-quy-chuan/row", enforceKhoaFilter, checkDataLock, lopNgoaiQCController.delete);
router.delete("/lop-ngoai-quy-chuan/all", enforceKhoaFilter, checkDataLock, lopNgoaiQCController.deleteByFilter);
router.post("/lop-ngoai-quy-chuan/confirm", enforceKhoaFilter, checkDataLock, lopNgoaiQCController.confirmToMain);

// --- Chính thức (lopngoaiquychuan) ---
router.get("/lop-ngoai-quy-chuan/chinh-thuc/:NamHoc/:Khoa", enforceKhoaFilter, lopNgoaiQCController.getChinhThuc);
router.post("/lop-ngoai-quy-chuan/edit-chinh-thuc/:ID", enforceKhoaFilter, checkDataLock, lopNgoaiQCController.editChinhThuc);
router.delete("/lop-ngoai-quy-chuan/chinh-thuc/:ID", enforceKhoaFilter, checkDataLock, lopNgoaiQCController.deleteChinhThuc);
router.post("/lop-ngoai-quy-chuan/approve/:ID", enforceKhoaFilter, checkDataLock, lopNgoaiQCController.approve);
router.post("/lop-ngoai-quy-chuan/unapprove/:ID", enforceKhoaFilter, checkDataLock, lopNgoaiQCController.unapprove);
router.post("/lop-ngoai-quy-chuan/batch-approve", enforceKhoaFilter, checkDataLock, lopNgoaiQCController.batchApprove);

// --- Import file Lớp Ngoài QC ---
router.post("/lop-ngoai-qc/parse-excel", uploadSingleFile, lopNgoaiQCImportController.parseExcel);
router.post("/lop-ngoai-qc/confirm-import", enforceKhoaFilter, checkDataLock, lopNgoaiQCImportController.confirmImport);
router.post("/lop-ngoai-qc/check-data-exist", enforceKhoaFilter, lopNgoaiQCImportController.checkDataExist);

// =====================================================
// THÊM KẾT THÚC HỌC PHẦN
// =====================================================

router.get("/them-kthp", baseController.getThemKTHP);
router.post("/them-kthp", enforceKhoaFilter, checkDataLock, themKTHPController.save);
router.post("/them-kthp/batch", enforceKhoaFilter, checkDataLock, themKTHPController.saveBatch);
router.get("/them-kthp/:NamHoc/:Khoa", enforceKhoaFilter, themKTHPController.getTable);
router.post("/them-kthp/edit/:ID", enforceKhoaFilter, checkDataLock, themKTHPController.edit);
router.delete("/them-kthp/:ID", enforceKhoaFilter, checkDataLock, themKTHPController.delete);

// =====================================================
// IMPORT KẾT THÚC HỌC PHẦN (FILE EXCEL)
// =====================================================

router.get("/import-kthp", baseController.getCoiChamRaDeThi);
router.get("/import-kthp/api", enforceKhoaFilter, kthpImportController.getWorkload);
router.post("/import-kthp/upload", enforceKhoaFilter, uploadMemory.single('file'), kthpImportController.readFileExcel);
router.post("/import-kthp/import", enforceKhoaFilter, checkDataLock, kthpImportController.importWorkloadToDB);
router.post("/import-kthp/checkfile", enforceKhoaFilter, kthpImportController.checkDataExistence);
router.post("/import-kthp/delete", enforceKhoaFilter, checkDataLock, kthpImportController.deleteWorkloadData);
router.post("/import-kthp/save", enforceKhoaFilter, checkDataLock, kthpImportController.saveWorkloadData);
router.get("/import-kthp/getSuggestions", kthpImportController.getSuggestions);

// =====================================================
// DUYỆT KẾT THÚC HỌC PHẦN
// =====================================================

router.get("/duyet-kthp", baseController.getDuyetKTHP);
router.get("/duyet-kthp/:NamHoc/:Khoa", enforceKhoaFilter, duyetKTHPController.getTable);
router.post("/duyet-kthp/batch-approve", enforceKhoaFilter, checkDataLock, duyetKTHPController.batchApprove);
router.post("/duyet-kthp/edit/:ID", enforceKhoaFilter, checkDataLock, duyetKTHPController.edit);
router.delete("/duyet-kthp/:ID", enforceKhoaFilter, checkDataLock, duyetKTHPController.delete);
router.post("/duyet-kthp/approve/:ID", enforceKhoaFilter, checkDataLock, duyetKTHPController.approve); // Deprecated, kept for compatibility

// =====================================================
// TỔNG HỢP
// =====================================================

router.get("/tong-hop-giang-vien", baseController.getTongHopGV);
router.get("/tong-hop/giang-vien", tongHopController.tongHopTheoGV);
router.get("/tong-hop-khoa", baseController.getTongHopKhoa);
router.get("/tong-hop/khoa", tongHopController.tongHopTheoKhoa);
router.get("/tong-hop/chi-tiet/:MaGV", tongHopController.chiTietGV);
router.get("/tong-hop/preview/:MaGV", previewController.getPreviewData);
router.get("/tong-hop/preview-khoa/:khoa", previewController.getPreviewKhoaData);
router.get("/tong-hop/preview-consolidated", previewController.getConsolidatedPreviewData);
router.get("/tong-hop/consolidated-data", previewController.getConsolidatedData);
router.get("/tong-hop/data-chuan/:MaGV", tongHopController.getStandardSummaryData);

// Khóa dữ liệu
router.get("/trang-thai-khoa", dataLockController.getLockStatus);
router.post("/tong-hop/khoa-du-lieu", dataLockController.lockData);

// Duyệt tổng hợp theo khoa
const duyetTongHopController = require("../controllers/vuotgio_v2/duyetTongHop.controller");
router.get("/tong-hop/duyet-trang-thai", duyetTongHopController.getApprovalStatus);
router.get("/tong-hop/duyet-kiem-tra", duyetTongHopController.checkPrerequisites);
router.post("/tong-hop/duyet-khoa", duyetTongHopController.approveKhoa);
router.post("/tong-hop/huy-duyet-khoa", duyetTongHopController.revokeKhoa);

// =====================================================
// XUẤT FILE
// =====================================================

router.get("/xuat-file", xuatFileController.renderPage);
router.get("/xuat-file/excel", xuatFileController.exportExcel);
router.get("/xuat-file/tong-hop", xuatFileController.exportConsolidated);

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
router.get("/huong-dan-tham-quan/filters", enforceKhoaFilter, huongDanThamQuanController.getFilters);
router.get("/huong-dan-tham-quan/table", enforceKhoaFilter, huongDanThamQuanController.getTable);
router.post("/huong-dan-tham-quan/save", enforceKhoaFilter, checkDataLock, huongDanThamQuanController.save);
router.post("/huong-dan-tham-quan/edit/:id", enforceKhoaFilter, checkDataLock, huongDanThamQuanController.edit);
router.post("/huong-dan-tham-quan/batch-approve", enforceKhoaFilter, checkDataLock, huongDanThamQuanController.batchApprove);
router.delete("/huong-dan-tham-quan/:id", enforceKhoaFilter, checkDataLock, huongDanThamQuanController.delete);

module.exports = router;
