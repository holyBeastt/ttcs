/**
 * VUOT GIO V2 - Duyệt Tổng Hợp Service
 * Logic duyệt tổng hợp vượt giờ theo khoa (Văn phòng thực hiện)
 */

const createPoolConnection = require("../../config/databasePool");
const repo = require("../../repositories/vuotgio_v2/duyetTongHop.repo");

const withConnection = async (callback) => {
    const connection = await createPoolConnection();
    try {
        return await callback(connection);
    } finally {
        connection.release();
    }
};

/**
 * Lấy trạng thái duyệt tổng hợp cho tất cả khoa trong 1 năm học
 * Kết hợp danh sách khoa từ phongban với trạng thái duyệt
 */
const getApprovalStatus = async (namHoc) => {
    return await withConnection(async (connection) => {
        // Lấy danh sách tất cả khoa
        const [khoaRows] = await connection.query(
            `SELECT MaPhongBan AS khoa, TenPhongBan AS tenKhoa 
             FROM phongban WHERE isKhoa = 1 ORDER BY MaPhongBan`
        );

        // Lấy trạng thái duyệt đã có
        const approvalRows = await repo.getApprovalStatus(connection, namHoc);
        const approvalMap = new Map(approvalRows.map(r => [r.khoa, r]));

        // Merge: tất cả khoa + trạng thái duyệt
        const result = khoaRows.map(k => {
            const approval = approvalMap.get(k.khoa);
            return {
                khoa: k.khoa,
                tenKhoa: k.tenKhoa,
                van_phong_duyet: approval?.van_phong_duyet || 0,
                van_phong_ngay_duyet: approval?.van_phong_ngay_duyet || null,
                van_phong_nguoi_duyet_id: approval?.van_phong_nguoi_duyet_id || null,
            };
        });

        // Tổng kết
        const totalKhoa = result.length;
        const approvedKhoa = result.filter(r => r.van_phong_duyet === 1).length;

        return { data: result, totalKhoa, approvedKhoa };
    });
};

/**
 * Kiểm tra điều kiện tiên quyết cho 1 khoa
 * Tất cả bản ghi của khoa đó trong 3 bảng phải đã duyệt 2 cấp
 */
const checkPrerequisites = async (namHoc, khoa) => {
    return await withConnection(async (connection) => {
        const results = await repo.getUnapprovedCountsByKhoa(connection, namHoc, khoa);

        const errors = [];
        for (const item of results) {
            if (item.total === 0) continue; // Bảng trống → đạt
            if (item.unapproved > 0) {
                errors.push({
                    table: item.table,
                    tableName: item.tableName,
                    total: item.total,
                    unapproved: item.unapproved,
                });
            }
        }

        return {
            passed: errors.length === 0,
            errors,
        };
    });
};

/**
 * VP duyệt tổng hợp cho 1 khoa
 */
const approveKhoa = async (namHoc, khoa, userId, ghiChu) => {
    return await withConnection(async (connection) => {
        // 1. Kiểm tra điều kiện tiên quyết
        const prerequisiteResults = await repo.getUnapprovedCountsByKhoa(connection, namHoc, khoa);
        const errors = [];
        for (const item of prerequisiteResults) {
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
                message: "Chưa đủ điều kiện duyệt",
                errors,
            };
        }

        // 2. Upsert bản ghi duyệt
        await repo.upsertApproval(connection, { namHoc, khoa, userId, ghiChu });

        return { success: true, message: `Đã duyệt tổng hợp khoa ${khoa}` };
    });
};

/**
 * VP hủy duyệt 1 khoa (chỉ khi chưa khóa toàn năm)
 */
const revokeKhoa = async (namHoc, khoa) => {
    return await withConnection(async (connection) => {
        // Kiểm tra năm học đã khóa chưa
        const dataLockRepo = require("../../repositories/vuotgio_v2/dataLock.repo");
        const lockRecord = await dataLockRepo.getLockRecord(connection, namHoc);
        if (lockRecord) {
            return { success: false, message: "Dữ liệu đã khóa, không thể hủy duyệt" };
        }

        await repo.revokeApproval(connection, namHoc, khoa);
        return { success: true, message: `Đã hủy duyệt khoa ${khoa}` };
    });
};

/**
 * Kiểm tra tất cả khoa đã duyệt chưa (dùng cho điều kiện khóa)
 */
const isAllKhoaApproved = async (namHoc) => {
    return await withConnection(async (connection) => {
        return await repo.isAllKhoaApproved(connection, namHoc);
    });
};

/**
 * Lấy tổng kết duyệt (dùng cho UI badge)
 */
const getApprovalSummary = async (namHoc) => {
    return await withConnection(async (connection) => {
        return await repo.getApprovalSummary(connection, namHoc);
    });
};

module.exports = {
    getApprovalStatus,
    checkPrerequisites,
    approveKhoa,
    revokeKhoa,
    isAllKhoaApproved,
    getApprovalSummary,
};
