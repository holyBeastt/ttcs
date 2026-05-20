/**
 * VUOT GIO V2 - Đồ án tốt nghiệp Repository
 */

const buildKhoaFilter = (khoa, field, params) => {
    if (khoa && khoa !== "ALL") {
        params.push(khoa);
        return ` AND ${field} = ?`;
    }
    return "";
};

const getTable = async (connection, { namHoc, dot, ki, khoa, heDaoTao }) => {
    let query = `
        SELECT 
            ID,
            GiangVien,
            MaPhongBan AS Khoa,
            SinhVien,
            khoa_sinh_vien AS KhoaSV,
            TenDeTai,
            SoTiet
        FROM exportdoantotnghiep
        WHERE isMoiGiang = 0
    `;
    const params = [];

    if (namHoc) {
        query += ` AND NamHoc = ?`;
        params.push(namHoc);
    }
    if (dot) {
        query += ` AND Dot = ?`;
        params.push(dot);
    }
    if (ki) {
        query += ` AND Ki = ?`;
        params.push(ki);
    }
    query += buildKhoaFilter(khoa, "MaPhongBan", params);
    if (heDaoTao) {
        query += ` AND he_dao_tao = ?`;
        params.push(heDaoTao);
    }

    query += ` ORDER BY MaPhongBan, GiangVien, SinhVien`;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const getChiTiet = async (connection, { giangVien, namHoc, dot, ki, khoa, heDaoTao }) => {
    let query = `
        SELECT 
            ID,
            SinhVien,
            MaSV,
            khoa_sinh_vien AS KhoaSV,
            nganh AS Nganh,
            TenDeTai,
            GiangVien,
            SoTiet,
            NgayBatDau,
            NgayKetThuc,
            MaPhongBan AS Khoa,
            SoQD,
            isHDChinh
        FROM exportdoantotnghiep
        WHERE isMoiGiang = 0 AND GiangVien = ?
    `;
    const params = [giangVien];

    if (namHoc) {
        query += ` AND NamHoc = ?`;
        params.push(namHoc);
    }
    if (dot) {
        query += ` AND Dot = ?`;
        params.push(dot);
    }
    if (ki) {
        query += ` AND Ki = ?`;
        params.push(ki);
    }
    query += buildKhoaFilter(khoa, "MaPhongBan", params);
    if (heDaoTao) {
        query += ` AND he_dao_tao = ?`;
        params.push(heDaoTao);
    }

    query += ` ORDER BY SinhVien`;

    const [rows] = await connection.execute(query, params);
    return rows;
};

module.exports = {
    getTable,
    getChiTiet
};
