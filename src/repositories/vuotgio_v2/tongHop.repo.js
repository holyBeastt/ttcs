const buildKhoaFilter = (khoa, field, params) => {
    if (khoa && khoa !== "ALL") {
        params.push(khoa);
        return ` AND ${field} = ?`;
    }
    return "";
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

const getGiangDayByIdUser = async (connection, { namHoc, idUser }) => {
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
};

const getLopNgoaiQCByIdUser = async (connection, { namHoc, idUser }) => {
    const [rows] = await connection.execute(
        `SELECT lnqc.*, 
                COALESCE(hdt.he_dao_tao, lnqc.he_dao_tao_id, 'Không xác định') AS ten_he_dao_tao
         FROM vg_lop_ngoai_quy_chuan lnqc
         LEFT JOIN he_dao_tao hdt ON hdt.id = lnqc.he_dao_tao_id
         WHERE lnqc.nam_hoc = ? AND lnqc.id_User = ? AND lnqc.khoa_duyet = 1
         ORDER BY lnqc.hoc_ky, lnqc.ma_hoc_phan`,
        [namHoc, idUser]
    );
    return rows;
};

const getKthpByIdUser = async (connection, { namHoc, idUser }) => {
    const [rows] = await connection.execute(
        `SELECT kthp.*, 
                COALESCE(hdt.he_dao_tao, kthp.doi_tuong, 'Không xác định') AS ten_he_dao_tao
         FROM vg_coi_cham_ra_de kthp
         LEFT JOIN he_dao_tao hdt ON hdt.id = kthp.he_dao_tao_id
         WHERE kthp.nam_hoc = ? AND kthp.id_User = ? AND kthp.khoa_duyet = 1
         ORDER BY kthp.hoc_ky, kthp.hinh_thuc`,
        [namHoc, idUser]
    );
    return rows;
};

const getDoAnByIdUser = async (connection, { namHoc, idUser }) => {
    const [rows] = await connection.execute(
        `SELECT da.*, 
                COALESCE(hdt.he_dao_tao, da.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
         FROM exportdoantotnghiep da
         LEFT JOIN he_dao_tao hdt ON hdt.id = da.he_dao_tao
         WHERE da.NamHoc = ? AND da.id_User = ? AND da.isMoiGiang = 0`,
        [namHoc, idUser]
    );
    return rows;
};

const getHuongDanThamQuanByIdUser = async (connection, { namHoc, idUser }) => {
    const [rows] = await connection.execute(
        `SELECT t.*, 
                COALESCE(hdt.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
         FROM vg_huong_dan_tham_quan_thuc_te t
         LEFT JOIN he_dao_tao hdt ON hdt.id = t.he_dao_tao_id
         WHERE t.nam_hoc = ? AND t.id_User = ?`,
        [namHoc, idUser]
    );
    return rows;
};

/**
 * SQL lấy dữ liệu thô để tổng hợp cho tất cả GV trong khoa
 */
const NON_KHOA_GROUP_CODE = "BGĐ&PHONG";

const getDuLieuThoTongHop = async (connection, { namHoc, khoa }) => {
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
        WHERE nv.id_User IN (
            SELECT id_User FROM giangday WHERE NamHoc = ?
            UNION SELECT id_User FROM vg_lop_ngoai_quy_chuan WHERE nam_hoc = ?
            UNION SELECT id_User FROM vg_coi_cham_ra_de WHERE nam_hoc = ?
            UNION SELECT id_User FROM exportdoantotnghiep WHERE NamHoc = ?
            UNION SELECT id_User FROM vg_huong_dan_tham_quan_thuc_te WHERE nam_hoc = ?
        )
        AND nv.id_User <> 1
    `;
    params.push(namHoc, namHoc, namHoc, namHoc, namHoc);

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

    // Query gộp dữ liệu từ các nguồn
    const queryDetails = (table, yearCol, approvedCond = "") => {
        let col = "quy_chuan"; 
        if (table === 'giangday') col = "QuyChuan";
        if (table === 'exportdoantotnghiep') col = "SoTiet";
        if (table === 'vg_huong_dan_tham_quan_thuc_te') col = "so_tiet_quy_doi";
        
        return `
            SELECT id_User, SUM(${col}) as total
            FROM ${table}
            WHERE ${yearCol} = ? AND id_User IN (${placeholders}) ${approvedCond}
            GROUP BY id_User
        `;
    };

    const [gd] = await connection.execute(queryDetails('giangday', 'NamHoc'), [namHoc, ...lecturerIds]);
    const [lnqc] = await connection.execute(queryDetails('vg_lop_ngoai_quy_chuan', 'nam_hoc', 'AND khoa_duyet = 1'), [namHoc, ...lecturerIds]);
    const [kthp] = await connection.execute(queryDetails('vg_coi_cham_ra_de', 'nam_hoc', 'AND khoa_duyet = 1'), [namHoc, ...lecturerIds]);
    const [da] = await connection.execute(queryDetails('exportdoantotnghiep', 'NamHoc', 'AND isMoiGiang = 0'), [namHoc, ...lecturerIds]);
    const [hdtq] = await connection.execute(queryDetails('vg_huong_dan_tham_quan_thuc_te', 'nam_hoc'), [namHoc, ...lecturerIds]);

    const gdMap = new Map(gd.map(r => [r.id_User, r.total]));
    const lnqcMap = new Map(lnqc.map(r => [r.id_User, r.total]));
    const kthpMap = new Map(kthp.map(r => [r.id_User, r.total]));
    const daMap = new Map(da.map(r => [r.id_User, r.total]));
    const hdtqMap = new Map(hdtq.map(r => [r.id_User, r.total]));

    return lecturers.map(l => ({
        ...l,
        soTietGiangDay: parseFloat(gdMap.get(l.id_User)) || 0,
        soTietNgoaiQC: parseFloat(lnqcMap.get(l.id_User)) || 0,
        soTietKTHP: parseFloat(kthpMap.get(l.id_User)) || 0,
        soTietDoAn: parseFloat(daMap.get(l.id_User)) || 0,
        soTietHDTQ: parseFloat(hdtqMap.get(l.id_User)) || 0
    }));
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

module.exports = {
    NON_KHOA_GROUP_CODE,
    getDinhMuc,
    getNhanVienById,
    getGiangDayByIdUser,
    getLopNgoaiQCByIdUser,
    getKthpByIdUser,
    getDoAnByIdUser,
    getHuongDanThamQuanByIdUser,
    getDuLieuThoTongHop,
    getChuNhiemKhoaByKhoa
};
