/**
 * VUOT GIO V2 - Data Lock Controller
 * Controller xử lý API khóa dữ liệu và kiểm tra trạng thái khóa
 */

const dataLockService = require("../../services/vuotgio_v2/dataLock.service");

/**
 * POST /tong-hop/khoa-du-lieu
 * Thực hiện khóa dữ liệu cho một năm học
 * Body: { namHoc: string, ghiChu?: string }
 * Yêu cầu: vai trò tai_chinh
 */
const lockData = async (req, res) => {
    // Kiểm tra đăng nhập
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Kiểm tra quyền: chỉ Lãnh đạo phòng của Văn phòng (VP)
    const role = req.session.role || req.session.Quyen;
    const maPhongBan = req.session.MaPhongBan;
    if (role !== "Lãnh đạo phòng" || maPhongBan !== "VP") {
        return res.status(403).json({ success: false, message: "Bạn không có quyền thực hiện thao tác này" });
    }

    const { namHoc, ghiChu } = req.body;

    // Validate: thiếu namHoc
    if (!namHoc || (typeof namHoc === "string" && namHoc.trim() === "")) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học" });
    }

    // Validate: format namHoc
    if (!dataLockService.validateNamHocFormat(namHoc)) {
        return res.status(400).json({ success: false, message: "Định dạng năm học không hợp lệ. Yêu cầu: YYYY - YYYY" });
    }

    try {
        const userId = req.session.userId;
        const result = await dataLockService.lockData(namHoc, userId, ghiChu || null);

        if (!result.success) {
            // Phân biệt lỗi đã khóa (409) vs lỗi khác (400)
            const status = result.message === "Dữ liệu năm học này đã được khóa" ? 409 : 400;
            return res.status(status).json({
                success: false,
                message: result.message,
                errors: result.errors || undefined,
            });
        }

        res.json({ success: true, message: result.message });
    } catch (error) {
        console.error("[dataLock.lockData] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra, vui lòng thử lại" });
    }
};

/**
 * GET /trang-thai-khoa?namHoc=...
 * Kiểm tra trạng thái khóa cho một năm học
 * Query: namHoc (required)
 * Yêu cầu: đã đăng nhập
 */
const getLockStatus = async (req, res) => {
    // Kiểm tra đăng nhập
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { namHoc } = req.query;

    // Validate: thiếu namHoc
    if (!namHoc || (typeof namHoc === "string" && namHoc.trim() === "")) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học" });
    }

    // Validate: format namHoc
    if (!dataLockService.validateNamHocFormat(namHoc)) {
        return res.status(400).json({ success: false, message: "Định dạng năm học không hợp lệ. Yêu cầu: YYYY - YYYY" });
    }

    try {
        const result = await dataLockService.getLockStatus(namHoc);
        res.json({ success: true, locked: result.locked, lockInfo: result.lockInfo });
    } catch (error) {
        console.error("[dataLock.getLockStatus] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra, vui lòng thử lại" });
    }
};

module.exports = {
    lockData,
    getLockStatus,
};
