/**
 * VUOT GIO V2 - Hướng dẫn tham quan Repository
 */

const buildKhoaFilter = (khoa, field, params) => {
    if (khoa && khoa !== "ALL") {
        params.push(khoa);
        return ` AND ${field} = ?`;
    }
    return "";
};

const getTable = async (connection, { namHoc, dot, kiHoc, khoa, heDaoTao }) => {
    let query = `
        SELECT 
            t.*,
            nv.TenNhanVien AS HoTen,
            hdt.he_dao_tao AS HeDaoTaoTen
        FROM vg_huong_dan_tham_quan_thuc_te t
        LEFT JOIN nhanvien nv ON t.id_User = nv.id_User
        LEFT JOIN he_dao_tao hdt ON t.he_dao_tao_id = hdt.id
        WHERE 1=1
    `;
    const params = [];

    if (namHoc) {
        query += ` AND t.nam_hoc = ?`;
        params.push(namHoc);
    }
    if (dot) {
        query += ` AND t.dot = ?`;
        params.push(dot);
    }
    if (kiHoc) {
        query += ` AND t.hoc_ky = ?`;
        params.push(kiHoc);
    }
    query += buildKhoaFilter(khoa, "t.khoa", params);
    if (heDaoTao) {
        query += ` AND t.he_dao_tao_id = ?`;
        params.push(heDaoTao);
    }

    query += ` ORDER BY t.created_at DESC`;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const getById = async (connection, id) => {
    const [rows] = await connection.execute(
        `SELECT * FROM vg_huong_dan_tham_quan_thuc_te WHERE id = ?`,
        [id]
    );
    return rows[0] || null;
};

const save = async (connection, data) => {
    const [result] = await connection.execute(
        `INSERT INTO vg_huong_dan_tham_quan_thuc_te (
            id_User, he_dao_tao_id, nganh_hoc,
            khoa, nam_hoc, hoc_ky, dot, mo_ta_hoat_dong,
            theo_qd, so_ngay, so_tiet_quy_doi, ghi_chu
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            data.id_User, data.he_dao_tao_id, data.nganh_hoc,
            data.khoa, data.nam_hoc, data.hoc_ky, data.dot, data.mo_ta_hoat_dong,
            data.theo_qd, data.so_ngay, data.so_tiet_quy_doi, data.ghi_chu
        ]
    );
    return result.insertId;
};

const update = async (connection, id, data) => {
    await connection.execute(
        `UPDATE vg_huong_dan_tham_quan_thuc_te SET
            id_User = ?, he_dao_tao_id = ?, nganh_hoc = ?,
            khoa = ?, nam_hoc = ?, hoc_ky = ?, dot = ?, mo_ta_hoat_dong = ?,
            theo_qd = ?, so_ngay = ?, so_tiet_quy_doi = ?, ghi_chu = ?
        WHERE id = ?`,
        [
            data.id_User, data.he_dao_tao_id, data.nganh_hoc,
            data.khoa, data.nam_hoc, data.hoc_ky, data.dot, data.mo_ta_hoat_dong,
            data.theo_qd, data.so_ngay, data.so_tiet_quy_doi, data.ghi_chu,
            id
        ]
    );
};

const deleteRecord = async (connection, id) => {
    await connection.execute(`DELETE FROM vg_huong_dan_tham_quan_thuc_te WHERE id = ?`, [id]);
};

const updateApproval = async (connection, id, khoaDuyet, daoTaoDuyet) => {
    await connection.execute(
        `UPDATE vg_huong_dan_tham_quan_thuc_te SET khoa_duyet = ?, dao_tao_duyet = ? WHERE id = ?`,
        [khoaDuyet, daoTaoDuyet, id]
    );
};

module.exports = {
    getTable,
    getById,
    save,
    update,
    updateApproval,
    delete: deleteRecord
};
