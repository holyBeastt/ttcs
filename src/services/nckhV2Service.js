/**
 * NCKH V2 Service
 * Shared logic cho tất cả loại NCKH V2
 * Date: 2026-01-16
 */

const createPoolConnection = require("../config/databasePool");

// =====================================================
// CÔNG THỨC TÍNH TIẾT MỚI V2
// =====================================================

/**
 * Quy đổi số tiết theo công thức v2
 * @param {number} T - Tổng số tiết chuẩn
 * @param {number} tongSoTacGia - Số người tham gia (bao gồm cả chủ nhiệm)
 * @param {number} soDongChuNhiem - Số đồng chủ nhiệm (default: 1)
 * @param {number} soNamThucHien - Số năm thực hiện (default: 1)
 * @returns {Object} { chuNhiem, thanhVien } - Số tiết cho từng vai trò
 */
const quyDoiSoTietV2 = (T, tongSoTacGia, soDongChuNhiem = 1, soNamThucHien = 1) => {
    let chuNhiem = 0;
    let thanhVien = 0;

    if (tongSoTacGia === 1) {
        // Chỉ có 1 người (chủ nhiệm)
        chuNhiem = T;
        thanhVien = 0;
    } else if (tongSoTacGia === 2) {
        // 2 người: CN = 2T/3, TV = T/3
        chuNhiem = (2 * T) / 3;
        thanhVien = T / 3;
    } else if (tongSoTacGia === 3) {
        // 3 người: CN = T/2, mỗi TV = T/4
        chuNhiem = T / 2;
        thanhVien = T / 4;
    } else {
        // >3 người: CN = T/3 + (2T/3)/n, mỗi TV = (2T/3)/n
        const phanChia = (2 * T / 3) / tongSoTacGia;
        chuNhiem = T / 3 + phanChia;
        thanhVien = phanChia;
    }

    // Chia cho số đồng chủ nhiệm nếu có
    chuNhiem = chuNhiem / soDongChuNhiem;

    // Chia cho số năm thực hiện
    chuNhiem = chuNhiem / soNamThucHien;
    thanhVien = thanhVien / soNamThucHien;

    return {
        chuNhiem: Math.round(chuNhiem * 100) / 100,
        thanhVien: Math.round(thanhVien * 100) / 100
    };
};

// =====================================================
// HÀM TIỆN ÍCH
// =====================================================

/**
 * Tách tên và đơn vị từ chuỗi "Nguyễn Văn A - Khoa CNTT"
 */
const extractNameAndUnit = (fullName) => {
    if (fullName && fullName.includes(" - ")) {
        const [name, unit] = fullName.split(" - ");
        return { name: name.trim(), unit: unit.trim() };
    }
    return { name: fullName ? fullName.trim() : "", unit: "" };
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

// =====================================================
// DATABASE HELPERS
// =====================================================

/**
 * Lấy số tiết chuẩn từ bảng quydinhsogionckh
 * @param {string} fieldName - Tên field để query (CapDeTaiDuAn, LoaiSangKien, ...)
 * @param {string} fieldValue - Giá trị của field
 * @param {string} MaBang - Mã bảng (detaiduan, sangkien, ...)
 * @returns {number} Số tiết chuẩn
 */
const getSoTietChuan = async (fieldName, fieldValue, MaBang) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const query = `SELECT SoGio FROM quydinhsogionckh WHERE ${fieldName} = ? AND MaBang = ?`;
        const [rows] = await connection.execute(query, [fieldValue, MaBang]);

        if (rows.length === 0) {
            throw new Error(`Không tìm thấy quy định số tiết cho ${fieldName} = "${fieldValue}"`);
        }

        return parseFloat(rows[0].SoGio) || 0;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Format danh sách người với số tiết
 * @param {string|Array} members - Danh sách thành viên
 * @param {number} tiet - Số tiết cho mỗi người
 * @returns {string} Chuỗi đã format
 */
const formatMembersWithTiet = (members, tiet) => {
    if (!members) return "";

    const memberList = Array.isArray(members) ? members : [members];

    return memberList
        .map((member) => {
            const { name, unit } = extractNameAndUnit(member);
            if (unit) {
                return `${name} (${unit} - ${formatHours(tiet)})`;
            } else {
                return `${name} (${formatHours(tiet)})`;
            }
        })
        .join(", ");
};

// =====================================================
// GET KHOA BY NAME
// =====================================================

/**
 * Lấy Khoa (MaPhongBan) từ bảng nhanvien dựa trên TenNhanVien
 * @param {string} tenNhanVien - Tên nhân viên cần tìm
 * @returns {string|null} Mã phòng ban (Khoa) hoặc null nếu không tìm thấy
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

// =====================================================
// BUILD KHOA FILTER CLAUSE
// =====================================================

/**
 * Build WHERE clause để lọc theo Khoa trong các cột Chủ nhiệm/Tác giả và Thành viên
 * Format dữ liệu: "Tên (Khoa - Số tiết)" -> tìm pattern "(Khoa -"
 * @param {string} khoa - Mã khoa cần lọc
 * @param {string} chuNhiemColumn - Tên cột chủ nhiệm/tác giả chính (ChuNhiem, TacGia, TacGiaChinh, ThanhVienHoiDong)
 * @param {string|null} thanhVienColumn - Tên cột danh sách thành viên (DanhSachThanhVien, DongChuBien, hoặc null)
 * @returns {Object} { whereClause, params }
 */
const buildKhoaFilterClause = (khoa, chuNhiemColumn, thanhVienColumn = 'DanhSachThanhVien') => {
    if (khoa === 'ALL') {
        return { whereClause: '', params: [] };
    }

    // Tìm pattern "(Khoa -" trong các cột
    const khoaPattern = `(${khoa} -`;

    if (thanhVienColumn) {
        return {
            whereClause: ` AND (${chuNhiemColumn} LIKE ? OR ${thanhVienColumn} LIKE ?)`,
            params: [`%${khoaPattern}%`, `%${khoaPattern}%`]
        };
    } else {
        return {
            whereClause: ` AND ${chuNhiemColumn} LIKE ?`,
            params: [`%${khoaPattern}%`]
        };
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Công thức tính tiết
    quyDoiSoTietV2,

    // Helpers
    extractNameAndUnit,
    formatHours,
    convertDateFormat,
    formatMembersWithTiet,

    // Database helpers
    getSoTietChuan,
    getKhoaByName,
    buildKhoaFilterClause
};
