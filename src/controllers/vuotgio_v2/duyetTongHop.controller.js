/**
 * VUOT GIO V2 - Duyệt Tổng Hợp Controller
 * API duyệt tổng hợp vượt giờ theo khoa (Văn phòng thực hiện)
 */

const duyetTongHopService = require("../../services/vuotgio_v2/duyetTongHop.service");

/**
 * GET /tong-hop/duyet-trang-thai?namHoc=...
 * Lấy trạng thái duyệt tổng hợp cho tất cả khoa
 */
const getApprovalStatus = async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { namHoc } = req.query;
    if (!namHoc) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học" });
    }

    try {
        const result = await duyetTongHopService.getApprovalStatus(namHoc);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("[duyetTongHop.getApprovalStatus] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    }
};

/**
 * GET /tong-hop/duyet-kiem-tra?namHoc=...&khoa=...
 * Kiểm tra điều kiện tiên quyết cho 1 khoa trước khi duyệt
 */
const checkPrerequisites = async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { namHoc, khoa } = req.query;
    if (!namHoc || !khoa) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học hoặc khoa" });
    }

    try {
        const result = await duyetTongHopService.checkPrerequisites(namHoc, khoa);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("[duyetTongHop.checkPrerequisites] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    }
};

/**
 * POST /tong-hop/duyet-khoa
 * VP duyệt tổng hợp cho 1 khoa
 * Body: { namHoc, khoa, ghiChu? }
 * Quyền: Trợ lý VP hoặc Lãnh đạo phòng VP
 */
const approveKhoa = async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Kiểm tra quyền: Trợ lý hoặc Lãnh đạo phòng VP
    const role = req.session.role || req.session.Quyen;
    const maPhongBan = req.session.MaPhongBan;
    const allowedRoles = ["Lãnh đạo phòng", "Trợ lý"];
    if (!allowedRoles.includes(role) || maPhongBan !== "VP") {
        return res.status(403).json({ success: false, message: "Bạn không có quyền thực hiện thao tác này" });
    }

    const { namHoc, khoa, ghiChu } = req.body;
    if (!namHoc || !khoa) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học hoặc khoa" });
    }

    try {
        const result = await duyetTongHopService.approveKhoa(namHoc, khoa, req.session.userId, ghiChu || null);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error("[duyetTongHop.approveKhoa] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    }
};

/**
 * POST /tong-hop/huy-duyet-khoa
 * VP hủy duyệt 1 khoa
 * Body: { namHoc, khoa }
 * Quyền: Trợ lý VP hoặc Lãnh đạo phòng VP
 */
const revokeKhoa = async (req, res) => {
    if (!req.session?.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Kiểm tra quyền: Trợ lý hoặc Lãnh đạo phòng VP
    const role = req.session.role || req.session.Quyen;
    const maPhongBan = req.session.MaPhongBan;
    const allowedRoles = ["Lãnh đạo phòng", "Trợ lý"];
    if (!allowedRoles.includes(role) || maPhongBan !== "VP") {
        return res.status(403).json({ success: false, message: "Bạn không có quyền thực hiện thao tác này" });
    }

    const { namHoc, khoa } = req.body;
    if (!namHoc || !khoa) {
        return res.status(400).json({ success: false, message: "Thiếu thông tin năm học hoặc khoa" });
    }

    try {
        const result = await duyetTongHopService.revokeKhoa(namHoc, khoa);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error("[duyetTongHop.revokeKhoa] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    }
};

module.exports = {
    getApprovalStatus,
    checkPrerequisites,
    approveKhoa,
    revokeKhoa,
};
