/**
 * VUOT GIO V2 - Giảng dạy (TKB) Repository
 */

const buildKhoaFilter = (khoa, field, params) => {
    if (khoa && khoa !== "ALL") {
        params.push(khoa);
        return ` AND ${field} = ?`;
    }
    return "";
};

const getStatistics = async (connection, { dot, ki, namHoc, khoa, heDaoTao }) => {
    const BASE_CONDITION = "id_User IS NOT NULL AND id_User <> 1";
    let query = `
        SELECT
            id_User,
            GiangVien,
            TenHocPhan,
            Lop,
            SoTC,
            Dot,
            HocKy,
            NamHoc,
            QuyChuan,
            Khoa,
            he_dao_tao
        FROM giangday
        WHERE ${BASE_CONDITION}
    `;

    const params = [];

    if (dot && dot !== "ALL") {
        query += " AND Dot = ?";
        params.push(dot);
    }
    if (ki && ki !== "ALL") {
        query += " AND HocKy = ?";
        params.push(ki);
    }
    if (namHoc && namHoc !== "ALL") {
        query += " AND NamHoc = ?";
        params.push(namHoc);
    }
    query += buildKhoaFilter(khoa, "Khoa", params);
    if (heDaoTao && heDaoTao !== "ALL") {
        query += " AND he_dao_tao = ?";
        params.push(heDaoTao);
    }

    query += ` ORDER BY GiangVien ASC, TenHocPhan ASC, Lop ASC`;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const getDistinctValues = async (connection, column) => {
    const BASE_CONDITION = "id_User IS NOT NULL AND id_User <> 1";
    const [rows] = await connection.execute(
        `SELECT DISTINCT ${column} FROM giangday WHERE ${BASE_CONDITION} ORDER BY ${column} ${column === 'NamHoc' ? 'DESC' : 'ASC'}`
    );
    return rows.map(r => r[column]);
};

module.exports = {
    getStatistics,
    getDistinctValues
};
