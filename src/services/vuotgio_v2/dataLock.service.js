/**
 * VUOT GIO V2 - Data Lock Service
 * Service kiểm tra trạng thái khóa và thực thi logic khóa dữ liệu
 */

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/dataLock.repo");

// ============================================================
// In-memory cache với TTL 60 giây
// ============================================================
const CACHE_TTL = 60000; // 60 giây
const lockCache = new Map();

/**
 * Lấy giá trị từ cache nếu chưa hết hạn
 * @param {string} key
 * @returns {object|null}
 */
const getCacheEntry = (key) => {
    const entry = lockCache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) {
        lockCache.delete(key);
        return null;
    }
    return entry;
};

/**
 * Cập nhật cache
 * @param {string} key
 * @param {boolean} locked
 * @param {object|null} lockInfo
 */
const setCacheEntry = (key, locked, lockInfo) => {
    lockCache.set(key, { locked, lockInfo, timestamp: Date.now() });
};

/**
 * Xóa cache cho một năm học (invalidate)
 * @param {string} namHoc
 */
const invalidateCache = (namHoc) => {
    lockCache.delete(namHoc);
};

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
 * Kiểm tra năm học đã bị khóa chưa (sử dụng cache)
 * @param {string} namHoc - Năm học cần kiểm tra (e.g. "2025 - 2026")
 * @returns {Promise<boolean>} true nếu đã khóa
 */
const isLocked = async (namHoc) => {
    // Kiểm tra cache trước
    const cached = getCacheEntry(namHoc);
    if (cached !== null) {
        return cached.locked;
    }

    // Cache miss → query DB
    return await withConnection(null, async (connection) => {
        const record = await repo.getLockRecord(connection, namHoc);
        const locked = record !== null;
        setCacheEntry(namHoc, locked, null);
        return locked;
    });
};

/**
 * Lấy trạng thái khóa chi tiết
 * @param {string} namHoc
 * @returns {Promise<{locked: boolean, lockInfo: object|null}>}
 */
const getLockStatus = async (namHoc) => {
    return await withConnection(null, async (connection) => {
        const record = await repo.getLockRecordWithUserName(connection, namHoc);

        if (!record) {
            setCacheEntry(namHoc, false, null);
            return { locked: false, lockInfo: null };
        }

        const lockInfo = {
            ngay_khoa: formatDateTime(record.ngay_khoa),
            nguoi_khoa: record.nguoi_khoa || "Không xác định",
            ghi_chu: record.ghi_chu || null,
        };

        setCacheEntry(namHoc, true, lockInfo);
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
        const results = await repo.getUnapprovedCounts(connection, namHoc);

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
 * Thực hiện khóa dữ liệu
 * @param {string} namHoc - Năm học cần khóa
 * @param {number} userId - ID người thực hiện khóa
 * @param {string|null} ghiChu - Ghi chú tùy chọn
 * @returns {Promise<{success: boolean, message?: string, errors?: Array}>}
 */
const lockData = async (namHoc, userId, ghiChu) => {
    // 1. Validate format năm học
    if (!validateNamHocFormat(namHoc)) {
        return {
            success: false,
            message: "Định dạng năm học không hợp lệ. Yêu cầu: YYYY - YYYY",
        };
    }

    return await withConnection(null, async (connection) => {
        // 2. Kiểm tra năm học tồn tại trong DB
        const exists = await repo.checkNamHocExists(connection, namHoc);
        if (!exists) {
            return {
                success: false,
                message: `Năm học ${namHoc} không tồn tại trong hệ thống`,
            };
        }

        // 3. Kiểm tra chưa bị khóa
        const existingLock = await repo.getLockRecord(connection, namHoc);
        if (existingLock) {
            return {
                success: false,
                message: "Dữ liệu năm học này đã được khóa",
            };
        }

        // 4. Kiểm tra prerequisites (duyệt 2 cấp)
        const prerequisiteResult = await repo.getUnapprovedCounts(connection, namHoc);
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
            return {
                success: false,
                message: "Chưa đủ điều kiện khóa",
                errors,
            };
        }

        // 4b. Kiểm tra tất cả khoa đã duyệt tổng hợp
        const duyetTongHopRepo = require("../../repositories/vuotgio_v2/duyetTongHop.repo");
        const allApproved = await duyetTongHopRepo.isAllKhoaApproved(connection, namHoc);
        if (!allApproved) {
            const { totalKhoa, approvedKhoa } = await duyetTongHopRepo.getApprovalSummary(connection, namHoc);
            return {
                success: false,
                message: `Chưa đủ điều kiện khóa: mới ${approvedKhoa}/${totalKhoa} khoa được duyệt tổng hợp`,
            };
        }

        // 5. Insert bản ghi khóa
        try {
            await repo.insertLockRecord(connection, { namHoc, userId, ghiChu });
        } catch (error) {
            // Xử lý race condition: MySQL error code 1062 (duplicate key)
            if (error.code === "ER_DUP_ENTRY" || error.errno === 1062) {
                return {
                    success: false,
                    message: "Dữ liệu năm học này đã được khóa",
                };
            }
            throw error;
        }

        // 6. Invalidate cache
        invalidateCache(namHoc);

        return { success: true, message: "Khóa dữ liệu thành công" };
    });
};

module.exports = {
    validateNamHocFormat,
    isLocked,
    getLockStatus,
    checkPrerequisites,
    lockData,
    invalidateCache,
    // Expose for testing
    _cache: lockCache,
    _CACHE_TTL: CACHE_TTL,
};
