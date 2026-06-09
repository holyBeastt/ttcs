/**
 * VUOT GIO V2 - Data Lock Controller
 * Controller xử lý API khóa dữ liệu, kiểm tra trạng thái khóa,
 * và đọc dữ liệu snapshot đã chốt.
 */

const dataLockService = require("../../services/vuotgio_v2/dataLock.service");
const createPoolConnection = require("../../config/databasePool");
const snapshotRepo = require("../../repositories/vuotgio_v2/soTietTongHop.repo");

/**
 * POST /tong-hop/khoa-du-lieu
 * Thực hiện khóa dữ liệu + lưu snapshot cho một năm học
 * Body: { namHoc: string, ghiChu?: string }
 * Yêu cầu: vai trò Lãnh đạo phòng VP
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

        res.json({
            success: true,
            message: result.message,
            stats: result.stats,
        });
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

/**
 * GET /snapshot?namHoc=...
 * Lấy dữ liệu snapshot mới nhất cho một năm học.
 * Trả về danh sách tổng hợp (không bao gồm chi_tiet JSON nặng).
 * Yêu cầu: đã đăng nhập
 */
const getSnapshot = async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { namHoc } = req.query;

    if (!namHoc || !dataLockService.validateNamHocFormat(namHoc)) {
        return res.status(400).json({ success: false, message: "Thiếu hoặc sai định dạng năm học" });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        const rows = await snapshotRepo.getLatestSnapshot(connection, namHoc);

        // Strip chi_tiet (JSON quá nặng) cho endpoint danh sách
        const data = rows.map(row => {
            const { chi_tiet, ...rest } = row;
            return rest;
        });

        res.json({ success: true, data, total: data.length });
    } catch (error) {
        console.error("[dataLock.getSnapshot] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * GET /snapshot/chi-tiet?namHoc=...&idUser=...
 * Lấy chi tiết snapshot của 1 giảng viên (bao gồm chi_tiet JSON đầy đủ).
 * Dùng để xuất lại file Excel chi tiết cho năm cũ.
 * Yêu cầu: đã đăng nhập
 */
const getSnapshotDetail = async (req, res) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { namHoc, idUser } = req.query;

    if (!namHoc || !dataLockService.validateNamHocFormat(namHoc)) {
        return res.status(400).json({ success: false, message: "Thiếu hoặc sai định dạng năm học" });
    }
    if (!idUser) {
        return res.status(400).json({ success: false, message: "Thiếu idUser" });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        const record = await snapshotRepo.getLatestByUser(connection, namHoc, Number(idUser));

        if (!record) {
            return res.status(404).json({ success: false, message: "Không tìm thấy dữ liệu snapshot" });
        }

        // Parse chi_tiet JSON string -> object
        if (record.chi_tiet && typeof record.chi_tiet === "string") {
            try {
                record.chi_tiet = JSON.parse(record.chi_tiet);
            } catch (e) {
                console.warn("[getSnapshotDetail] Failed to parse chi_tiet JSON:", e.message);
            }
        }

        res.json({ success: true, data: record });
    } catch (error) {
        console.error("[dataLock.getSnapshotDetail] Error:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    lockData,
    getLockStatus,
    getSnapshot,
    getSnapshotDetail,
};
