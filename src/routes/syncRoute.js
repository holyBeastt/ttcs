/**
 * Sync Routes
 * API endpoints for data export and import
 * Protected by admin authentication
 */

const express = require("express");
const router = express.Router();
const syncController = require("../controllers/syncController");
const { requireAdmin } = require("../middlewares/syncAuthMiddleware");

// ============================================
// EXPORT ENDPOINT
// ============================================

/**
 * Export data from a table
 * GET /sync/export?table=TABLE_NAME
 * 
 * Example:
 * GET /sync/export?table=nhanvien
 * GET /sync/export?table=gvmoi
 * GET /sync/export?table=course_schedule_details
 * 
 * Response:
 * {
 *   "success": true,
 *   "table": "nhanvien",
 *   "count": 100,
 *   "data": [...],
 *   "description": "Employee data"
 * }
 */
router.get("/export", requireAdmin, syncController.exportTable);

// ============================================
// IMPORT ENDPOINT
// ============================================

/**
 * Import data to a table (UPSERT)
 * POST /sync/import
 * 
 * Request Body:
 * {
 *   "table": "TABLE_NAME",
 *   "data": [
 *     { ... record 1 ... },
 *     { ... record 2 ... }
 *   ]
 * }
 * 
 * Example:
 * POST /sync/import
 * {
 *   "table": "gvmoi",
 *   "data": [
 *     { "CCCD": "123456", "HoTen": "Nguyen Van A", ... }
 *   ]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "table": "gvmoi",
 *   "inserted": 5,
 *   "updated": 3,
 *   "total": 8,
 *   "errors": []
 * }
 */
router.post("/import", requireAdmin, syncController.importTable);

// ============================================
// BULK EXPORT/IMPORT ENDPOINTS
// ============================================

/**
 * Export all tables at once
 * GET /sync/export-all
 */
router.get("/export-all", requireAdmin, syncController.exportAll);

/**
 * Import all tables from exported file
 * POST /sync/import-all
 */
router.post("/import-all", requireAdmin, syncController.importAll);

// ============================================
// INFO ENDPOINT (Optional - for testing)
// ============================================

/**
 * Get information about available sync tables
 * GET /sync/info
 */
router.get("/info", requireAdmin, syncController.getTableInfo);

// ============================================
// UI ENDPOINT
// ============================================

/**
 * Sync Management UI Page
 * GET /sync
 */
router.get("/", requireAdmin, (req, res) => {
    res.render("syncManagement", {
        title: "Đồng Bộ Dữ Liệu",
        userId: req.session.userId,
        role: req.session.role || req.session.Quyen,
        TenDangNhap: req.session.TenDangNhap,
        MaPhongBan: req.session.MaPhongBan
    });
});

module.exports = router;

