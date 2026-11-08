const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const portalController = require("../controllers/nckh_v3/portal.controller");
const deTaiDuAnV3Controller = require("../controllers/nckh_v3/deTaiDuAn.controller");
const baiBaoKhoaHocController = require("../controllers/nckh_v3/baiBaoKhoaHoc.controller");
const sangKienController = require("../controllers/nckh_v3/sangKien.controller");
const giaiThuongController = require("../controllers/nckh_v3/giaiThuong.controller");
const deXuatNghienCuuController = require("../controllers/nckh_v3/deXuatNghienCuu.controller");
const sachGiaoTrinhController = require("../controllers/nckh_v3/sachGiaoTrinh.controller");
const huongDanSvNckhController = require("../controllers/nckh_v3/huongDanSvNckh.controller");
const thanhVienHoiDongController = require("../controllers/nckh_v3/thanhVienHoiDong.controller");
const recordController = require("../controllers/nckh_v3/record.controller");
const adminController = require("../controllers/nckh_v3/adminQuyDinh.controller");
const statsController = require("../controllers/nckh_v3/stats.controller");
const officialStatsController = require("../controllers/nckh_v3/officialStats.controller");
const exportController = require("../controllers/nckh_v3/export.controller");
const lecturerReportController = require("../controllers/nckh_v3/lecturerReport.controller");
const { STATS_SCOPE } = require("../config/nckh_v3/statsScope");
const importController = require("../controllers/nckh_v3/import.controller");

// Multer memory storage for Excel upload
const uploadMemory = multer({ storage: multer.memoryStorage() });

// Multer disk storage for NCKH file upload
const nckhUploadDir = path.join(__dirname, "../public/uploads/nckh");
if (!fs.existsSync(nckhUploadDir)) {
  fs.mkdirSync(nckhUploadDir, { recursive: true });
}

const nckhDiskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, nckhUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${base}-${uniqueSuffix}${ext}`);
  },
});

const uploadNckhFile = multer({
  storage: nckhDiskStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".doc", ".docx"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Chỉ chấp nhận file định dạng PDF, DOC, DOCX"));
    }
  },
});

// Auth middleware: only trợ lý / lãnh đạo from Viện NCKH&HTPT
const importAuthMiddleware = (req, res, next) => {
  const role = req.session?.role || "";
  const maPhongBan = req.session?.MaPhongBan || "";

  const troLyPhong = process.env.ROLE_PHONGBAN_TROLY || "tro_ly_phong";
  const lanhDaoPhong = process.env.ROLE_PHONGBAN_LANHDAO || "lanh_dao_phong";
  const vienNcCode = process.env.VIEN_NCKH_HTPT || "NCKHHTQT";

  const hasRole = role === troLyPhong || role === lanhDaoPhong;
  const hasDept = maPhongBan === vienNcCode;

  if (!hasRole || !hasDept) {
    if (req.headers["content-type"]?.includes("json") || req.xhr) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền truy cập tính năng import." });
    }
    return res.redirect("/v3/nckh");
  }

  next();
};

router.use((req, res, next) => {
	res.locals.nckhVersion = "v3";
	next();
});

router.get("/", portalController.renderPage);

// V3 de-tai-du-an portal APIs
router.get("/de-tai-du-an", (req, res) => {
	res.redirect("/v3/nckh/them-moi-nckh?type=de-tai-du-an");
});
router.get("/de-tai-du-an/metadata", deTaiDuAnV3Controller.getMetadata);
router.get("/de-tai-du-an/list/:namHoc/:khoaId", deTaiDuAnV3Controller.list);
router.get("/de-tai-du-an/:id", deTaiDuAnV3Controller.detail);
router.post("/de-tai-du-an", deTaiDuAnV3Controller.create);
router.put("/de-tai-du-an/:id", deTaiDuAnV3Controller.update);
router.delete("/de-tai-du-an/:id", deTaiDuAnV3Controller.remove);

router.get("/bai-bao-khoa-hoc/metadata", baiBaoKhoaHocController.getMetadata);
router.get("/bai-bao-khoa-hoc/list/:namHoc/:khoaId", baiBaoKhoaHocController.list);
router.get("/bai-bao-khoa-hoc/:id", baiBaoKhoaHocController.detail);
router.post("/bai-bao-khoa-hoc", baiBaoKhoaHocController.create);
router.put("/bai-bao-khoa-hoc/:id", baiBaoKhoaHocController.update);
router.delete("/bai-bao-khoa-hoc/:id", baiBaoKhoaHocController.remove);

// Upload file minh chứng NCKH
router.post("/upload-file", (req, res) => {
	uploadNckhFile.single("fileMinhChung")(req, res, (err) => {
		if (err instanceof multer.MulterError) {
			if (err.code === "LIMIT_FILE_SIZE") {
				return res.status(400).json({ success: false, message: "Dung lượng file vượt quá giới hạn 25MB" });
			}
			return res.status(400).json({ success: false, message: `Lỗi tải file: ${err.message}` });
		} else if (err) {
			return res.status(400).json({ success: false, message: err.message || "Lỗi tải file" });
		}
		if (!req.file) {
			return res.status(400).json({ success: false, message: "Không tìm thấy file tải lên" });
		}
		const relativePath = `/uploads/nckh/${req.file.filename}`;
		return res.json({
			success: true,
			filePath: relativePath,
			fileName: req.file.filename,
			originalName: req.file.originalname,
			size: req.file.size,
		});
	});
});

router.get("/sang-kien/metadata", sangKienController.getMetadata);
router.get("/sang-kien/list/:namHoc/:khoaId", sangKienController.list);
router.get("/sang-kien/:id", sangKienController.detail);
router.post("/sang-kien", sangKienController.create);
router.put("/sang-kien/:id", sangKienController.update);
router.delete("/sang-kien/:id", sangKienController.remove);

router.get("/giai-thuong/metadata", giaiThuongController.getMetadata);
router.get("/giai-thuong/list/:namHoc/:khoaId", giaiThuongController.list);
router.get("/giai-thuong/:id", giaiThuongController.detail);
router.post("/giai-thuong", giaiThuongController.create);
router.put("/giai-thuong/:id", giaiThuongController.update);
router.delete("/giai-thuong/:id", giaiThuongController.remove);

router.get("/de-xuat-nghien-cuu/metadata", deXuatNghienCuuController.getMetadata);
router.get("/de-xuat-nghien-cuu/list/:namHoc/:khoaId", deXuatNghienCuuController.list);
router.get("/de-xuat-nghien-cuu/:id", deXuatNghienCuuController.detail);
router.post("/de-xuat-nghien-cuu", deXuatNghienCuuController.create);
router.put("/de-xuat-nghien-cuu/:id", deXuatNghienCuuController.update);
router.delete("/de-xuat-nghien-cuu/:id", deXuatNghienCuuController.remove);

router.get("/sach-giao-trinh/metadata", sachGiaoTrinhController.getMetadata);
router.get("/sach-giao-trinh/list/:namHoc/:khoaId", sachGiaoTrinhController.list);
router.get("/sach-giao-trinh/:id", sachGiaoTrinhController.detail);
router.post("/sach-giao-trinh", sachGiaoTrinhController.create);
router.put("/sach-giao-trinh/:id", sachGiaoTrinhController.update);
router.delete("/sach-giao-trinh/:id", sachGiaoTrinhController.remove);

router.get("/huong-dan-sv-nckh/metadata", huongDanSvNckhController.getMetadata);
router.get("/huong-dan-sv-nckh/list/:namHoc/:khoaId", huongDanSvNckhController.list);
router.get("/huong-dan-sv-nckh/:id", huongDanSvNckhController.detail);
router.post("/huong-dan-sv-nckh", huongDanSvNckhController.create);
router.put("/huong-dan-sv-nckh/:id", huongDanSvNckhController.update);
router.delete("/huong-dan-sv-nckh/:id", huongDanSvNckhController.remove);

router.get("/thanh-vien-hoi-dong/metadata", thanhVienHoiDongController.getMetadata);
router.get("/thanh-vien-hoi-dong/list/:namHoc/:khoaId", thanhVienHoiDongController.list);
router.get("/thanh-vien-hoi-dong/:id", thanhVienHoiDongController.detail);
router.post("/thanh-vien-hoi-dong", thanhVienHoiDongController.create);
router.put("/thanh-vien-hoi-dong/:id", thanhVienHoiDongController.update);
router.delete("/thanh-vien-hoi-dong/:id", thanhVienHoiDongController.remove);

router.get("/hoi-dong-khoa-hoc/metadata", thanhVienHoiDongController.getMetadata);
router.get("/hoi-dong-khoa-hoc/list/:namHoc/:khoaId", thanhVienHoiDongController.list);
router.get("/hoi-dong-khoa-hoc/:id", thanhVienHoiDongController.detail);
router.post("/hoi-dong-khoa-hoc", thanhVienHoiDongController.create);
router.put("/hoi-dong-khoa-hoc/:id", thanhVienHoiDongController.update);
router.delete("/hoi-dong-khoa-hoc/:id", thanhVienHoiDongController.remove);

// Unified records APIs (all NCKH types)
router.get("/records/filters", recordController.getFilters);
router.patch("/records/bulk-approvals", recordController.bulkApprovals);
router.get("/records", recordController.list);
router.get("/records/:id", recordController.detail);
router.delete("/records/:id", recordController.remove);
router.patch("/records/:id/khoa-duyet", recordController.approveKhoa);
router.patch("/records/:id/vien-duyet", recordController.approveVien);

// V3 entry pages
router.get("/danh-sach-nckh", (req, res) => {
	res.redirect("/v3/nckh/xem-chung");
});

router.get("/them-moi-nckh", (req, res) => {
	portalController.renderInputPage(req, res);
});

router.get("/xem-chung", (req, res) => {
	portalController.renderUnifiedListPage(req, res);
});

const officialStats = statsController.createStatsController(STATS_SCOPE.OFFICIAL);
const previewStats = statsController.createStatsController(STATS_SCOPE.PREVIEW);

router.get("/thong-ke", officialStatsController.renderPage);
router.get("/thong-ke-du-kien", (_req, res) => {
	res.render("nckh_v3/stats_official.ejs", { statsScope: STATS_SCOPE.PREVIEW });
});
router.get("/thong-ke/giang-vien", (_req, res) => res.render("nckh_v3/stats_lecturer.ejs"));
router.get("/thong-ke/khoa", (_req, res) => res.render("nckh_v3/stats_faculty.ejs"));
router.get("/thong-ke/hoc-vien", (_req, res) => res.render("nckh_v3/stats_institute.ejs"));

router.get("/stats/filters", officialStats.getFilters);
router.get("/stats/giang-vien", officialStats.lecturerSummary);
router.get("/stats/giang-vien/:lecturerId/cong-trinh", officialStats.lecturerRecords);
router.get("/stats/khoa", officialStats.facultySummary);
router.get("/stats/khoa/:khoaId/cong-trinh", officialStats.facultyRecords);
router.get("/stats/hoc-vien", officialStats.instituteSummary);
router.get("/stats/hoc-vien/cong-trinh", officialStats.instituteRecords);

router.get("/stats/preview/filters", previewStats.getFilters);
router.get("/stats/preview/giang-vien", previewStats.lecturerSummary);
router.get("/stats/preview/giang-vien/:lecturerId/cong-trinh", previewStats.lecturerRecords);
router.get("/stats/preview/khoa", previewStats.facultySummary);
router.get("/stats/preview/khoa/:khoaId/cong-trinh", previewStats.facultyRecords);
router.get("/stats/preview/hoc-vien", previewStats.instituteSummary);
router.get("/stats/preview/hoc-vien/cong-trinh", previewStats.instituteRecords);

// Export APIs
router.get("/export/stats/giang-vien", (req, res) => exportController.exportLecturerStats(req, res, STATS_SCOPE.OFFICIAL));
router.get("/export/stats/khoa", (req, res) => exportController.exportFacultyStats(req, res, STATS_SCOPE.OFFICIAL));
router.get("/export/stats/hoc-vien", (req, res) => exportController.exportInstituteStats(req, res, STATS_SCOPE.OFFICIAL));
router.get("/export/stats/preview/giang-vien", (req, res) => exportController.exportLecturerStats(req, res, STATS_SCOPE.PREVIEW));
router.get("/export/stats/preview/khoa", (req, res) => exportController.exportFacultyStats(req, res, STATS_SCOPE.PREVIEW));
router.get("/export/stats/preview/hoc-vien", (req, res) => exportController.exportInstituteStats(req, res, STATS_SCOPE.PREVIEW));

// Báo cáo NCKH cá nhân (Xuất Word .docx theo mẫu kê khai)
router.get("/xuat-bao-cao-ca-nhan", lecturerReportController.renderPage);
router.get("/bao-cao-ca-nhan/export/:lecturerId", lecturerReportController.exportDocx);

router.get("/hoi-dong-khoa-hoc", (req, res) => {
	res.redirect("/v3/nckh/them-moi-nckh?type=thanh-vien-hoi-dong");
});

// Import NCKH routes (restricted to trợ lý / lãnh đạo Viện NC)
router.get("/import", importAuthMiddleware, importController.renderImportPage);
router.post("/import/preview", importAuthMiddleware, uploadMemory.single("file"), importController.previewExcel);
router.post("/import/save", importAuthMiddleware, importController.saveImportData);

// Admin quy-dinh APIs (route under V3 path)
router.get("/admin/quy-dinh", adminController.getAdminQuyDinhPage);
router.post("/admin/quy-dinh", adminController.saveQuyDinhSoGio);
router.patch("/admin/quy-dinh/toggle/:id", adminController.toggleQuyDinhStatus);

module.exports = router;
