/**
 * VUOT GIO V2 - Số Tiết Tổng Hợp Repository
 * Thao tác DB cho bảng vg_so_tiet_tong_hop (Snapshot dữ liệu vượt giờ)
 *
 * Bảng này lưu trữ dữ liệu vượt giờ đã được chốt (snapshot) cho mỗi năm học.
 * Hỗ trợ versioning: mỗi lần khóa lại (re-lock) sẽ tạo version mới,
 * version cũ được giữ lại với is_latest = 0 để đảm bảo audit trail.
 */

const TABLE = "vg_so_tiet_tong_hop";

// ============================================================
// READ
// ============================================================

/**
 * Lấy snapshot mới nhất cho 1 năm học (is_latest = 1)
 * @param {Connection} connection
 * @param {string} namHoc
 * @returns {Promise<Array>} Danh sách bản ghi snapshot
 */
const getLatestSnapshot = async (connection, namHoc) => {
    const [rows] = await connection.execute(
        `SELECT s.id, s.id_User, s.nam_hoc, s.version, s.so_tiet_dinh_muc, s.phan_tram_mien_giam,
                s.so_tiet_mien_giam, s.tong_so_tiet_giang_day, s.tong_so_tiet_nckh,
                s.no_nckh, s.vuot_thuc_te, s.vuot_thanh_toan,
                s.ngay_chot, s.nguoi_chot_id, s.ghi_chu, s.chi_tiet,
                pb.isKhoa, nv_chot.TenNhanVien as nguoi_chot_name
         FROM ${TABLE} s
         LEFT JOIN nhanvien nv ON s.id_User = nv.id_User
         LEFT JOIN phongban pb ON nv.phongban_id = pb.id
         LEFT JOIN nhanvien nv_chot ON s.nguoi_chot_id = nv_chot.id_User
         WHERE s.nam_hoc = ? AND s.is_latest = 1
         ORDER BY pb.isKhoa DESC, pb.TenPhongBan, nv.TenNhanVien`,
        [namHoc]
    );
    return rows;
};

/**
 * Lấy snapshot mới nhất cho 1 giảng viên cụ thể
 * @param {Connection} connection
 * @param {string} namHoc
 * @param {number} idUser
 * @returns {Promise<object|null>}
 */
const getLatestByUser = async (connection, namHoc, idUser) => {
    const [rows] = await connection.execute(
        `SELECT id, id_User, nam_hoc, version, so_tiet_dinh_muc, phan_tram_mien_giam,
                so_tiet_mien_giam, tong_so_tiet_giang_day, tong_so_tiet_nckh,
                no_nckh, vuot_thuc_te, vuot_thanh_toan,
                ngay_chot, nguoi_chot_id, ghi_chu, chi_tiet
         FROM ${TABLE}
         WHERE nam_hoc = ? AND id_User = ? AND is_latest = 1`,
        [namHoc, idUser]
    );
    return rows[0] || null;
};

/**
 * Lấy version hiện tại (cao nhất) cho 1 năm học
 * @param {Connection} connection
 * @param {string} namHoc
 * @returns {Promise<number>} version hiện tại, 0 nếu chưa có
 */
const getCurrentVersion = async (connection, namHoc) => {
    const [rows] = await connection.execute(
        `SELECT COALESCE(MAX(version), 0) AS currentVersion
         FROM ${TABLE}
         WHERE nam_hoc = ?`,
        [namHoc]
    );
    return rows[0].currentVersion;
};

/**
 * Kiểm tra năm học đã có snapshot chưa
 * @param {Connection} connection
 * @param {string} namHoc
 * @returns {Promise<boolean>}
 */
const hasSnapshot = async (connection, namHoc) => {
    const [rows] = await connection.execute(
        `SELECT 1 FROM ${TABLE} WHERE nam_hoc = ? LIMIT 1`,
        [namHoc]
    );
    return rows.length > 0;
};

// ============================================================
// WRITE (trong Transaction)
// ============================================================

/**
 * Vô hiệu hóa tất cả bản ghi cũ (đặt is_latest = 0) cho 1 năm học.
 * Phải được gọi trong 1 Transaction.
 * @param {Connection} connection - Connection đang trong transaction
 * @param {string} namHoc
 * @returns {Promise<object>} Update result (affectedRows)
 */
const deactivateOldSnapshots = async (connection, namHoc) => {
    const [result] = await connection.execute(
        `UPDATE ${TABLE} SET is_latest = 0 WHERE nam_hoc = ? AND is_latest = 1`,
        [namHoc]
    );
    return result;
};

/**
 * Bulk insert snapshot cho toàn trường.
 * Phải được gọi trong 1 Transaction.
 *
 * @param {Connection} connection - Connection đang trong transaction
 * @param {Array<Array>} valuesArray - Mảng 2D, mỗi phần tử là 1 row:
 *   [id_User, nam_hoc, version, is_latest,
 *    so_tiet_dinh_muc, phan_tram_mien_giam, so_tiet_mien_giam,
 *    tong_so_tiet_giang_day, tong_so_tiet_nckh, no_nckh,
 *    vuot_thuc_te, vuot_thanh_toan,
 *    nguoi_chot_id, ghi_chu, chi_tiet_json]
 * @returns {Promise<object>} Insert result (affectedRows)
 */
const bulkInsertSnapshot = async (connection, valuesArray) => {
    if (!valuesArray || valuesArray.length === 0) {
        return { affectedRows: 0 };
    }

    const [result] = await connection.query(
        `INSERT INTO ${TABLE}
         (id_User, nam_hoc, version, is_latest,
          so_tiet_dinh_muc, phan_tram_mien_giam, so_tiet_mien_giam,
          tong_so_tiet_giang_day, tong_so_tiet_nckh, no_nckh,
          vuot_thuc_te, vuot_thanh_toan,
          nguoi_chot_id, ghi_chu, chi_tiet)
         VALUES ?`,
        [valuesArray]
    );
    return result;
};

/**
 * Thực hiện toàn bộ quy trình snapshot trong 1 Transaction:
 *   1. Vô hiệu hóa bản ghi cũ
 *   2. Tính version mới
 *   3. Bulk insert bản ghi mới
 *
 * @param {Connection} connection - Connection đang trong transaction
 * @param {string} namHoc
 * @param {Array<object>} sdoList - Danh sách SDO đã tính toán xong
 * @param {number} nguoiChotId - ID người thực hiện chốt
 * @param {string|null} ghiChu
 * @returns {Promise<{version: number, affectedRows: number}>}
 */
const saveSnapshot = async (connection, namHoc, sdoList, nguoiChotId, ghiChu) => {
    // 1. Vô hiệu hóa snapshot cũ (nếu re-lock)
    await deactivateOldSnapshots(connection, namHoc);

    // 2. Lấy version mới
    const currentVersion = await getCurrentVersion(connection, namHoc);
    const newVersion = currentVersion + 1;

    // 3. Map SDO sang mảng values cho bulk insert
    const valuesArray = sdoList.map(sdo => [
        sdo.id_User,
        namHoc,
        newVersion,
        1, // is_latest
        sdo.dinhMucChuan || 0,
        sdo.phanTramMienGiam || 0,
        sdo.mienGiam || 0,
        sdo.tongThucHien || 0,
        sdo.soTietNCKH || 0,
        sdo.thieuNCKH || 0,
        sdo.tongVuot || 0,
        sdo.thanhToan || 0,
        nguoiChotId,
        ghiChu || null,
        JSON.stringify(sdo)
    ]);

    // 4. Bulk insert
    const result = await bulkInsertSnapshot(connection, valuesArray);

    return { version: newVersion, affectedRows: result.affectedRows };
};

module.exports = {
    // Read
    getLatestSnapshot,
    getLatestByUser,
    getCurrentVersion,
    hasSnapshot,
    // Write (transaction)
    deactivateOldSnapshots,
    bulkInsertSnapshot,
    saveSnapshot,
};
