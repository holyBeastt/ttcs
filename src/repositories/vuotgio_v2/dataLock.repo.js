const LOCK_TABLE = "vg_khoa_du_lieu";
const LNQC_TABLE = "vg_lop_ngoai_quy_chuan";
const KTHP_TABLE = "vg_coi_cham_ra_de";
const HDTQ_TABLE = "vg_huong_dan_tham_quan_thuc_te";
const NAMHOC_TABLE = "namhoc";
const NHANVIEN_TABLE = "nhanvien";

/**
 * Lấy bản ghi khóa theo năm học
 * @param {Connection} connection
 * @param {string} namHoc - Năm học (e.g. "2025 - 2026")
 * @returns {Promise<object|null>} Bản ghi khóa hoặc null
 */
const getLockRecord = async (connection, namHoc) => {
    const [rows] = await connection.execute(
        `SELECT id, nam_hoc, ngay_khoa, nguoi_khoa_id, ghi_chu
         FROM ${LOCK_TABLE}
         WHERE nam_hoc = ?`,
        [namHoc]
    );
    return rows[0] || null;
};

/**
 * Lấy bản ghi khóa kèm tên người khóa (JOIN với bảng nhanvien)
 * @param {Connection} connection
 * @param {string} namHoc
 * @returns {Promise<object|null>} Bản ghi khóa với tên người khóa hoặc null
 */
const getLockRecordWithUserName = async (connection, namHoc) => {
    const [rows] = await connection.execute(
        `SELECT kd.id, kd.nam_hoc, kd.ngay_khoa, kd.nguoi_khoa_id, kd.ghi_chu,
                nv.TenNhanVien AS nguoi_khoa
         FROM ${LOCK_TABLE} kd
         LEFT JOIN ${NHANVIEN_TABLE} nv ON nv.id_User = kd.nguoi_khoa_id
         WHERE kd.nam_hoc = ?`,
        [namHoc]
    );
    return rows[0] || null;
};

/**
 * Thêm bản ghi khóa mới
 * @param {Connection} connection
 * @param {{namHoc: string, userId: number, ghiChu: string|null}} data
 * @returns {Promise<object>} Insert result
 */
const insertLockRecord = async (connection, { namHoc, userId, ghiChu }) => {
    const [result] = await connection.execute(
        `INSERT INTO ${LOCK_TABLE} (nam_hoc, ngay_khoa, nguoi_khoa_id, ghi_chu)
         VALUES (?, NOW(), ?, ?)`,
        [namHoc, userId, ghiChu || null]
    );
    return result;
};

/**
 * Truy vấn số bản ghi chưa duyệt 2 cấp trên 3 bảng song song
 * @param {Connection} connection
 * @param {string} namHoc
 * @returns {Promise<Array<{table: string, total: number, unapproved: number}>>}
 *
 * Điều kiện duyệt 2 cấp:
 * - vg_lop_ngoai_quy_chuan: khoa_duyet = 1 AND dao_tao_duyet = 1
 * - vg_coi_cham_ra_de: khoa_duyet = 1 AND khao_thi_duyet = 1
 * - vg_huong_dan_tham_quan_thuc_te: khoa_duyet = 1 AND dao_tao_duyet = 1
 */
const getUnapprovedCounts = async (connection, namHoc) => {
    const queries = [
        {
            table: "Lớp ngoài quy chuẩn",
            tableName: LNQC_TABLE,
            query: `SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN khoa_duyet = 1 AND dao_tao_duyet = 1 THEN 0 ELSE 1 END) AS unapproved
                     FROM ${LNQC_TABLE}
                     WHERE nam_hoc = ?`,
        },
        {
            table: "Coi chấm ra đề",
            tableName: KTHP_TABLE,
            query: `SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN khoa_duyet = 1 AND khao_thi_duyet = 1 THEN 0 ELSE 1 END) AS unapproved
                     FROM ${KTHP_TABLE}
                     WHERE nam_hoc = ?`,
        },
        {
            table: "Hướng dẫn tham quan thực tế",
            tableName: HDTQ_TABLE,
            query: `SELECT 
                        COUNT(*) AS total,
                        SUM(CASE WHEN khoa_duyet = 1 AND dao_tao_duyet = 1 THEN 0 ELSE 1 END) AS unapproved
                     FROM ${HDTQ_TABLE}
                     WHERE nam_hoc = ?`,
        },
    ];

    const results = await Promise.all(
        queries.map(async ({ table, tableName, query }) => {
            const [rows] = await connection.execute(query, [namHoc]);
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
 * Kiểm tra năm học có tồn tại trong bảng namhoc
 * @param {Connection} connection
 * @param {string} namHoc
 * @returns {Promise<boolean>}
 */
const checkNamHocExists = async (connection, namHoc) => {
    const [rows] = await connection.execute(
        `SELECT NamHoc FROM ${NAMHOC_TABLE} WHERE NamHoc = ?`,
        [namHoc]
    );
    return rows.length > 0;
};

module.exports = {
    LOCK_TABLE,
    getLockRecord,
    getLockRecordWithUserName,
    insertLockRecord,
    getUnapprovedCounts,
    checkNamHocExists,
};
