/**
 * NCKH V2 Service - Unified Version
 * Shared logic cho tất cả loại NCKH V2 với bảng hợp nhất nckh_chung
 * Date: 2026-01-20
 * Refactored for unified database schema
 */

const createPoolConnection = require("../config/databasePool");

let nckhChungSchemaCache = null;

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
 * Tách tên và đơn vị từ chuỗi
 * Hỗ trợ các format:
 * 1. "Nguyễn Văn A - Đơn vị" (Legacy)
 * 2. "Nguyễn Văn A (Đơn vị - 10.00)" (NCKH V2)
 * 3. "Nguyễn Văn A (10.00)" (NCKH V2)
 */
const extractNameAndUnit = (fullName) => {
    if (!fullName) return { name: "", unit: "" };
    const str = String(fullName).trim();

    // Case 2 & 3: "Name (Unit - Hours)" hoặc "Name (Hours)"
    const nckhMatch = str.match(/^(.+?)\s*\((.+?)\)$/);
    if (nckhMatch) {
        const name = nckhMatch[1].trim();
        const content = nckhMatch[2].trim();

        if (content.includes(" - ")) {
            // "Unit - Hours"
            const parts = content.split(" - ");
            // Phần cuối cùng thường là số tiết, phần còn lại là đơn vị
            const hours = parts.pop();
            const unit = parts.join(" - ").trim();
            
            // Kiểm tra xem phần cuối có phải format số tiết không (x.xx)
            if (/^\d+(\.\d+)?$/.test(hours)) {
                return { name, unit };
            }
            // Nếu không phải số tiết, có thể là legacy "Name (Unit)"
            return { name, unit: content };
        } else {
            // Kiểm tra xem "content" có phải chỉ là số tiết không
            if (/^\d+(\.\d+)?$/.test(content)) {
                return { name, unit: "" };
            }
            // Nếu không phải số tiết, coi như là đơn vị: "Name (Unit)"
            return { name, unit: content };
        }
    }

    // Case 1: "Name - Unit"
    if (str.includes(" - ")) {
        const [name, unit] = str.split(" - ");
        return { name: name.trim(), unit: unit ? unit.trim() : "" };
    }

    return { name: str, unit: "" };
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

const pickExistingColumn = (columnSet, candidates) => {
    for (const candidate of candidates) {
        if (columnSet.has(candidate.toLowerCase())) {
            return candidate;
        }
    }
    return null;
};

const getNckhChungSchemaConfig = async (connection) => {
    if (nckhChungSchemaCache) {
        return nckhChungSchemaCache;
    }

    const [rows] = await connection.execute(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'nckh_chung'
    `);

    const columnSet = new Set(rows.map((r) => String(r.COLUMN_NAME).toLowerCase()));

    const config = {
        idCol: pickExistingColumn(columnSet, ["ID", "id"]),
        loaiCol: pickExistingColumn(columnSet, ["LoaiNCKH", "loai_nckh"]),
        phanLoaiCol: pickExistingColumn(columnSet, ["PhanLoai", "phan_loai"]),
        namHocCol: pickExistingColumn(columnSet, ["NamHoc", "nam_hoc"]),
        tenCongTrinhCol: pickExistingColumn(columnSet, ["TenCongTrinh", "ten_cong_trinh"]),
        maSoCol: pickExistingColumn(columnSet, ["MaSo", "ma_so"]),
        tongSoTietCol: pickExistingColumn(columnSet, ["TongSoTiet", "tong_so_tiet"]),
        khoaCol: pickExistingColumn(columnSet, ["Khoa", "khoa", "khoa_id"]),
        khoaDuyetCol: pickExistingColumn(columnSet, ["KhoaDuyet", "khoa_duyet"]),
        daoTaoDuyetCol: pickExistingColumn(columnSet, ["DaoTaoDuyet", "vien_nc_duyet"]),
        tacGiaChinhCol: pickExistingColumn(columnSet, ["TacGiaChinh", "tac_gia_chinh"]),
        danhSachThanhVienCol: pickExistingColumn(columnSet, ["DanhSachThanhVien", "danh_sach_thanh_vien"]),
        tongSoTacGiaCol: pickExistingColumn(columnSet, ["TongSoTacGia", "tong_so_tac_gia"]),
        tongSoThanhVienCol: pickExistingColumn(columnSet, ["TongSoThanhVien", "tong_so_thanh_vien"]),
        ngayNghiemThuCol: pickExistingColumn(columnSet, ["NgayNghiemThu", "ngay_nghiem_thu"]),
        ngayQuyetDinhCol: pickExistingColumn(columnSet, ["NgayQuyetDinh", "ngay_quyet_dinh"]),
        ketQuaCol: pickExistingColumn(columnSet, ["KetQua", "ket_qua"]),
        soNamThucHienCol: pickExistingColumn(columnSet, ["SoNamThucHien", "so_nam_thuc_hien"]),
        soDongTacGiaCol: pickExistingColumn(columnSet, ["SoDongTacGia", "so_dong_tac_gia"]),
        createdByCol: pickExistingColumn(columnSet, ["CreatedBy", "created_by"]),
    };

    nckhChungSchemaCache = config;
    return config;
};

const buildKhoaFilterClauseBySchema = (khoa, schemaConfig, directKhoaFilter = false) => {
    if (khoa === 'ALL') {
        return { whereClause: '', params: [] };
    }

    if (schemaConfig.khoaCol && (schemaConfig.khoaCol !== 'khoa_id' || directKhoaFilter)) {
        return {
            whereClause: ` AND ${schemaConfig.khoaCol} = ?`,
            params: [khoa],
        };
    }

    if (schemaConfig.tacGiaChinhCol && schemaConfig.danhSachThanhVienCol) {
        const khoaPattern = `(${khoa} -`;
        return {
            whereClause: ` AND (${schemaConfig.tacGiaChinhCol} LIKE ? OR ${schemaConfig.danhSachThanhVienCol} LIKE ?)`,
            params: [`%${khoaPattern}%`, `%${khoaPattern}%`],
        };
    }

    // Fallback an toàn: nếu không đủ cột để lọc theo khoa thì bỏ lọc.
    return { whereClause: '', params: [] };
};

const normalizeLegacyNckhRecord = (row) => {
    if (row.ID === undefined && row.id !== undefined) row.ID = row.id;
    if (row.LoaiNCKH === undefined && row.loai_nckh !== undefined) row.LoaiNCKH = row.loai_nckh;
    if (row.PhanLoai === undefined && row.phan_loai !== undefined) row.PhanLoai = row.phan_loai;
    if (row.NamHoc === undefined && row.nam_hoc !== undefined) row.NamHoc = row.nam_hoc;
    if (row.TenCongTrinh === undefined && row.ten_cong_trinh !== undefined) row.TenCongTrinh = row.ten_cong_trinh;
    if (row.MaSo === undefined && row.ma_so !== undefined) row.MaSo = row.ma_so;
    if (row.TacGiaChinh === undefined && row.tac_gia_chinh !== undefined) row.TacGiaChinh = row.tac_gia_chinh;
    if (row.DanhSachThanhVien === undefined && row.danh_sach_thanh_vien !== undefined) row.DanhSachThanhVien = row.danh_sach_thanh_vien;
    if (row.TongSoTacGia === undefined && row.tong_so_tac_gia !== undefined) row.TongSoTacGia = row.tong_so_tac_gia;
    if (row.TongSoThanhVien === undefined && row.tong_so_thanh_vien !== undefined) row.TongSoThanhVien = row.tong_so_thanh_vien;
    if (row.TongSoTiet === undefined && row.tong_so_tiet !== undefined) row.TongSoTiet = row.tong_so_tiet;
    if (row.NgayNghiemThu === undefined && row.ngay_nghiem_thu !== undefined) row.NgayNghiemThu = row.ngay_nghiem_thu;
    if (row.NgayQuyetDinh === undefined && row.ngay_quyet_dinh !== undefined) row.NgayQuyetDinh = row.ngay_quyet_dinh;
    if (row.KetQua === undefined && row.ket_qua !== undefined) row.KetQua = row.ket_qua;
    if (row.Khoa === undefined && row.khoa !== undefined) row.Khoa = row.khoa;
    if (row.Khoa === undefined && row.khoa_id !== undefined) row.Khoa = row.khoa_id;
    if (row.SoNamThucHien === undefined && row.so_nam_thuc_hien !== undefined) row.SoNamThucHien = row.so_nam_thuc_hien;
    if (row.SoDongTacGia === undefined && row.so_dong_tac_gia !== undefined) row.SoDongTacGia = row.so_dong_tac_gia;
    if (row.KhoaDuyet === undefined && row.khoa_duyet !== undefined) row.KhoaDuyet = row.khoa_duyet;
    if (row.DaoTaoDuyet === undefined && row.vien_nc_duyet !== undefined) row.DaoTaoDuyet = row.vien_nc_duyet;
    if (row.CreatedAt === undefined && row.created_at !== undefined) row.CreatedAt = row.created_at;
    return row;
};

const resolveKhoaValueForSchema = async (connection, khoa, schemaConfig) => {
    if (khoa === undefined || khoa === null || khoa === '' || !schemaConfig.khoaCol) {
        return null;
    }

    if (schemaConfig.khoaCol !== 'khoa_id') {
        return khoa;
    }

    if (!Number.isNaN(Number(khoa)) && String(khoa).trim() !== '') {
        return Number(khoa);
    }

    const [rows] = await connection.execute(
        'SELECT id FROM phongban WHERE MaPhongBan = ? LIMIT 1',
        [khoa]
    );

    return rows.length > 0 ? Number(rows[0].id) : -1;
};

const buildNckhColumnValueMap = (loaiNCKH, data, schemaConfig, khoaValue) => {
    const map = {};

    if (schemaConfig.loaiCol) map[schemaConfig.loaiCol] = loaiNCKH;
    if (schemaConfig.phanLoaiCol) map[schemaConfig.phanLoaiCol] = data.phanLoai || '';
    if (schemaConfig.namHocCol) map[schemaConfig.namHocCol] = data.namHoc || '';
    if (schemaConfig.tenCongTrinhCol) map[schemaConfig.tenCongTrinhCol] = data.tenCongTrinh || '';
    if (schemaConfig.maSoCol) map[schemaConfig.maSoCol] = data.maSo || null;
    if (schemaConfig.tacGiaChinhCol) map[schemaConfig.tacGiaChinhCol] = data.tacGiaChinh || '';
    if (schemaConfig.danhSachThanhVienCol) map[schemaConfig.danhSachThanhVienCol] = data.danhSachThanhVien || null;
    if (schemaConfig.tongSoTacGiaCol) map[schemaConfig.tongSoTacGiaCol] = data.tongSoTacGia || 0;
    if (schemaConfig.tongSoThanhVienCol) map[schemaConfig.tongSoThanhVienCol] = data.tongSoThanhVien || 0;
    if (schemaConfig.tongSoTietCol) map[schemaConfig.tongSoTietCol] = data.tongSoTiet || 0;
    if (schemaConfig.ngayNghiemThuCol) map[schemaConfig.ngayNghiemThuCol] = convertDateFormat(data.ngayNghiemThu);
    if (schemaConfig.ngayQuyetDinhCol) map[schemaConfig.ngayQuyetDinhCol] = convertDateFormat(data.ngayQuyetDinh);
    if (schemaConfig.ketQuaCol) map[schemaConfig.ketQuaCol] = data.ketQua || null;
    if (schemaConfig.khoaCol) map[schemaConfig.khoaCol] = khoaValue;
    if (schemaConfig.soNamThucHienCol) map[schemaConfig.soNamThucHienCol] = data.soNamThucHien || 1;
    if (schemaConfig.soDongTacGiaCol) map[schemaConfig.soDongTacGiaCol] = data.soDongTacGia || 1;
    if (schemaConfig.khoaDuyetCol) map[schemaConfig.khoaDuyetCol] = data.khoaDuyet !== undefined ? data.khoaDuyet : 0;
    if (schemaConfig.daoTaoDuyetCol) map[schemaConfig.daoTaoDuyetCol] = data.daoTaoDuyet !== undefined ? data.daoTaoDuyet : 0;
    if (schemaConfig.createdByCol) map[schemaConfig.createdByCol] = data.createdBy || null;

    return map;
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
            SELECT ID, PhanLoai, SoGio, MoTa, IsActive 
            FROM nckh_quydinhsogio 
            WHERE LoaiNCKH = ?
            ORDER BY SoGio DESC
        `;
        const [rows] = await connection.execute(query, [loaiNCKH]);
        return rows;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy toàn bộ quy định (dành cho Admin)
 * @returns {Array} Danh sách tất cả quy định
 */
const getAllQuyDinhSoGio = async () => {
    let connection;
    try {
        connection = await createPoolConnection();

        const query = `
            SELECT * FROM nckh_quydinhsogio 
            ORDER BY LoaiNCKH, SoGio DESC
        `;
        const [rows] = await connection.execute(query);
        return rows;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lưu mới hoặc cập nhật quy định
 * @param {Object} data - Dữ liệu quy định
 * @returns {Object} { success, id }
 */
const manageQuyDinhSoGio = async (data) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { id, loaiNCKH, phanLoai, soGio, moTa } = data;

        if (id) {
            // Update
            const query = `
                UPDATE nckh_quydinhsogio 
                SET LoaiNCKH = ?, PhanLoai = ?, SoGio = ?, MoTa = ?
                WHERE ID = ?
            `;
            await connection.execute(query, [loaiNCKH, phanLoai, soGio, moTa, id]);
            return { success: true, id };
        } else {
            // Insert
            const query = `
                INSERT INTO nckh_quydinhsogio (LoaiNCKH, PhanLoai, SoGio, MoTa, IsActive)
                VALUES (?, ?, ?, ?, 1)
            `;
            const [result] = await connection.execute(query, [loaiNCKH, phanLoai, soGio, moTa]);
            return { success: true, id: result.insertId };
        }
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Bật/Tắt trạng thái hoạt động của quy định
 * @param {number} id - ID quy định
 * @param {number} isActive - Trạng thái mới (0 hoặc 1)
 * @returns {Object} { success }
 */
const toggleQuyDinhStatus = async (id, isActive) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const query = `UPDATE nckh_quydinhsogio SET IsActive = ? WHERE ID = ?`;
        await connection.execute(query, [isActive, id]);
        return { success: true };
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

        const schemaConfig = await getNckhChungSchemaConfig(connection);
        const khoaValue = await resolveKhoaValueForSchema(connection, data.khoa, schemaConfig);
        const columnValueMap = buildNckhColumnValueMap(loaiNCKH, data, schemaConfig, khoaValue);
        const columns = Object.keys(columnValueMap);

        if (!columns.length) {
            throw new Error('Khong xac dinh duoc cot de luu vao nckh_chung');
        }

        const placeholders = columns.map(() => '?').join(', ');
        const query = `INSERT INTO nckh_chung (${columns.join(', ')}) VALUES (${placeholders})`;
        const params = columns.map((column) => columnValueMap[column]);

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

        const schemaConfig = await getNckhChungSchemaConfig(connection);

        if (!schemaConfig.loaiCol || !schemaConfig.namHocCol || !schemaConfig.idCol) {
            throw new Error("Schema nckh_chung khong hop le: thieu cot loai/nam hoc/id");
        }

        let query = `SELECT * FROM nckh_chung WHERE ${schemaConfig.loaiCol} = ? AND ${schemaConfig.namHocCol} = ?`;
        let params = [loaiNCKH, namHoc];

        // Filter theo Khoa nếu không phải ALL
        const khoaValue = await resolveKhoaValueForSchema(connection, khoa, schemaConfig);
        const { whereClause, params: khoaParams } = buildKhoaFilterClauseBySchema(
            schemaConfig.khoaCol === 'khoa_id' ? khoaValue : khoa,
            schemaConfig,
            schemaConfig.khoaCol === 'khoa_id'
        );
        query += whereClause;
        params = params.concat(khoaParams);

        query += ` ORDER BY ${schemaConfig.idCol} DESC`;

        const [results] = await connection.execute(query, params);
        return results.map(normalizeLegacyNckhRecord);
    } catch (error) {
        console.error(`Lỗi khi lấy dữ liệu ${loaiNCKH}:`, error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy tất cả bản ghi NCKH (không phân biệt loại)
 * @param {string} namHoc - Năm học
 * @param {string} khoa - Khoa (hoặc 'ALL' để lấy tất cả)
 * @returns {Array} Danh sách toàn bộ bản ghi
 */
const getAllRecords = async (namHoc, khoa) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const schemaConfig = await getNckhChungSchemaConfig(connection);

        if (!schemaConfig.namHocCol || !schemaConfig.idCol) {
            throw new Error("Schema nckh_chung khong hop le: thieu cot nam hoc/id");
        }

        let query = `SELECT * FROM nckh_chung WHERE ${schemaConfig.namHocCol} = ?`;
        let params = [namHoc];

        // Filter theo Khoa nếu không phải ALL
        const khoaValue = await resolveKhoaValueForSchema(connection, khoa, schemaConfig);
        const { whereClause, params: khoaParams } = buildKhoaFilterClauseBySchema(
            schemaConfig.khoaCol === 'khoa_id' ? khoaValue : khoa,
            schemaConfig,
            schemaConfig.khoaCol === 'khoa_id'
        );
        query += whereClause;
        params = params.concat(khoaParams);

        query += ` ORDER BY ${schemaConfig.idCol} DESC`;

        const [results] = await connection.execute(query, params);
        return results.map(normalizeLegacyNckhRecord);
    } catch (error) {
        console.error(`Lỗi khi lấy toàn bộ dữ liệu NCKH:`, error);
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

        const schemaConfig = await getNckhChungSchemaConfig(connection);
        const idCol = schemaConfig.idCol || 'id';
        const query = `SELECT * FROM nckh_chung WHERE ${idCol} = ?`;
        const [rows] = await connection.execute(query, [id]);

        return rows.length > 0 ? normalizeLegacyNckhRecord(rows[0]) : null;
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

        const schemaConfig = await getNckhChungSchemaConfig(connection);
        const idCol = schemaConfig.idCol || 'id';
        const loaiNCKH = data.loaiNCKH || data.LoaiNCKH || null;
        const khoaValue = await resolveKhoaValueForSchema(connection, data.khoa || data.Khoa, schemaConfig);
        const columnValueMap = buildNckhColumnValueMap(loaiNCKH, {
            ...data,
            phanLoai: data.phanLoai || data.PhanLoai,
            namHoc: data.namHoc || data.NamHoc,
            tenCongTrinh: data.tenCongTrinh || data.TenCongTrinh,
            maSo: data.maSo || data.MaSo,
            tacGiaChinh: data.tacGiaChinh || data.TacGiaChinh,
            danhSachThanhVien: data.danhSachThanhVien || data.DanhSachThanhVien,
            tongSoTacGia: data.tongSoTacGia || data.TongSoTacGia,
            tongSoThanhVien: data.tongSoThanhVien || data.TongSoThanhVien,
            tongSoTiet: data.tongSoTiet || data.TongSoTiet,
            ngayNghiemThu: data.ngayNghiemThu || data.NgayNghiemThu,
            ngayQuyetDinh: data.ngayQuyetDinh || data.NgayQuyetDinh,
            ketQua: data.ketQua || data.KetQua,
            khoa: data.khoa || data.Khoa,
            soNamThucHien: data.soNamThucHien || data.SoNamThucHien,
            soDongTacGia: data.soDongTacGia || data.SoDongTacGia,
            daoTaoDuyet: data.daoTaoDuyet !== undefined ? data.daoTaoDuyet : data.DaoTaoDuyet,
            khoaDuyet: data.khoaDuyet !== undefined ? data.khoaDuyet : data.KhoaDuyet,
            createdBy: data.createdBy || data.CreatedBy,
        }, schemaConfig, khoaValue);

        delete columnValueMap[schemaConfig.loaiCol];
        delete columnValueMap[schemaConfig.createdByCol];
        delete columnValueMap[schemaConfig.khoaDuyetCol];

        const columns = Object.keys(columnValueMap);
        const setClause = columns.map((column) => `${column} = ?`).join(', ');
        const query = `UPDATE nckh_chung SET ${setClause} WHERE ${idCol} = ?`;
        const params = columns.map((column) => columnValueMap[column]).concat(id);

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

        const schemaConfig = await getNckhChungSchemaConfig(connection);
        const idCol = schemaConfig.idCol || 'id';
        const query = `DELETE FROM nckh_chung WHERE ${idCol} = ?`;
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

        const schemaConfig = await getNckhChungSchemaConfig(connection);
        const idCol = schemaConfig.idCol || 'id';
        const daoTaoDuyetCol = schemaConfig.daoTaoDuyetCol;
        const khoaDuyetCol = schemaConfig.khoaDuyetCol;

        if (!daoTaoDuyetCol) {
            throw new Error('Schema nckh_chung khong co cot duyet vien/dao tao');
        }

        if (daoTaoDuyet === 0 && khoaDuyetCol) {
            const query = `UPDATE nckh_chung SET ${daoTaoDuyetCol} = 0, ${khoaDuyetCol} = 0 WHERE ${idCol} = ?`;
            await connection.execute(query, [id]);
        } else {
            const query = `UPDATE nckh_chung SET ${daoTaoDuyetCol} = ? WHERE ${idCol} = ?`;
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
        const schemaConfig = await getNckhChungSchemaConfig(connection);
        const idCol = schemaConfig.idCol || 'id';
        const khoaDuyetCol = schemaConfig.khoaDuyetCol;

        if (!khoaDuyetCol) {
            throw new Error('Schema nckh_chung khong co cot duyet khoa');
        }

        const query = `UPDATE nckh_chung SET ${khoaDuyetCol} = ? WHERE ${idCol} = ?`;
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
    getAllQuyDinhSoGio,
    manageQuyDinhSoGio,
    toggleQuyDinhStatus,
    getSoTietChuan, // Backward compatibility

    // CRUD Operations
    saveRecord,
    getRecords,
    getRecordById,
    getAllRecords,
    updateRecord,
    deleteRecord,
    updateApprovalStatus,
    updateKhoaApprovalStatus
};
