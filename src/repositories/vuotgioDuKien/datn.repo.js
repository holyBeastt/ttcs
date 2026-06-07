const getDoAnTotNghiepDuKien = async (connection, namHoc, khoaId, dot, kiHoc) => {
    let sql = `
        SELECT 
            GiangVien AS GiangVien_HienThi,
            MaPhongBan,
            SinhVien,
            khoa_sinh_vien AS KhoaSV,
            TenDeTai,
            SoTiet
        FROM exportdoantotnghiep
        WHERE isMoiGiang = 0 AND NamHoc = ?
    `;
    const params = [namHoc];

    if (khoaId && khoaId !== 'ALL') {
        sql += ` AND MaPhongBan = ?`;
        params.push(khoaId);
    }

    if (dot && dot !== 'ALL') {
        sql += ` AND Dot = ?`;
        params.push(dot);
    }

    if (kiHoc && kiHoc !== 'ALL') {
        sql += ` AND ki = ?`;
        params.push(kiHoc);
    }

    sql += ` ORDER BY MaPhongBan, GiangVien, SinhVien`;

    const [rows] = await connection.execute(sql, params);
    return rows;
};

module.exports = {
    getDoAnTotNghiepDuKien
};
