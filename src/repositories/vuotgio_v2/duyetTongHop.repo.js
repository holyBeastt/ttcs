/**
 * VUOT GIO V2 - Duyệt Tổng Hợp Repository
 * Thao tác DB cho bảng vg_duyet_tong_hop
 */

const TABLE = "vg_duyet_tong_hop";
const LNQC_TABLE = "vg_lop_ngoai_quy_chuan";
const KTHP_TABLE = "vg_coi_cham_ra_de";
const HDTQ_TABLE = "vg_huong_dan_tham_quan_thuc_te";

/**
 * Lấy trạng thái duyệt tổng hợp cho tất cả khoa trong 1 năm học
 */
const getApprovalStatus = async (connection, namHoc) => {
    const [rows] = await connection.execute(
        `SELECT id, nam_hoc, khoa, van_phong_duyet, van_phong_nguoi_duyet_id, van_phong_ngay_duyet, ghi_chu
         FROM ${TABLE}
         WHERE nam_hoc = ?
         ORDER BY khoa`,
        [namHoc]
    );
    return rows;
};

/**
 * Lấy trạng thái duyệt cho 1 khoa cụ thể
 */
const getApprovalByKhoa = async (connection, namHoc, khoa) => {
    const [rows] = await connection.execute(
        `SELECT id, nam_hoc, khoa, van_phong_duyet, van_phong_nguoi_duyet_id, van_phong_ngay_duyet, ghi_chu
         FROM ${TABLE}
         WHERE nam_hoc = ? AND khoa = ?`,
        [namHoc, khoa]
    );
    return rows[0] || null;
};

/**
 * Kiểm tra bản ghi chưa duyệt 2 cấp cho 1 khoa cụ thể trên 3 bảng
 * @returns {Array<{table: string, total: number, unapproved: number}>}
 */
const getUnapprovedCountsByKhoa = async (connection, namHoc, khoa) => {
    const queries = [
        {
            table: "Lớp ngoài quy chuẩn",
            tableName: LNQC_TABLE,
            query: `SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN khoa_duyet = 1 AND dao_tao_duyet = 1 THEN 0 ELSE 1 END) AS unapproved
                     FROM ${LNQC_TABLE}
                     WHERE nam_hoc = ? AND khoa = ?`,
        },
        {
            table: "Coi chấm ra đề",
            tableName: KTHP_TABLE,
            query: `SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN khoa_duyet = 1 AND khao_thi_duyet = 1 THEN 0 ELSE 1 END) AS unapproved
                     FROM ${KTHP_TABLE}
                     WHERE nam_hoc = ? AND khoa = ?`,
        },
        {
            table: "Hướng dẫn tham quan thực tế",
            tableName: HDTQ_TABLE,
            query: `SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN khoa_duyet = 1 AND dao_tao_duyet = 1 THEN 0 ELSE 1 END) AS unapproved
                     FROM ${HDTQ_TABLE}
                     WHERE nam_hoc = ? AND khoa = ?`,
        },
    ];

    const results = await Promise.all(
        queries.map(async ({ table, tableName, query }) => {
            const [rows] = await connection.execute(query, [namHoc, khoa]);
            const { total, unapproved } = rows[0];
            return {
                table,
                tableName,
                total: Number(total) || 0,
                unapproved: Number(unapproved) || 0,
            };
        })
    );

    return results;
};

/**
 * Thêm hoặc cập nhật bản ghi duyệt (UPSERT)
 */
const upsertApproval = async (connection, { namHoc, khoa, userId, ghiChu }) => {
    const [result] = await connection.execute(
        `INSERT INTO ${TABLE} (nam_hoc, khoa, van_phong_duyet, van_phong_nguoi_duyet_id, van_phong_ngay_duyet, ghi_chu)
         VALUES (?, ?, 1, ?, NOW(), ?)
         ON DUPLICATE KEY UPDATE
            van_phong_duyet = 1,
            van_phong_nguoi_duyet_id = VALUES(van_phong_nguoi_duyet_id),
            van_phong_ngay_duyet = NOW(),
            ghi_chu = VALUES(ghi_chu)`,
        [namHoc, khoa, userId, ghiChu || null]
    );
    return result;
};

/**
 * Hủy duyệt 1 khoa (set van_phong_duyet = 0)
 */
const revokeApproval = async (connection, namHoc, khoa) => {
    const [result] = await connection.execute(
        `UPDATE ${TABLE}
         SET van_phong_duyet = 0, van_phong_nguoi_duyet_id = NULL, van_phong_ngay_duyet = NULL
         WHERE nam_hoc = ? AND khoa = ?`,
        [namHoc, khoa]
    );
    return result;
};

/**
 * Đếm số khoa đã duyệt / tổng số khoa cho 1 năm học
 */
const getApprovalSummary = async (connection, namHoc) => {
    // Lấy tổng số khoa trong hệ thống
    const [khoaRows] = await connection.query(
        `SELECT COUNT(*) AS total FROM phongban WHERE isKhoa = 1`
    );
    const totalKhoa = khoaRows[0].total;

    // Lấy số khoa đã duyệt
    const [approvedRows] = await connection.execute(
        `SELECT COUNT(*) AS approved FROM ${TABLE} WHERE nam_hoc = ? AND van_phong_duyet = 1`,
        [namHoc]
    );
    const approvedKhoa = approvedRows[0].approved;

    return { totalKhoa, approvedKhoa };
};

/**
 * Kiểm tra tất cả khoa đã duyệt chưa (điều kiện để khóa)
 */
const isAllKhoaApproved = async (connection, namHoc) => {
    const { totalKhoa, approvedKhoa } = await getApprovalSummary(connection, namHoc);
    return totalKhoa > 0 && approvedKhoa >= totalKhoa;
};

module.exports = {
    getApprovalStatus,
    getApprovalByKhoa,
    getUnapprovedCountsByKhoa,
    upsertApproval,
    revokeApproval,
    getApprovalSummary,
    isAllKhoaApproved,
};
