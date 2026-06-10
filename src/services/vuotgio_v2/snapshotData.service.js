/**
 * VUOT GIO V2 - Snapshot Data Service
 * Service trung gian đọc dữ liệu từ bảng snapshot (vg_so_tiet_tong_hop)
 * thay vì tính toán on-the-fly.
 *
 * Quy tắc:
 *   - Thống kê, Xuất file, Preview tổng hợp → BẮT BUỘC dùng snapshot (năm đã khóa)
 *   - Nếu năm chưa khóa → throw lỗi rõ ràng
 *
 * Cấu trúc trả về tương thích 100% với output của tongHopService.getCollectionSDODetail,
 * vì cột chi_tiet chính là JSON.stringify(sdo) lúc snapshot.
 */

const createPoolConnection = require("../../config/databasePool");
const snapshotRepo = require("../../repositories/vuotgio_v2/soTietTongHop.repo");
const dataLockRepo = require("../../repositories/vuotgio_v2/dataLock.repo");

// ============================================================
// Helper
// ============================================================

const withConnection = async (callback) => {
    const connection = await createPoolConnection();
    try {
        return await callback(connection);
    } finally {
        connection.release();
    }
};

/**
 * Parse cột chi_tiet (JSON string hoặc object do MySQL driver tự parse)
 * @param {string|object} chiTiet
 * @returns {object|null}
 */
const parseChiTiet = (chiTiet) => {
    if (!chiTiet) return null;
    if (typeof chiTiet === "object") return chiTiet;
    try {
        return JSON.parse(chiTiet);
    } catch (e) {
        console.warn("[snapshotData] Failed to parse chi_tiet JSON:", e.message);
        return null;
    }
};

// ============================================================
// Public API
// ============================================================

/**
 * Kiểm tra năm học đã khóa chưa. Nếu chưa khóa → throw Error.
 * @param {Connection} connection
 * @param {string} namHoc
 * @throws {Error} nếu chưa khóa
 */
const requireLocked = async (connection, namHoc) => {
    const lockRecord = await dataLockRepo.getLockRecord(connection, namHoc);
    if (!lockRecord) {
        const err = new Error(
            "Dữ liệu năm học này chưa được lưu (khóa). Vui lòng lưu dữ liệu trước khi xem thống kê / xuất file."
        );
        err.statusCode = 403;
        throw err;
    }
    return lockRecord;
};

/**
 * Lấy toàn bộ SDO đã snapshot cho 1 năm học (tương đương getCollectionSDODetail).
 * Parse cột chi_tiet JSON thành object SDO đầy đủ.
 *
 * @param {string} namHoc
 * @param {string} [khoa] - Lọc theo khoa (optional). 'ALL' hoặc undefined = toàn trường.
 * @returns {Promise<Array<object>>} Danh sách SDO objects (giống output tongHopService)
 * @throws {Error} nếu năm chưa khóa hoặc không có snapshot
 */
const getSnapshotSDOList = async (namHoc, khoa) => {
    return withConnection(async (connection) => {
        // 1. Kiểm tra bắt buộc đã khóa
        await requireLocked(connection, namHoc);

        // 2. Đọc snapshot
        const rows = await snapshotRepo.getLatestSnapshot(connection, namHoc);

        if (!rows || rows.length === 0) {
            throw new Error("Năm học đã khóa nhưng không tìm thấy dữ liệu snapshot. Vui lòng liên hệ quản trị viên.");
        }

        // 3. Parse chi_tiet → SDO object
        let sdoList = rows.map(row => {
            const sdo = parseChiTiet(row.chi_tiet);
            if (!sdo) {
                // Fallback: dùng các cột DB trực tiếp (không có raw/tableF/breakdown)
                return {
                    id_User: row.id_User,
                    nam_hoc: row.nam_hoc,
                    dinhMucChuan: Number(row.so_tiet_dinh_muc) || 0,
                    phanTramMienGiam: Number(row.phan_tram_mien_giam) || 0,
                    mienGiam: Number(row.so_tiet_mien_giam) || 0,
                    tongThucHien: Number(row.tong_so_tiet_giang_day) || 0,
                    soTietNCKH: Number(row.tong_so_tiet_nckh) || 0,
                    thieuNCKH: Number(row.no_nckh) || 0,
                    tongVuot: Number(row.vuot_thuc_te) || 0,
                    thanhToan: Number(row.vuot_thanh_toan) || 0,
                    _snapshotFallback: true,
                };
            }
            // Đảm bảo có thông tin isKhoa để group các phòng ban
            if (row.isKhoa !== undefined) {
                sdo.isKhoa = row.isKhoa;
            }
            return sdo;
        });

        // 4. Lọc theo khoa nếu cần
        const NON_KHOA_GROUP_CODE = "BGĐ&PHONG";
        if (khoa && khoa !== "ALL") {
            if (khoa === NON_KHOA_GROUP_CODE) {
                sdoList = sdoList.filter(sdo => Number(sdo.isKhoa) === 0);
            } else {
                sdoList = sdoList.filter(sdo => sdo.maKhoa === khoa || sdo.khoa === khoa);
            }
        }

        console.info(`[snapshotData] Loaded ${sdoList.length} SDOs from snapshot for ${namHoc}${khoa && khoa !== 'ALL' ? ` (khoa=${khoa})` : ''}`);

        // Gắn thêm metadata từ row đầu tiên (tất cả các row trong cùng 1 snapshot đều có metadata giống nhau)
        if (sdoList.length > 0 && rows.length > 0) {
            sdoList.metadata = {
                ngay_chot: rows[0].ngay_chot,
                nguoi_chot_id: rows[0].nguoi_chot_id,
                nguoi_chot_name: rows[0].nguoi_chot_name
            };
        }

        return sdoList;
    });
};

/**
 * Lấy SDO snapshot cho 1 giảng viên cụ thể.
 * Dùng cho preview/chi tiết cá nhân từ dữ liệu đã chốt.
 *
 * @param {string} namHoc
 * @param {number|string} idUser
 * @returns {Promise<object|null>} SDO object hoặc null
 * @throws {Error} nếu năm chưa khóa
 */
const getSnapshotSDOByUser = async (namHoc, idUser) => {
    return withConnection(async (connection) => {
        await requireLocked(connection, namHoc);

        const row = await snapshotRepo.getLatestByUser(connection, namHoc, Number(idUser));
        if (!row) return null;

        const sdo = parseChiTiet(row.chi_tiet);
        return sdo || null;
    });
};

/**
 * Kiểm tra năm học đã khóa chưa (không throw, trả boolean).
 * Dùng cho logic conditional (hiển thị nút, ẩn/hiện UI).
 *
 * @param {string} namHoc
 * @returns {Promise<boolean>}
 */
const isYearLocked = async (namHoc) => {
    return withConnection(async (connection) => {
        const record = await dataLockRepo.getLockRecord(connection, namHoc);
        return record !== null;
    });
};

module.exports = {
    getSnapshotSDOList,
    getSnapshotSDOByUser,
    isYearLocked,
    requireLocked,
};
