/**
 * VUOT GIO V2 - Giảng dạy (TKB) Repository
 */

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

    // Chỉ thêm filter khi có giá trị (không null, không undefined, không empty string, không "ALL")
    if (dot && dot !== "ALL" && dot !== "") {
        query += " AND Dot = ?";
        params.push(dot);
    }
    if (ki && ki !== "ALL" && ki !== "") {
        query += " AND HocKy = ?";
        params.push(ki);
    }
    if (namHoc && namHoc !== "ALL" && namHoc !== "") {
        query += " AND NamHoc = ?";
        params.push(namHoc);
    }
    if (khoa && khoa !== "ALL" && khoa !== "") {
        query += " AND Khoa = ?";
        params.push(khoa);
    }
    if (heDaoTao && heDaoTao !== "ALL" && heDaoTao !== "") {
        query += " AND he_dao_tao = ?";
        params.push(heDaoTao);
    }

    query += ` ORDER BY GiangVien ASC, TenHocPhan ASC, Lop ASC`;

    console.log('[giangDay.repo] Query:', query);
    console.log('[giangDay.repo] Params:', params);

    const [rows] = await connection.execute(query, params);
    
    console.log('[giangDay.repo] Rows count:', rows.length);
    if (rows.length > 0) {
        console.log('[giangDay.repo] Sample row:', rows[0]);
    }

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
