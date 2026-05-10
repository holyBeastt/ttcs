const getTeachers = async (connection, khoa) => {
    let query = `SELECT id_User, TenNhanVien AS HoTen, MaPhongBan AS Khoa FROM nhanvien WHERE 1=1`;
    const params = [];

    if (khoa && khoa !== "ALL") {
        query += ` AND MaPhongBan = ?`;
        params.push(khoa);
    }

    query += ` ORDER BY TenNhanVien`;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const getHocPhan = async (connection) => {
    const query = `
        SELECT DISTINCT TenHP, MaHP, SoTC
        FROM quychuan
        ORDER BY TenHP
    `;

    const [rows] = await connection.execute(query);
    return rows;
};

const getLopHoc = async (connection, namHoc) => {
    let query = `SELECT DISTINCT MaLop FROM giangday WHERE 1=1`;
    const params = [];

    if (namHoc) {
        query += ` AND NamHoc = ?`;
        params.push(namHoc);
    }

    query += ` ORDER BY MaLop`;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const getDinhMuc = async (connection) => {
    const [rows] = await connection.execute(
        `SELECT GiangDay, NCKH FROM sotietdinhmuc LIMIT 1`
    );

    return rows[0] || null;
};

module.exports = {
    getTeachers,
    getHocPhan,
    getLopHoc,
    getDinhMuc,
};