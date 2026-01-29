/**
 * NCKH V2 Routes - Unified Version
 * Routes cho bảng hợp nhất nckh_chung
 * Date: 2026-01-24 (Cleaned - Legacy routes removed)
 */

const express = require("express");
const router = express.Router();

// Controllers
const unifiedController = require("../controllers/nckh_v2/unified.controller");
const tongHopController = require("../controllers/nckh_v2/tongHop.controller");

// Base controller (giữ lại cho backward compatibility)
const nckhV2Base = require("../controllers/nckh_v2/base.controller");

// =====================================================
// ROUTE CONFIGURATION
// =====================================================

const routeConfig = [
    {
        path: 'de-tai-du-an',
        type: 'DETAI_DUAN',
        tab: 'detaiduan',
        name: 'Đề tài, dự án'
    },
    {
        path: 'bai-bao-khoa-hoc',
        type: 'BAIBAO',
        tab: 'baibaokhoahoc',
        name: 'Bài báo khoa học'
    },
    {
        path: 'sang-kien',
        type: 'SANGKIEN',
        tab: 'sangkien',
        name: 'Sáng kiến'
    },
    {
        path: 'giai-thuong',
        type: 'GIAITHUONG',
        tab: 'giaithuong',
        name: 'Giải thưởng, bằng sáng chế'
    },
    {
        path: 'de-xuat-nghien-cuu',
        type: 'DEXUAT',
        tab: 'dexuat',
        name: 'Đề xuất nghiên cứu'
    },
    {
        path: 'sach-giao-trinh',
        type: 'SACHGIAOTRINH',
        tab: 'sachgiaotrinh',
        name: 'Sách, giáo trình'
    },
    {
        path: 'huong-dan-sv-nckh',
        type: 'HUONGDAN',
        tab: 'huongdansvnckh',
        name: 'Hướng dẫn SV NCKH'
    },
    {
        path: 'thanh-vien-hoi-dong',
        type: 'HOIDONG',
        tab: 'hoidong',
        name: 'Thành viên hội đồng'
    }
];

// =====================================================
// RENDER VIEWS
// =====================================================

router.get("/danh-sach-nckh", nckhV2Base.getDanhSachNCKHV2);
router.get("/them-moi-nckh", nckhV2Base.getThemMoiNCKHV2);

// =====================================================
// GENERATE ROUTES TỰ ĐỘNG TỪ CONFIG
// =====================================================

routeConfig.forEach(({ path, type, tab }) => {
    const ctrl = unifiedController.controllers[type];

    // Render view
    router.get(`/${path}`, (req, res) => {
        res.render("nckh.danhSachNCKH.ejs", { activeTab: tab });
    });

    // CRUD operations
    router.post(`/${path}`, ctrl.save);                          // Create
    router.get(`/${path}/:NamHoc/:Khoa`, ctrl.getTable);         // Read
    router.post(`/${path}/edit/:ID`, ctrl.edit);                 // Update
    router.delete(`/${path}/:ID`, ctrl.delete);                  // Delete
});

// =====================================================
// CRUD CHUNG (Unified routes)
// =====================================================

// Lấy tất cả loại NCKH
router.get("/nckh/all/:NamHoc/:Khoa", unifiedController.getAllRecords);

// Xóa bản ghi (không cần biết loại)
router.post("/nckh/delete/:ID", unifiedController.deleteRecordUnified);
router.delete("/nckh/:ID", unifiedController.deleteRecordUnified);

// Cập nhật trạng thái duyệt
router.post("/nckh/approve/:ID", unifiedController.updateApprovalUnified);
router.post("/nckh/approve-khoa/:ID", unifiedController.updateKhoaApprovalUnified);

// =====================================================
// API QUY ĐỊNH SỐ GIỜ (Mới - dùng bảng nckh_quydinhsogio)
// =====================================================

router.get("/quydinh/:loaiNCKH", unifiedController.getQuyDinhSoGio);

// =====================================================
// QUẢN LÝ QUY ĐỊNH (ADMIN)
// =====================================================

const adminController = require("../controllers/nckh_v2/admin.controller");

router.get("/admin/quy-dinh", adminController.getAdminQuyDinhPage);
router.post("/admin/quy-dinh", adminController.saveQuyDinhSoGio);
router.patch("/admin/quy-dinh/toggle/:id", adminController.toggleQuyDinhStatus);

// =====================================================
// API GIẢNG VIÊN (Giữ nguyên)
// =====================================================

router.get("/giang-vien-co-huu", nckhV2Base.getTeacherV2);

// =====================================================
// TỔNG HỢP SỐ TIẾT DỰ KIẾN
// =====================================================

router.get("/tonghopsotiet/dukien", tongHopController.getTongHopSoTietDuKienV2);
router.post("/tonghopsotiet/dukien/:NamHoc", tongHopController.tongHopSoTietDuKienV2);

// Tổng hợp theo Khoa
router.get("/tonghopsotiet/khoa", tongHopController.getTongHopSoTietTheoKhoa);
router.post("/tonghopsotiet/khoa/:NamHoc", tongHopController.tongHopSoTietTheoKhoa);

// =====================================================
// EXPORTS
// =====================================================

module.exports = router;
