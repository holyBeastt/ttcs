const express = require("express");
const router = express.Router();

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
router.get("/records", recordController.list);
router.get("/records/:id", recordController.detail);
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

router.get("/hoi-dong-khoa-hoc", (req, res) => {
	res.redirect("/v3/nckh/them-moi-nckh?type=thanh-vien-hoi-dong");
});

// Admin quy-dinh APIs (route under V3 path)
router.get("/admin/quy-dinh", adminController.getAdminQuyDinhPage);
router.post("/admin/quy-dinh", adminController.saveQuyDinhSoGio);
router.patch("/admin/quy-dinh/toggle/:id", adminController.toggleQuyDinhStatus);

module.exports = router;
