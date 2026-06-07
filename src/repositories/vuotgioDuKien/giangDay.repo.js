const getGiangDayQuyChuan = async (connection, namHoc, khoaId, dot, kiHoc) => {
    let sql = `
        SELECT *
        FROM quychuan
        WHERE NamHoc = ? AND MoiGiang = 0
    `;
    const params = [namHoc];

    if (khoaId && khoaId !== 'ALL') {
        sql += ` AND Khoa = ?`;
        params.push(khoaId);
    }
    
    if (dot && dot !== 'ALL') {
        sql += ` AND Dot = ?`;
        params.push(dot);
    }

    if (kiHoc && kiHoc !== 'ALL') {
        sql += ` AND KiHoc = ?`;
        params.push(kiHoc);
    }

    const [rows] = await connection.execute(sql, params);
    return rows;
};

module.exports = {
    getGiangDayQuyChuan
};
