const giangDayService = require("../../services/save_moigiang/giangDay.service");
const { transformDoAnData } = require("../../services/save_moigiang/datn.service");

const buildKhoaFilter = (khoa, field, params) => {
    if (khoa && khoa !== "ALL") {
        params.push(khoa);
        return ` AND ${field} = ?`;
    }
    return "";
};

const DO_AN_VALUE_INDEX = {
    SinhVien: 0,
    MaSV: 1,
    KhoaDaoTao: 2,
    SoQD: 3,
    TenDeTai: 4,
    SoNguoi: 5,
    isHDChinh: 6,
    GiangVien: 7,
    CCCD: 8,
    isMoiGiang: 9,
    SoTiet: 10,
    NgayBatDau: 11,
    NgayKetThuc: 12,
    MaPhongBan: 13,
    NamHoc: 14,
    Ki: 15,
    Dot: 16,
    TT: 17,
    he_dao_tao: 33,
    khoa_sinh_vien: 34,
    nganh: 35
};

const buildSoTietMap = (rows) => {
    const soTietMap = {};
    rows.forEach((row) => {
        soTietMap[row.he_dao_tao] = {
            tong_tiet: row.tong_tiet,
            so_tiet_1: row.so_tiet_1,
            so_tiet_2: row.so_tiet_2
        };
    });
    return soTietMap;
};

const buildAllDoAnLecturers = (gvmRows, nvRows) => {
    const normalizeName = (name) => name ? name.replace(/\s*\(.*?\)\s*/g, "").trim() : "";

    return [
        ...gvmRows.map((item) => ({
            HoTen: item.HoTen,
            CCCD: item.CCCD,
            BienChe: "Giảng viên mời",
            HoTenReal: normalizeName(item.HoTen),
            isQuanDoi: item.isQuanDoi,
            GioiTinh: item.GioiTinh || null,
            NgaySinh: item.NgaySinh || null,
            NgayCapCCCD: item.NgayCapCCCD || null,
            NoiCapCCCD: item.NoiCapCCCD || null,
            DiaChi: item.DiaChi || null,
            DienThoai: item.DienThoai || null,
            Email: item.Email || null,
            MaSoThue: item.MaSoThue || null,
            HocVi: item.HocVi || null,
            NoiCongTac: item.NoiCongTac || null,
            ChucVu: item.ChucVu || null,
            STK: item.STK || null,
            NganHang: item.NganHang || null,
            MonGiangDayChinh: item.MonGiangDayChinh || null,
            HSL: item.HSL || null
        })),
        ...nvRows.map((item) => ({
            HoTen: item.TenNhanVien,
            CCCD: item.CCCD,
            BienChe: "Cơ hữu",
            HoTenReal: normalizeName(item.TenNhanVien),
            isQuanDoi: null,
            GioiTinh: item.GioiTinh || null,
            NgaySinh: item.NgaySinh || null,
            NgayCapCCCD: item.NgayCapCCCD || null,
            NoiCapCCCD: item.NoiCapCCCD || null,
            DiaChi: item.DiaChi || null,
            DienThoai: item.DienThoai || null,
            Email: item.Email || null,
            MaSoThue: item.MaSoThue || null,
            HocVi: item.HocVi || null,
            NoiCongTac: item.NoiCongTac || null,
            ChucVu: item.ChucVu || null,
            STK: item.SoTaiKhoan || null,
            NganHang: item.NganHang || null,
            MonGiangDayChinh: item.MonGiangDayChinh || null,
            HSL: item.HSL || null
        }))
    ];
};

const mapDuKienDoAnRow = (value, lecturerIdByCccd, lecturerIdByName, heDaoTaoMap) => {
    const cccd = value[DO_AN_VALUE_INDEX.CCCD];
    const giangVien = value[DO_AN_VALUE_INDEX.GiangVien];
    const heDaoTaoId = value[DO_AN_VALUE_INDEX.he_dao_tao];
    const idUser = lecturerIdByCccd.get(cccd) || lecturerIdByName.get(giangVien) || null;

    if (!idUser) return null;

    const isHDChinh = Number(value[DO_AN_VALUE_INDEX.isHDChinh]) || 0;

    return {
        id_User: idUser,
        SinhVien: value[DO_AN_VALUE_INDEX.SinhVien] || null,
        TenSinhVien: value[DO_AN_VALUE_INDEX.SinhVien] || null,
        MaSV: value[DO_AN_VALUE_INDEX.MaSV] || null,
        KhoaDaoTao: value[DO_AN_VALUE_INDEX.KhoaDaoTao] || null,
        Khoa: value[DO_AN_VALUE_INDEX.khoa_sinh_vien] || null,
        khoa_sinh_vien: value[DO_AN_VALUE_INDEX.khoa_sinh_vien] || null,
        nganh: value[DO_AN_VALUE_INDEX.nganh] || null,
        SoQD: value[DO_AN_VALUE_INDEX.SoQD] || null,
        TenDeTai: value[DO_AN_VALUE_INDEX.TenDeTai] || null,
        SoNguoi: Number(value[DO_AN_VALUE_INDEX.SoNguoi]) || 0,
        isHDChinh,
        isHdChinh: isHDChinh,
        loai_huong_dan: isHDChinh ? "HD Chính" : "HD Phụ",
        GiangVien: giangVien || null,
        CCCD: cccd || null,
        SoTiet: Number(value[DO_AN_VALUE_INDEX.SoTiet]) || 0,
        NgayBatDau: value[DO_AN_VALUE_INDEX.NgayBatDau] || null,
        NgayKetThuc: value[DO_AN_VALUE_INDEX.NgayKetThuc] || null,
        MaPhongBan: value[DO_AN_VALUE_INDEX.MaPhongBan] || null,
        NamHoc: value[DO_AN_VALUE_INDEX.NamHoc] || null,
        Ki: value[DO_AN_VALUE_INDEX.Ki] || null,
        Dot: value[DO_AN_VALUE_INDEX.Dot] || null,
        TT: value[DO_AN_VALUE_INDEX.TT] || null,
        he_dao_tao: heDaoTaoId || null,
        ten_he_dao_tao: heDaoTaoMap.get(String(heDaoTaoId)) || heDaoTaoId || "Không xác định"
    };
};

const getPredictedDoAnRows = async (connection, namHoc) => {
    const [doAnRows, soTietRows, gvmRows, nvRows, heDaoTaoRows] = await Promise.all([
        connection.execute("SELECT * FROM doantotnghiep WHERE NamHoc = ?", [namHoc]),
        connection.execute("SELECT * FROM sotietdoan"),
        connection.execute("SELECT * FROM gvmoi"),
        connection.execute(`SELECT id_User, TenNhanVien, CCCD, GioiTinh, NgaySinh, NgayCapCCCD, NoiCapCCCD, DiaChiHienNay, DienThoai, MaSoThue, HocVi, ChucVu, SoTaiKhoan, NganHang, HSL, MonGiangDayChinh FROM nhanvien`),
        connection.execute("SELECT id, he_dao_tao FROM he_dao_tao")
    ]);

    const data = doAnRows[0] || [];
    if (!data.length) return [];

    const soTietMap = buildSoTietMap(soTietRows[0] || []);
    const allGV = buildAllDoAnLecturers(gvmRows[0] || [], nvRows[0] || []);
    const lecturerIdByCccd = new Map((nvRows[0] || []).filter((item) => item.CCCD).map((item) => [item.CCCD, item.id_User]));
    const lecturerIdByName = new Map((nvRows[0] || []).filter((item) => item.TenNhanVien).map((item) => [item.TenNhanVien.trim(), item.id_User]));
    const heDaoTaoMap = new Map((heDaoTaoRows[0] || []).map((item) => [String(item.id), item.he_dao_tao]));

    const { values } = transformDoAnData(
        data,
        data.map((item) => item.MaPhongBan),
        soTietMap,
        [],
        allGV,
        { NamHoc: namHoc },
        true
    );

    return values
        .filter((value) => Number(value[DO_AN_VALUE_INDEX.isMoiGiang]) === 0)
        .map((value) => mapDuKienDoAnRow(value, lecturerIdByCccd, lecturerIdByName, heDaoTaoMap))
        .filter(Boolean);
};

const getDoAnRowsByMode = async (connection, { namHoc, isDuKien = false }) => {
    if (isDuKien) {
        return getPredictedDoAnRows(connection, namHoc);
    }

    const [rows] = await connection.execute(
        `SELECT da.*, 
                COALESCE(hdt.he_dao_tao, da.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
         FROM exportdoantotnghiep da
         LEFT JOIN he_dao_tao hdt ON hdt.id = da.he_dao_tao
         WHERE da.NamHoc = ? AND da.isMoiGiang = 0`,
        [namHoc]
    );
    return rows;
};

/**
 * Lấy dữ liệu giảng dạy (Dự kiến từ quychuan hoặc Chính thức từ giangday)
 * - isDuKien = true: Lấy TẤT CẢ dữ liệu từ quychuan (để xem trước)
 * - isDuKien = false: Lấy dữ liệu chính thức đã lưu từ giangday
 * LƯU Ý: Vượt giờ chỉ tính cho CƠ HỮU (MoiGiang = 0)
 */
const getVirtualGiangDay = async (connection, namHoc, isDuKien = true) => {
    if (!isDuKien) {
        // CHÍNH THỨC: Lấy trực tiếp từ bảng giangday đã lưu (Chỉ cơ hữu)
        const [gdRows] = await connection.execute(
            `SELECT gd.*, COALESCE(hdt.he_dao_tao, gd.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
             FROM giangday gd
             LEFT JOIN he_dao_tao hdt ON hdt.id = gd.he_dao_tao
             WHERE gd.NamHoc = ? AND gd.MoiGiang = 0`,
            [namHoc]
        );
        console.info(`[getVirtualGiangDay] Query giangday: ${gdRows.length} rows, isDuKien=${isDuKien}`);
        return gdRows;
    }

    // DỰ KIẾN: Xây dựng điều kiện WHERE cho quychuan (Chỉ lấy cơ hữu)
    let whereClause = `WHERE qc.NamHoc = ? AND qc.MoiGiang = 0`;
    const params = [namHoc];
    
    // Lấy dữ liệu từ quychuan
    const [qcRows] = await connection.execute(
        `SELECT qc.*, qc.KiHoc AS HocKy, qc.LopHocPhan AS TenHocPhan, hdt.he_dao_tao AS ten_he_dao_tao 
         FROM quychuan qc
         LEFT JOIN he_dao_tao hdt ON hdt.id = qc.he_dao_tao
         ${whereClause}`,
        params
    );
    
    console.info(`[getVirtualGiangDay] Query quychuan: ${qcRows.length} rows, isDuKien=${isDuKien}`);
    
    // Lấy danh sách nhân viên và GVM (GVM lấy để map nhưng không xử lý MoiGiang=1)
    const [nvList] = await connection.execute("SELECT * FROM nhanvien");
    const [gvmList] = await connection.execute("SELECT * FROM gvmoi");
    
    // Xử lý dữ liệu: Chỉ xử lý MoiGiang = 0
    const result = giangDayService.processQuyChuanData(qcRows, nvList, gvmList, false);
    
    console.info(`[getVirtualGiangDay] Processed: ${result.length} records (chỉ cơ hữu)`);
    
    return result;
};

const getDinhMuc = async (connection) => {
    const [rows] = await connection.execute(
        "SELECT GiangDay, NCKH FROM sotietdinhmuc LIMIT 1"
    );
    return rows[0] || null;
};

const getNhanVienById = async (connection, idUser) => {
    const [rows] = await connection.execute(
        `SELECT
            nv.id_User,
            nv.TenNhanVien AS giangVien,
            nv.NgaySinh AS ngaySinh,
            nv.HocVi AS hocVi,
            nv.HSL AS hsl,
            nv.MaPhongBan AS maKhoa,
            nv.ChucVu AS chucVu,
            nv.PhanTramMienGiam AS phanTramMienGiam,
            nv.LyDoMienGiam AS lyDoMienGiam,
            nv.SoTaiKhoan AS soTaiKhoan,
            nv.NganHang AS nganHang,
            nv.Luong AS luong,
            pb.TenPhongBan AS khoa,
            COALESCE(pb.isKhoa, 0) AS isKhoa
        FROM nhanvien nv
        LEFT JOIN phongban pb ON pb.id = nv.phongban_id
        WHERE nv.id_User = ?`,
        [idUser]
    );
    return rows[0] || null;
};

const getGiangDayByIdUser = async (connection, { namHoc, idUser, isDuKien = false }) => {
    if (isDuKien) {
        // DỰ KIẾN: Lấy từ quychuan (chưa lưu)
        const virtualData = await getVirtualGiangDay(connection, namHoc, true);
        return virtualData
            .filter((item) => Number(item.id_User) === Number(idUser))
            .sort((a, b) => a.HocKy - b.HocKy || (a.TenHocPhan || '').localeCompare(b.TenHocPhan || ''));
    } else {
        // CHÍNH THỨC: Lấy từ giangday (đã lưu)
        const [rows] = await connection.execute(
            `SELECT gd.*, 
                    COALESCE(hdt.he_dao_tao, gd.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
             FROM giangday gd
             LEFT JOIN he_dao_tao hdt ON hdt.id = gd.he_dao_tao
             WHERE gd.NamHoc = ? AND gd.id_User = ?
             ORDER BY gd.HocKy, gd.TenHocPhan`,
            [namHoc, idUser]
        );
        return rows;
    }
};

const getLopNgoaiQCByIdUser = async (connection, { namHoc, idUser, requireApproval = true }) => {
    const [rows] = await connection.execute(
        `SELECT lnqc.*, 
                COALESCE(hdt.he_dao_tao, lnqc.he_dao_tao_id, 'Không xác định') AS ten_he_dao_tao
         FROM vg_lop_ngoai_quy_chuan lnqc
         LEFT JOIN he_dao_tao hdt ON hdt.id = lnqc.he_dao_tao_id
         WHERE lnqc.nam_hoc = ? AND lnqc.id_User = ? ${requireApproval ? "AND lnqc.khoa_duyet = 1" : ""}
         ORDER BY lnqc.hoc_ky, lnqc.ma_hoc_phan`,
        [namHoc, idUser]
    );
    return rows;
};

const getKthpByIdUser = async (connection, { namHoc, idUser, requireApproval = true }) => {
    const [rows] = await connection.execute(
        `SELECT kthp.*, 
                COALESCE(hdt.he_dao_tao, kthp.doi_tuong, 'Không xác định') AS ten_he_dao_tao
         FROM vg_coi_cham_ra_de kthp
         LEFT JOIN he_dao_tao hdt ON hdt.id = kthp.he_dao_tao_id
         WHERE kthp.nam_hoc = ? AND kthp.id_User = ? ${requireApproval ? "AND kthp.khoa_duyet = 1" : ""}
         ORDER BY kthp.hoc_ky, kthp.hinh_thuc`,
        [namHoc, idUser]
    );
    return rows;
};

const getDoAnByIdUser = async (connection, { namHoc, idUser, isDuKien = false }) => {
    const rows = await getDoAnRowsByMode(connection, { namHoc, isDuKien });
    return rows.filter((item) => Number(item.id_User) === Number(idUser));
};

const getHuongDanThamQuanByIdUser = async (connection, { namHoc, idUser, requireApproval = true }) => {
    const [rows] = await connection.execute(
        `SELECT t.*, 
                COALESCE(hdt.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
         FROM vg_huong_dan_tham_quan_thuc_te t
         LEFT JOIN he_dao_tao hdt ON hdt.id = t.he_dao_tao_id
         WHERE t.nam_hoc = ? AND t.id_User = ? ${requireApproval ? "AND t.khoa_duyet = 1" : ""}`,
        [namHoc, idUser]
    );
    return rows;
};

/**
 * SQL lấy dữ liệu thô để tổng hợp cho tất cả GV trong khoa
 */
const NON_KHOA_GROUP_CODE = "BGĐ&PHONG";

const getDuLieuThoTongHop = async (connection, { namHoc, khoa, requireApproval = true, isDuKien = false }) => {
    const isAllKhoa = !khoa || khoa === "ALL";
    const isNonKhoaGroup = khoa === NON_KHOA_GROUP_CODE;
    const params = [];
    
    let lecturersQuery = `
        SELECT 
            nv.id_User, 
            nv.TenNhanVien AS giangVien, 
            nv.MaPhongBan AS maKhoa,
            pb.TenPhongBan AS khoa,
            pb.isKhoa AS isKhoa,
            nv.ChucVu AS chucVu,
            nv.LyDoMienGiam AS lyDoMienGiam,
            nv.PhanTramMienGiam AS phanTramMienGiam,
            nv.SoTaiKhoan AS soTaiKhoan,
            nv.NganHang AS nganHang,
            nv.Luong AS luong
        FROM nhanvien nv
        LEFT JOIN phongban pb ON pb.id = nv.phongban_id
        WHERE nv.id_User <> 1
    `;

    if (isNonKhoaGroup) {
        lecturersQuery += " AND COALESCE(pb.isKhoa, 0) = 0";
    } else if (!isAllKhoa) {
        lecturersQuery += " AND nv.MaPhongBan = ?";
        params.push(khoa);
    }

    lecturersQuery += " ORDER BY pb.isKhoa DESC, pb.TenPhongBan, nv.TenNhanVien";

    const [lecturers] = await connection.execute(lecturersQuery, params);
    if (lecturers.length === 0) return [];

    const lecturerIds = lecturers.map(l => l.id_User);
    const placeholders = lecturerIds.map(() => '?').join(',');

    // Lấy dữ liệu giảng dạy (Dự kiến: từ Quy Chuẩn, Chính thức: từ giangday)
    let gdMap;
    if (isDuKien) {
        // DỰ KIẾN: Xử lý từ quychuan
        const virtualData = await getVirtualGiangDay(connection, namHoc, true);
        gdMap = new Map();
        for (const item of virtualData) {
            if (!item.id_User || !lecturerIds.includes(Number(item.id_User))) continue;
            const current = gdMap.get(Number(item.id_User)) || 0;
            gdMap.set(Number(item.id_User), current + (parseFloat(item.QuyChuan) || 0));
        }
    } else {
        // CHÍNH THỨC: Lấy trực tiếp từ giangday
        const [gd] = await connection.execute(
            `SELECT id_User, SUM(QuyChuan) as total FROM giangday WHERE NamHoc = ? AND id_User IN (${placeholders}) GROUP BY id_User`,
            [namHoc, ...lecturerIds]
        );
        gdMap = new Map(gd.map(r => [r.id_User, r.total]));
    }

    // Query gộp dữ liệu từ các nguồn khác
    const queryDetails = (table, yearCol, approvedCond = "") => {
        let col = "quy_chuan"; 
        if (table === 'vg_huong_dan_tham_quan_thuc_te') col = "so_tiet_quy_doi";
        
        return `
            SELECT id_User, SUM(${col}) as total
            FROM ${table}
            WHERE ${yearCol} = ? AND id_User IN (${placeholders}) ${approvedCond}
            GROUP BY id_User
        `;
    };

    const approvedCond = requireApproval ? "AND khoa_duyet = 1" : "";
    const [lnqc] = await connection.execute(queryDetails('vg_lop_ngoai_quy_chuan', 'nam_hoc', approvedCond), [namHoc, ...lecturerIds]);
    const [kthp] = await connection.execute(queryDetails('vg_coi_cham_ra_de', 'nam_hoc', approvedCond), [namHoc, ...lecturerIds]);
    const [hdtq] = await connection.execute(queryDetails('vg_huong_dan_tham_quan_thuc_te', 'nam_hoc', approvedCond), [namHoc, ...lecturerIds]);
    const doAnRows = await getDoAnRowsByMode(connection, { namHoc, isDuKien });

    const lnqcMap = new Map(lnqc.map(r => [r.id_User, r.total]));
    const kthpMap = new Map(kthp.map(r => [r.id_User, r.total]));
    const daMap = new Map();
    for (const row of doAnRows) {
        const idUser = Number(row.id_User);
        if (!lecturerIds.includes(idUser)) continue;
        const current = daMap.get(idUser) || 0;
        daMap.set(idUser, current + (parseFloat(row.SoTiet) || 0));
    }
    const hdtqMap = new Map(hdtq.map(r => [r.id_User, r.total]));

    return lecturers.map(l => ({
        ...l,
        soTietGiangDay: parseFloat(gdMap.get(l.id_User)) || 0,
        soTietNgoaiQC: parseFloat(lnqcMap.get(l.id_User)) || 0,
        soTietKTHP: parseFloat(kthpMap.get(l.id_User)) || 0,
        soTietDoAn: parseFloat(daMap.get(l.id_User)) || 0,
        soTietHDTQ: parseFloat(hdtqMap.get(l.id_User)) || 0
    })).filter(l => l.soTietGiangDay > 0 || l.soTietNgoaiQC > 0 || l.soTietKTHP > 0 || l.soTietDoAn > 0 || l.soTietHDTQ > 0);
};

const getChuNhiemKhoaByKhoa = async (connection, maKhoa) => {
    if (!maKhoa) return "";
    const [rows] = await connection.execute(
        `SELECT TenNhanVien FROM nhanvien 
         WHERE MaPhongBan = ? AND (ChucVu = 'Lãnh đạo khoa' OR ChucVu = 'Chủ nhiệm khoa')
         LIMIT 1`,
        [maKhoa]
    );
    return rows[0]?.TenNhanVien || "";
};

// ============================================================
// Batch functions — lấy dữ liệu cho nhiều GV cùng lúc
// Sử dụng parameterized placeholders để chống SQL injection
// ============================================================

/**
 * Tạo chuỗi placeholders an toàn cho mệnh đề IN
 * @param {Array<number>} ids - Mảng ID (đã validate là số nguyên)
 * @returns {string} Chuỗi "?, ?, ?" 
 */
const buildPlaceholders = (ids) => ids.map(() => '?').join(', ');

const getGiangDayByIds = async (connection, { namHoc, ids, isDuKien = false }) => {
    if (!ids.length) return [];
    if (isDuKien) {
        // DỰ KIẾN: Lấy từ quychuan
        const virtualData = await getVirtualGiangDay(connection, namHoc, true);
        return virtualData
            .filter((item) => ids.includes(Number(item.id_User)))
            .sort((a, b) => a.id_User - b.id_User || a.HocKy - b.HocKy || (a.TenHocPhan || '').localeCompare(b.TenHocPhan || ''));
    } else {
        // CHÍNH THỨC: Lấy từ giangday
        const placeholders = buildPlaceholders(ids);
        const [rows] = await connection.execute(
            `SELECT gd.*, 
                    COALESCE(hdt.he_dao_tao, gd.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
             FROM giangday gd
             LEFT JOIN he_dao_tao hdt ON hdt.id = gd.he_dao_tao
             WHERE gd.NamHoc = ? AND gd.id_User IN (${placeholders})
             ORDER BY gd.id_User, gd.HocKy, gd.TenHocPhan`,
            [namHoc, ...ids]
        );
        return rows;
    }
};

const getLopNgoaiQCByIds = async (connection, { namHoc, ids, requireApproval = true }) => {
    if (!ids.length) return [];
    const placeholders = buildPlaceholders(ids);
    const [rows] = await connection.execute(
        `SELECT lnqc.*, 
                COALESCE(hdt.he_dao_tao, lnqc.he_dao_tao_id, 'Không xác định') AS ten_he_dao_tao
         FROM vg_lop_ngoai_quy_chuan lnqc
         LEFT JOIN he_dao_tao hdt ON hdt.id = lnqc.he_dao_tao_id
         WHERE lnqc.nam_hoc = ? AND lnqc.id_User IN (${placeholders}) ${requireApproval ? "AND lnqc.khoa_duyet = 1" : ""}
         ORDER BY lnqc.id_User, lnqc.hoc_ky, lnqc.ma_hoc_phan`,
        [namHoc, ...ids]
    );
    return rows;
};

const getKthpByIds = async (connection, { namHoc, ids, requireApproval = true }) => {
    if (!ids.length) return [];
    const placeholders = buildPlaceholders(ids);
    const [rows] = await connection.execute(
        `SELECT kthp.*, 
                COALESCE(hdt.he_dao_tao, kthp.doi_tuong, 'Không xác định') AS ten_he_dao_tao
         FROM vg_coi_cham_ra_de kthp
         LEFT JOIN he_dao_tao hdt ON hdt.id = kthp.he_dao_tao_id
         WHERE kthp.nam_hoc = ? AND kthp.id_User IN (${placeholders}) ${requireApproval ? "AND kthp.khoa_duyet = 1" : ""}
         ORDER BY kthp.id_User, kthp.hoc_ky, kthp.hinh_thuc`,
        [namHoc, ...ids]
    );
    return rows;
};

const getDoAnByIds = async (connection, { namHoc, ids, isDuKien = false }) => {
    if (!ids.length) return [];
    const rows = await getDoAnRowsByMode(connection, { namHoc, isDuKien });
    const idSet = new Set(ids.map(Number));
    return rows.filter((item) => idSet.has(Number(item.id_User)));
};

const getHuongDanThamQuanByIds = async (connection, { namHoc, ids, requireApproval = true }) => {
    if (!ids.length) return [];
    const placeholders = buildPlaceholders(ids);
    const [rows] = await connection.execute(
        `SELECT t.*, 
                COALESCE(hdt.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
         FROM vg_huong_dan_tham_quan_thuc_te t
         LEFT JOIN he_dao_tao hdt ON hdt.id = t.he_dao_tao_id
         WHERE t.nam_hoc = ? AND t.id_User IN (${placeholders}) ${requireApproval ? "AND t.khoa_duyet = 1" : ""}`,
        [namHoc, ...ids]
    );
    return rows;
};

const getNhanVienByIds = async (connection, ids) => {
    if (!ids.length) return [];
    const placeholders = buildPlaceholders(ids);
    const [rows] = await connection.execute(
        `SELECT
            nv.id_User,
            nv.TenNhanVien AS giangVien,
            nv.NgaySinh AS ngaySinh,
            nv.HocVi AS hocVi,
            nv.HSL AS hsl,
            nv.MaPhongBan AS maKhoa,
            nv.ChucVu AS chucVu,
            nv.PhanTramMienGiam AS phanTramMienGiam,
            nv.LyDoMienGiam AS lyDoMienGiam,
            nv.SoTaiKhoan AS soTaiKhoan,
            nv.NganHang AS nganHang,
            nv.Luong AS luong,
            pb.TenPhongBan AS khoa,
            COALESCE(pb.isKhoa, 0) AS isKhoa
        FROM nhanvien nv
        LEFT JOIN phongban pb ON pb.id = nv.phongban_id
        WHERE nv.id_User IN (${placeholders})`,
        [...ids]
    );
    return rows;
};

module.exports = {
    NON_KHOA_GROUP_CODE,
    getDinhMuc,
    getNhanVienById,
    getNhanVienByIds,
    getGiangDayByIdUser,
    getLopNgoaiQCByIdUser,
    getKthpByIdUser,
    getDoAnByIdUser,
    getHuongDanThamQuanByIdUser,
    getGiangDayByIds,
    getLopNgoaiQCByIds,
    getKthpByIds,
    getDoAnByIds,
    getHuongDanThamQuanByIds,
    getDuLieuThoTongHop,
    getChuNhiemKhoaByKhoa
};
