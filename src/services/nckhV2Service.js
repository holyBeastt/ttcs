/**
 * NCKH V2 Service - Unified Version
 * Shared logic cho tất cả loại NCKH V2 với bảng hợp nhất nckh_chung
 * Date: 2026-01-20
 * Refactored for unified database schema
 */

const createPoolConnection = require("../config/databasePool");

// =====================================================
// CONSTANTS - LOẠI NCKH
// =====================================================

const NCKH_TYPES = {
    DETAI_DUAN: 'DETAI_DUAN',
    BAIBAO: 'BAIBAO',
    SACHGIAOTRINH: 'SACHGIAOTRINH',
    GIAITHUONG: 'GIAITHUONG',
    SANGKIEN: 'SANGKIEN',
    DEXUAT: 'DEXUAT',
    HUONGDAN: 'HUONGDAN',
    HOIDONG: 'HOIDONG'
};

// Mapping từ route/tab name sang NCKH type
const ROUTE_TO_TYPE = {
    'detaiduan': NCKH_TYPES.DETAI_DUAN,
    'de-tai-du-an': NCKH_TYPES.DETAI_DUAN,
    'baibaokhoahoc': NCKH_TYPES.BAIBAO,
    'bai-bao-khoa-hoc': NCKH_TYPES.BAIBAO,
    'sachgiaotrinh': NCKH_TYPES.SACHGIAOTRINH,
    'sach-giao-trinh': NCKH_TYPES.SACHGIAOTRINH,
    'giaithuong': NCKH_TYPES.GIAITHUONG,
    'giai-thuong': NCKH_TYPES.GIAITHUONG,
    'sangkien': NCKH_TYPES.SANGKIEN,
    'sang-kien': NCKH_TYPES.SANGKIEN,
    'dexuat': NCKH_TYPES.DEXUAT,
    'de-xuat-nghien-cuu': NCKH_TYPES.DEXUAT,
    'huongdansvnckh': NCKH_TYPES.HUONGDAN,
    'huong-dan-sv-nckh': NCKH_TYPES.HUONGDAN,
    'hoidong': NCKH_TYPES.HOIDONG,
    'thanh-vien-hoi-dong': NCKH_TYPES.HOIDONG
};

// Display names cho từng loại NCKH
const NCKH_DISPLAY_NAMES = {
    'DETAI_DUAN': 'Đề tài, dự án',
    'BAIBAO': 'Bài báo khoa học',
    'SACHGIAOTRINH': 'Sách và giáo trình',
    'GIAITHUONG': 'Bằng sáng chế, giải thưởng',
    'SANGKIEN': 'Sáng kiến',
    'DEXUAT': 'Đề xuất nghiên cứu',
    'HUONGDAN': 'Hướng dẫn SV NCKH',
    'HOIDONG': 'Thành viên hội đồng'
};

// =====================================================
// CÔNG THỨC TÍNH TIẾT V2
// =====================================================

/**
 * Quy đổi số tiết theo công thức v2 (Standard - có phân biệt tác giả chính/thành viên)
 * @param {number} T - Tổng số tiết chuẩn
 * @param {number} tongSoTacGia - Số người tham gia (bao gồm cả chủ nhiệm)
 * @param {number} soDongTacGia - Số đồng chủ nhiệm/tác giả chính (default: 1)
 * @param {number} soNamThucHien - Số năm thực hiện (default: 1)
 * @returns {Object} { tacGiaChinh, thanhVien } - Số tiết cho từng vai trò
 */
const quyDoiSoTietV2 = (T, tongSoTacGia, soDongTacGia = 1, soNamThucHien = 1) => {
    let tacGiaChinh = 0;
    let thanhVien = 0;

    if (tongSoTacGia === 1) {
        // Chỉ có 1 người (tác giả chính)
        tacGiaChinh = T;
        thanhVien = 0;
    } else if (tongSoTacGia === 2) {
        // 2 người: TG Chính = 2T/3, TV = T/3
        tacGiaChinh = (2 * T) / 3;
        thanhVien = T / 3;
    } else if (tongSoTacGia === 3) {
        // 3 người: TG Chính = T/2, mỗi TV = T/4
        tacGiaChinh = T / 2;
        thanhVien = T / 4;
    } else {
        // >3 người: TG Chính = T/3 + (2T/3)/n, mỗi TV = (2T/3)/n
        const phanChia = (2 * T / 3) / tongSoTacGia;
        tacGiaChinh = T / 3 + phanChia;
        thanhVien = phanChia;
    }

    // Chia cho số đồng tác giả chính nếu có
    tacGiaChinh = tacGiaChinh / soDongTacGia;

    // Chia cho số năm thực hiện
    tacGiaChinh = tacGiaChinh / soNamThucHien;
    thanhVien = thanhVien / soNamThucHien;

    return {
        tacGiaChinh: Math.round(tacGiaChinh * 100) / 100,
        thanhVien: Math.round(thanhVien * 100) / 100
    };
};

/**
 * Quy đổi số tiết chia đều (Equal - dùng cho Hướng dẫn SV, Đề xuất)
 * @param {number} T - Tổng số tiết chuẩn
 * @param {number} tongSoNguoi - Tổng số người tham gia
 * @param {number} soNamThucHien - Số năm thực hiện (default: 1)
 * @returns {number} Số tiết cho mỗi người
 */
const quyDoiSoTietChiaDeu = (T, tongSoNguoi, soNamThucHien = 1) => {
    if (tongSoNguoi <= 0) return 0;
    const tietMoiNguoi = T / tongSoNguoi / soNamThucHien;
    return Math.round(tietMoiNguoi * 100) / 100;
};

/**
 * Quy đổi số tiết cố định (Fixed - dùng cho Hội đồng - mỗi người nhận đủ)
 * @param {number} T - Số tiết chuẩn
 * @returns {number} Số tiết (không chia)
 */
const quyDoiSoTietCoDinh = (T) => {
    return Math.round(T * 100) / 100;
};

// =====================================================
// HÀM TIỆN ÍCH
// =====================================================

/**
 * Tách tên và đơn vị từ chuỗi "Nguyễn Văn A - Khoa CNTT"
 */
const extractNameAndUnit = (fullName) => {
    // Đảm bảo fullName là string
    if (fullName === null || fullName === undefined) {
        return { name: "", unit: "" };
    }
    
    // Chuyển đổi sang string nếu không phải string
    const strName = typeof fullName === 'string' ? fullName : String(fullName);
    
    if (strName.includes(" - ")) {
        const [name, unit] = strName.split(" - ");
        return { name: name.trim(), unit: unit ? unit.trim() : "" };
    }
    return { name: strName.trim(), unit: "" };
};

/**
 * Format số tiết thành chuỗi 2 chữ số thập phân
 */
const formatHours = (num) => num.toFixed(2).replace(/,/g, ".");

/**
 * Convert định dạng ngày từ dd/mm/yyyy sang yyyy-mm-dd
 */
const convertDateFormat = (dateStr) => {
    if (!dateStr) return null;

    // Nếu là Date object, chuyển sang ISO string
    if (dateStr instanceof Date) {
        return dateStr.toISOString().split("T")[0];
    }

    // Chuyển sang string nếu chưa phải string
    dateStr = String(dateStr);

    // Nếu là định dạng ISO (từ DB)
    if (dateStr.includes("T")) {
        return dateStr.split("T")[0];
    }

    // Nếu là định dạng dd/mm/yyyy
    if (dateStr.includes("/")) {
        const parts = dateStr.split("/");
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
        }
    }

    return dateStr;
};

/**
 * Lấy Khoa (MaPhongBan) từ bảng nhanvien dựa trên TenNhanVien
 */
const getKhoaByName = async (tenNhanVien) => {
    if (!tenNhanVien) return null;

    let connection;
    try {
        connection = await createPoolConnection();

        const query = `SELECT MaPhongBan FROM nhanvien WHERE TenNhanVien = ? LIMIT 1`;
        const [rows] = await connection.execute(query, [tenNhanVien.trim()]);

        if (rows.length > 0 && rows[0].MaPhongBan) {
            return rows[0].MaPhongBan;
        }
        return null;
    } catch (error) {
        console.error("Lỗi khi lấy Khoa từ tên nhân viên:", error);
        return null;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Build WHERE clause để lọc theo Khoa
 * Format dữ liệu: "Tên (Khoa - Số tiết)" -> tìm pattern "(Khoa -"
 */
const buildKhoaFilterClause = (khoa) => {
    if (khoa === 'ALL') {
        return { whereClause: '', params: [] };
    }

    // Tìm pattern "(Khoa -" trong các cột TacGiaChinh và DanhSachThanhVien
    const khoaPattern = `(${khoa} -`;

    return {
        whereClause: ` AND (TacGiaChinh LIKE ? OR DanhSachThanhVien LIKE ?)`,
        params: [`%${khoaPattern}%`, `%${khoaPattern}%`]
    };
};

// =====================================================
// DATABASE HELPERS - BẢNG MỚI nckh_quydinhsogio
// =====================================================

/**
 * Lấy số tiết chuẩn từ bảng nckh_quydinhsogio (BẢNG MỚI)
 * @param {string} loaiNCKH - Loại NCKH (DETAI_DUAN, BAIBAO, ...)
 * @param {string} phanLoai - Phân loại cụ thể (cấp đề tài, loại tạp chí, ...)
 * @returns {number} Số tiết chuẩn
 */
const getSoTietChuanV2 = async (loaiNCKH, phanLoai) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const query = `
            SELECT SoGio FROM nckh_quydinhsogio 
            WHERE LoaiNCKH = ? AND PhanLoai = ? AND IsActive = 1
        `;
        const [rows] = await connection.execute(query, [loaiNCKH, phanLoai]);

        if (rows.length === 0) {
            throw new Error(`Không tìm thấy quy định số tiết cho ${loaiNCKH} - "${phanLoai}"`);
        }

        return parseFloat(rows[0].SoGio) || 0;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy tất cả quy định số giờ theo loại NCKH
 * @param {string} loaiNCKH - Loại NCKH
 * @returns {Array} Danh sách quy định
 */
const getQuyDinhSoGioByLoai = async (loaiNCKH) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const query = `
            SELECT PhanLoai, SoGio, MoTa 
            FROM nckh_quydinhsogio 
            WHERE LoaiNCKH = ? AND IsActive = 1
            ORDER BY SoGio DESC
        `;
        const [rows] = await connection.execute(query, [loaiNCKH]);
        return rows;
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// CRUD OPERATIONS - BẢNG MỚI nckh_chung
// =====================================================

/**
 * Lưu bản ghi NCKH mới vào bảng nckh_chung
 * @param {string} loaiNCKH - Loại NCKH
 * @param {Object} data - Dữ liệu cần lưu
 * @returns {Object} { success, insertId }
 */
const saveRecord = async (loaiNCKH, data) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const query = `
            INSERT INTO nckh_chung (
                LoaiNCKH, PhanLoai, NamHoc, TenCongTrinh, MaSo,
                TacGiaChinh, DanhSachThanhVien, TongSoTacGia, TongSoThanhVien,
                NgayNghiemThu, NgayQuyetDinh, KetQua, Khoa,
                SoNamThucHien, SoDongTacGia, DaoTaoDuyet, CreatedBy
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            loaiNCKH,
            data.phanLoai || '',
            data.namHoc || '',
            data.tenCongTrinh || '',
            data.maSo || null,
            data.tacGiaChinh || '',
            data.danhSachThanhVien || null,
            data.tongSoTacGia || 0,
            data.tongSoThanhVien || 0,
            convertDateFormat(data.ngayNghiemThu),
            convertDateFormat(data.ngayQuyetDinh),
            data.ketQua || null,
            data.khoa || null,
            data.soNamThucHien || 1,
            data.soDongTacGia || 1,
            0, // DaoTaoDuyet mặc định = 0
            data.createdBy || null
        ];

        const [result] = await connection.execute(query, params);
        return { success: true, insertId: result.insertId };
    } catch (error) {
        console.error(`Lỗi khi lưu bản ghi ${loaiNCKH}:`, error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy danh sách bản ghi theo loại NCKH
 * @param {string} loaiNCKH - Loại NCKH
 * @param {string} namHoc - Năm học
 * @param {string} khoa - Khoa (hoặc 'ALL' để lấy tất cả)
 * @returns {Array} Danh sách bản ghi
 */
const getRecords = async (loaiNCKH, namHoc, khoa) => {
    let connection;
    try {
        connection = await createPoolConnection();

        let query = `SELECT * FROM nckh_chung WHERE LoaiNCKH = ? AND NamHoc = ?`;
        let params = [loaiNCKH, namHoc];

        // Filter theo Khoa nếu không phải ALL
        const { whereClause, params: khoaParams } = buildKhoaFilterClause(khoa);
        query += whereClause;
        params = params.concat(khoaParams);

        query += ` ORDER BY ID DESC`;

        const [results] = await connection.execute(query, params);
        return results;
    } catch (error) {
        console.error(`Lỗi khi lấy dữ liệu ${loaiNCKH}:`, error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy một bản ghi theo ID
 * @param {number} id - ID bản ghi
 * @returns {Object|null} Bản ghi hoặc null
 */
const getRecordById = async (id) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const query = `SELECT * FROM nckh_chung WHERE ID = ?`;
        const [rows] = await connection.execute(query, [id]);

        return rows.length > 0 ? rows[0] : null;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Cập nhật bản ghi
 * @param {number} id - ID bản ghi
 * @param {Object} data - Dữ liệu cập nhật
 * @returns {Object} { success, affectedRows }
 */
const updateRecord = async (id, data) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const query = `
            UPDATE nckh_chung SET
                PhanLoai = ?,
                TenCongTrinh = ?,
                MaSo = ?,
                TacGiaChinh = ?,
                DanhSachThanhVien = ?,
                TongSoTacGia = ?,
                TongSoThanhVien = ?,
                NgayNghiemThu = ?,
                NgayQuyetDinh = ?,
                KetQua = ?,
                Khoa = ?,
                SoNamThucHien = ?,
                SoDongTacGia = ?,
                DaoTaoDuyet = ?
            WHERE ID = ?
        `;

        const params = [
            data.phanLoai || data.PhanLoai,
            data.tenCongTrinh || data.TenCongTrinh,
            data.maSo || data.MaSo || null,
            data.tacGiaChinh || data.TacGiaChinh,
            data.danhSachThanhVien || data.DanhSachThanhVien || null,
            data.tongSoTacGia || data.TongSoTacGia || 0,
            data.tongSoThanhVien || data.TongSoThanhVien || 0,
            convertDateFormat(data.ngayNghiemThu || data.NgayNghiemThu),
            convertDateFormat(data.ngayQuyetDinh || data.NgayQuyetDinh),
            data.ketQua || data.KetQua || null,
            data.khoa || data.Khoa || null,
            data.soNamThucHien || data.SoNamThucHien || 1,
            data.soDongTacGia || data.SoDongTacGia || 1,
            data.daoTaoDuyet !== undefined ? data.daoTaoDuyet : (data.DaoTaoDuyet !== undefined ? data.DaoTaoDuyet : 0),
            id
        ];

        const [result] = await connection.execute(query, params);
        return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
        console.error(`Lỗi khi cập nhật bản ghi ID ${id}:`, error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Xóa bản ghi
 * @param {number} id - ID bản ghi
 * @returns {Object} { success, affectedRows }
 */
const deleteRecord = async (id) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const query = `DELETE FROM nckh_chung WHERE ID = ?`;
        const [result] = await connection.execute(query, [id]);

        return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
        console.error(`Lỗi khi xóa bản ghi ID ${id}:`, error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Cập nhật trạng thái duyệt Đào Tạo
 * Khi bỏ duyệt (daoTaoDuyet=0), cascade bỏ duyệt Khoa
 * @param {number} id - ID bản ghi
 * @param {number} daoTaoDuyet - Trạng thái (0 hoặc 1)
 * @returns {Object} { success }
 */
const updateApprovalStatus = async (id, daoTaoDuyet) => {
    let connection;
    try {
        connection = await createPoolConnection();

        // Nếu bỏ duyệt Đào Tạo, cascade bỏ duyệt Khoa
        if (daoTaoDuyet === 0) {
            const query = `UPDATE nckh_chung SET DaoTaoDuyet = 0, KhoaDuyet = 0 WHERE ID = ?`;
            await connection.execute(query, [id]);
        } else {
            const query = `UPDATE nckh_chung SET DaoTaoDuyet = ? WHERE ID = ?`;
            await connection.execute(query, [daoTaoDuyet, id]);
        }

        return { success: true };
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Cập nhật trạng thái duyệt Khoa
 * @param {number} id - ID bản ghi
 * @param {number} khoaDuyet - Trạng thái (0 hoặc 1)
 * @returns {Object} { success }
 */
const updateKhoaApprovalStatus = async (id, khoaDuyet) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const query = `UPDATE nckh_chung SET KhoaDuyet = ? WHERE ID = ?`;
        console.log(`[updateKhoaApprovalStatus] Executing: ${query} with values [${khoaDuyet}, ${id}]`);
        const [result] = await connection.execute(query, [khoaDuyet, id]);
        console.log(`[updateKhoaApprovalStatus] Result:`, result);
        return { success: true, affectedRows: result.affectedRows };
    } catch (error) {
        console.error(`[updateKhoaApprovalStatus] Error:`, error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// FORMAT FUNCTIONS
// =====================================================

/**
 * Format tác giả với số tiết
 * @param {string} name - Tên tác giả
 * @param {string} unit - Đơn vị (có thể null)
 * @param {number} tiet - Số tiết
 * @returns {string} Chuỗi đã format
 */
const formatAuthorWithHours = (name, unit, tiet) => {
    if (unit) {
        return `${name} (${unit} - ${formatHours(tiet)})`;
    }
    return `${name} (${formatHours(tiet)})`;
};

/**
 * Format danh sách thành viên với số tiết
 * @param {string|Array} members - Danh sách thành viên
 * @param {number} tiet - Số tiết cho mỗi người
 * @returns {string} Chuỗi đã format
 */
const formatMembersWithHours = async (members, tiet) => {
    if (!members) return "";

    const memberList = Array.isArray(members) ? members : [members];
    const formattedMembers = [];

    for (const member of memberList) {
        const { name, unit } = extractNameAndUnit(member);
        if (unit) {
            formattedMembers.push(`${name} (${unit} - ${formatHours(tiet)})`);
        } else {
            // Lookup Khoa cho giảng viên nội bộ
            const khoa = await getKhoaByName(name);
            formattedMembers.push(khoa
                ? `${name} (${khoa} - ${formatHours(tiet)})`
                : `${name} (${formatHours(tiet)})`);
        }
    }

    return formattedMembers.join(", ");
};

// =====================================================
// BACKWARD COMPATIBILITY - Giữ lại hàm getSoTietChuan cũ
// =====================================================

/**
 * [DEPRECATED] Lấy số tiết chuẩn từ bảng quydinhsogionckh cũ
 * Giữ lại để backward compatibility trong quá trình chuyển đổi
 */
const getSoTietChuan = async (fieldName, fieldValue, MaBang) => {
    // Chuyển đổi sang format mới
    const typeMapping = {
        'detaiduan': NCKH_TYPES.DETAI_DUAN,
        'baibaokhoahoc': NCKH_TYPES.BAIBAO,
        'sachvagiaotrinh': NCKH_TYPES.SACHGIAOTRINH,
        'bangsangchevagiaithuong': NCKH_TYPES.GIAITHUONG,
        'sangkien': NCKH_TYPES.SANGKIEN,
        'dexuatnghiencuu': NCKH_TYPES.DEXUAT,
        'huongdansvnckh': NCKH_TYPES.HUONGDAN,
        'thanhvienhoidong': NCKH_TYPES.HOIDONG
    };

    const loaiNCKH = typeMapping[MaBang];
    if (!loaiNCKH) {
        throw new Error(`Không tìm thấy loại NCKH cho MaBang: ${MaBang}`);
    }

    return await getSoTietChuanV2(loaiNCKH, fieldValue);
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Constants
    NCKH_TYPES,
    ROUTE_TO_TYPE,
    NCKH_DISPLAY_NAMES,

    // Công thức tính tiết
    quyDoiSoTietV2,
    quyDoiSoTietChiaDeu,
    quyDoiSoTietCoDinh,

    // Helpers
    extractNameAndUnit,
    formatHours,
    convertDateFormat,
    getKhoaByName,
    buildKhoaFilterClause,

    // Format functions
    formatAuthorWithHours,
    formatMembersWithHours,

    // Database - Quy định số giờ
    getSoTietChuanV2,
    getQuyDinhSoGioByLoai,
    getSoTietChuan, // Backward compatibility

    // CRUD Operations
    saveRecord,
    getRecords,
    getRecordById,
    updateRecord,
    deleteRecord,
    updateApprovalStatus,
    updateKhoaApprovalStatus
};
