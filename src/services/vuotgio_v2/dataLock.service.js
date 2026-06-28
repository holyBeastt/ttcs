/**
 * VUOT GIO V2 - Data Lock Service
 * Service kiểm tra trạng thái khóa và thực thi logic khóa dữ liệu
 *
 * Khi khóa dữ liệu năm học, service sẽ:
 *   1. Validate prerequisites (duyệt 2 cấp + duyệt tổng hợp tất cả khoa)
 *   2. Tính toán SDO (Standardized Data Object) cho toàn bộ giảng viên
 *   3. Lưu snapshot toàn trường vào bảng vg_so_tiet_tong_hop
 *   4. Insert bản ghi khóa vào bảng vg_khoa_du_lieu
 *   Tất cả trong 1 Transaction duy nhất (ACID).
 */

const createPoolConnection = require("../../config/databasePool");
const dataLockRepo = require("../../repositories/vuotgio_v2/dataLock.repo");
const snapshotRepo = require("../../repositories/vuotgio_v2/soTietTongHop.repo");
const duyetTongHopRepo = require("../../repositories/vuotgio_v2/duyetTongHop.repo");
const tongHopService = require("./tongHop.service");

// ============================================================
// Helper
// ============================================================
const withConnection = async (connection, callback) => {
    let shouldRelease = false;
    if (!connection) {
        connection = await createPoolConnection();
        shouldRelease = true;
    }
    try {
        return await callback(connection);
    } finally {
        if (shouldRelease && connection) {
            connection.release();
        }
    }
};

/**
 * Format datetime sang dd/MM/yyyy HH:mm
 * @param {Date|string} date
 * @returns {string}
 */
const formatDateTime = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ============================================================
// Public API
// ============================================================

/**
 * Validate định dạng năm học
 * @param {string} namHoc
 * @returns {boolean} true nếu khớp pattern "YYYY - YYYY"
 */
const validateNamHocFormat = (namHoc) => {
    if (!namHoc || typeof namHoc !== "string") return false;
    return /^\d{4}\s-\s\d{4}$/.test(namHoc);
};

/**
 * Kiểm tra năm học đã bị khóa chưa
 * @param {string} namHoc - Năm học cần kiểm tra (e.g. "2025 - 2026")
 * @returns {Promise<boolean>} true nếu đã khóa
 */
const isLocked = async (namHoc) => {
    return await withConnection(null, async (connection) => {
        const record = await dataLockRepo.getLockRecord(connection, namHoc);
        return record !== null;
    });
};

/**
 * Lấy trạng thái khóa chi tiết
 * @param {string} namHoc
 * @returns {Promise<{locked: boolean, lockInfo: object|null}>}
 */
const getLockStatus = async (namHoc) => {
    return await withConnection(null, async (connection) => {
        const record = await dataLockRepo.getLockRecordWithUserName(connection, namHoc);

        if (!record) {
            return { locked: false, lockInfo: null };
        }

        const lockInfo = {
            ngay_khoa: formatDateTime(record.ngay_khoa),
            nguoi_khoa: record.nguoi_khoa || "Không xác định",
            ghi_chu: record.ghi_chu || null,
        };

        return { locked: true, lockInfo };
    });
};

/**
 * Kiểm tra điều kiện tiên quyết (duyệt 2 cấp trên 3 bảng)
 * @param {string} namHoc
 * @returns {Promise<{passed: boolean, errors?: Array}>}
 */
const checkPrerequisites = async (namHoc) => {
    return await withConnection(null, async (connection) => {
        const results = await dataLockRepo.getUnapprovedCounts(connection, namHoc);

        const errors = [];
        for (const item of results) {
            // Bảng có 0 bản ghi → coi là đạt
            if (item.total === 0) continue;
            // Có bản ghi chưa duyệt → lỗi
            if (item.unapproved > 0) {
                errors.push({
                    table: item.table,
                    tableName: item.tableName,
                    total: item.total,
                    unapproved: item.unapproved,
                });
            }
        }

        if (errors.length > 0) {
            return { passed: false, errors };
        }
        return { passed: true };
    });
};

/**
 * Thực hiện khóa dữ liệu + lưu snapshot toàn trường.
 * Đây là hàm chính, thực hiện trong 1 Transaction ACID:
 *   Step 1: Validate (format, tồn tại năm học, chưa khóa, prerequisites)
 *   Step 2: Tính toán SDO cho toàn bộ giảng viên
 *   Step 3: BEGIN TRANSACTION
 *     3a. INSERT bản ghi khóa (vg_khoa_du_lieu)
 *     3b. Deactivate snapshot cũ (nếu re-lock)
 *     3c. Bulk INSERT snapshot mới (vg_so_tiet_tong_hop)
 *   Step 4: COMMIT
 *
 * @param {string} namHoc - Năm học cần khóa
 * @param {number} userId - ID người thực hiện khóa
 * @param {string|null} ghiChu - Ghi chú tùy chọn
 * @returns {Promise<{success: boolean, message?: string, errors?: Array, stats?: object}>}
 */
const lockData = async (namHoc, userId, ghiChu) => {
    // === Step 1: Validate ===

    // 1a. Format năm học
    if (!validateNamHocFormat(namHoc)) {
        return {
            success: false,
            message: "Định dạng năm học không hợp lệ. Yêu cầu: YYYY - YYYY",
        };
    }

    // Lấy connection để validate (chưa cần transaction)
    const connection = await createPoolConnection();
    try {
        // 1b. Kiểm tra năm học tồn tại trong DB
        const exists = await dataLockRepo.checkNamHocExists(connection, namHoc);
        if (!exists) {
            return {
                success: false,
                message: `Năm học ${namHoc} không tồn tại trong hệ thống`,
            };
        }

        // --- BUG #15 fix: Bắt đầu transaction + SELECT ... FOR UPDATE ---
        // Trước đây chỉ SELECT thường → 2 request đồng thời có thể cùng pass check
        // → cả 2 cùng INSERT → 1 fail với ER_DUP_ENTRY (đã có fallback catch)
        // Giờ dùng FOR UPDATE để khóa row ngay khi SELECT, request khác phải đợi.
        await connection.beginTransaction();

        const [lockRows] = await connection.query(
            `SELECT id FROM vg_khoa_du_lieu WHERE nam_hoc = ? FOR UPDATE`,
            [namHoc]
        );
        if (lockRows.length > 0) {
            await connection.rollback();
            return {
                success: false,
                message: "Dữ liệu năm học này đã được khóa",
            };
        }

        // 1d. Kiểm tra prerequisites: duyệt 2 cấp trên 3 bảng
        const prerequisiteResult = await dataLockRepo.getUnapprovedCounts(connection, namHoc);
        const errors = [];
        for (const item of prerequisiteResult) {
            if (item.total === 0) continue;
            if (item.unapproved > 0) {
                errors.push({
                    table: item.table,
                    tableName: item.tableName,
                    total: item.total,
                    unapproved: item.unapproved,
                });
            }
        }
        if (errors.length > 0) {
            await connection.rollback();
            return {
                success: false,
                message: "Chưa đủ điều kiện khóa",
                errors,
            };
        }

        // 1e. Kiểm tra tất cả khoa đã duyệt tổng hợp
        const allApproved = await duyetTongHopRepo.isAllKhoaApproved(connection, namHoc);
        if (!allApproved) {
            const { totalKhoa, approvedKhoa } = await duyetTongHopRepo.getApprovalSummary(connection, namHoc);
            await connection.rollback();
            return {
                success: false,
                message: `Chưa đủ điều kiện khóa: mới ${approvedKhoa}/${totalKhoa} khoa được duyệt tổng hợp`,
            };
        }

        // === Step 2: Tính toán SDO cho toàn bộ giảng viên ===
        // getCollectionSDODetail tự quản lý connection riêng (withConnection nội bộ)
        // Gọi với khoa = 'ALL' để lấy toàn trường
        console.info(`[dataLock] Bắt đầu tính toán SDO toàn trường cho ${namHoc}...`);
        const startTime = Date.now();
        const sdoList = await tongHopService.getCollectionSDODetail(namHoc, "ALL");
        const computeTime = Date.now() - startTime;
        console.info(`[dataLock] Tính toán xong: ${sdoList.length} giảng viên trong ${computeTime}ms`);

        if (!sdoList || sdoList.length === 0) {
            await connection.rollback();
            return {
                success: false,
                message: "Không tìm thấy dữ liệu giảng viên nào để chốt",
            };
        }

        // === Step 3: Transaction đã bắt đầu ở BUG #15 fix (SELECT FOR UPDATE), chỉ cần commit ===
        try {
            // 3a. Insert bản ghi khóa
            await dataLockRepo.insertLockRecord(connection, { namHoc, userId, ghiChu });

            // 3b + 3c. Deactivate cũ + Bulk insert snapshot mới
            const snapshotResult = await snapshotRepo.saveSnapshot(
                connection, namHoc, sdoList, userId, ghiChu
            );

            // === Step 4: COMMIT ===
            await connection.commit();

            console.info(`[dataLock] Khóa thành công: ${namHoc}, version=${snapshotResult.version}, rows=${snapshotResult.affectedRows}`);

            return {
                success: true,
                message: "Khóa dữ liệu và lưu snapshot thành công",
                stats: {
                    version: snapshotResult.version,
                    totalGV: snapshotResult.affectedRows,
                    computeTimeMs: computeTime,
                },
            };
        } catch (txError) {
            await connection.rollback();
            console.error("[dataLock] Transaction failed, rolled back:", txError);

            // Xử lý race condition: MySQL error code 1062 (duplicate key)
            if (txError.code === "ER_DUP_ENTRY" || txError.errno === 1062) {
                return {
                    success: false,
                    message: "Dữ liệu năm học này đã được khóa",
                };
            }

            throw txError;
        }
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    validateNamHocFormat,
    isLocked,
    getLockStatus,
    checkPrerequisites,
    lockData,
};
