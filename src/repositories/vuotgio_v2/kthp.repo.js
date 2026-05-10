const COI_CHAM_RA_DE_TABLE = "vg_coi_cham_ra_de";

const buildSelect = () => `
    id,
    id_user,
    giang_vien AS giangvien,
    giang_vien,
    khoa,
    hoc_ky AS ki,
    hoc_ky,
    nam_hoc AS namhoc,
    nam_hoc,
    hinh_thuc AS hinhthuc,
    hinh_thuc,
    ten_hoc_phan AS tenhocphan,
    ten_hoc_phan,
    lop_hoc_phan AS lophocphan,
    lop_hoc_phan,
    doi_tuong AS doituong,
    doi_tuong,
    bai_cham_1 AS baicham1,
    bai_cham_1,
    bai_cham_2 AS baicham2,
    bai_cham_2,
    tong_so AS tongso,
    tong_so,
    quy_chuan AS sotietqc,
    quy_chuan,
    ghi_chu AS ghichu,
    ghi_chu,
    khoa_duyet AS khoaduyet,
    khoa_duyet,
    khao_thi_duyet AS khaothiduyet,
    khao_thi_duyet,
    so_tc,
    so_sv
`;

const getTable = async (connection, { namHoc, khoa }) => {
    let query = `SELECT ${buildSelect()} FROM ${COI_CHAM_RA_DE_TABLE} WHERE nam_hoc = ?`;
    const params = [namHoc];

    if (khoa && khoa !== "ALL") {
        query += ` AND khoa = ?`;
        params.push(khoa);
    }

    query += ` ORDER BY giang_vien, ten_hoc_phan, hinh_thuc`;
    const [rows] = await connection.execute(query, params);
    return rows;
};

const insert = async (connection, values) => {
    const query = `
        INSERT INTO ${COI_CHAM_RA_DE_TABLE}
        (id_user, giang_vien, khoa, hoc_ky, nam_hoc, hinh_thuc, ten_hoc_phan, lop_hoc_phan, doi_tuong, he_dao_tao_id, bai_cham_1, bai_cham_2, tong_so, quy_chuan, ghi_chu, khoa_duyet, khao_thi_duyet, so_tc, so_sv)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `;
    return connection.execute(query, values);
};

const getById = async (connection, id) => {
    const [rows] = await connection.execute(
        `SELECT id, khoa_duyet, khao_thi_duyet, hinh_thuc, ten_hoc_phan, giang_vien FROM ${COI_CHAM_RA_DE_TABLE} WHERE id = ?`,
        [id]
    );
    return rows[0] || null;
};

const update = async (connection, id, values) => {
    const query = `
        UPDATE ${COI_CHAM_RA_DE_TABLE} SET
            id_user = ?,
            giang_vien = ?,
            khoa = ?,
            hoc_ky = ?,
            nam_hoc = ?,
            hinh_thuc = ?,
            ten_hoc_phan = ?,
            lop_hoc_phan = ?,
            doi_tuong = ?,
            he_dao_tao_id = ?,
            bai_cham_1 = ?,
            bai_cham_2 = ?,
            tong_so = ?,
            quy_chuan = ?,
            ghi_chu = ?,
            so_tc = ?,
            so_sv = ?
        WHERE id = ?
    `;
    return connection.execute(query, [...values, id]);
};

const remove = async (connection, id) => connection.execute(`DELETE FROM ${COI_CHAM_RA_DE_TABLE} WHERE id = ?`, [id]);

const updateBatchApproval = async (connection, records) => {
    let updatedCount = 0;
    for (const record of records) {
        const [result] = await connection.execute(
            `UPDATE ${COI_CHAM_RA_DE_TABLE} SET khoa_duyet = ?, khao_thi_duyet = ? WHERE id = ?`,
            [record.khoa_duyet, record.khao_thi_duyet, record.id]
        );
        if (result.affectedRows > 0) updatedCount++;
    }
    return updatedCount;
};

const updateApproval = async (connection, id, value) =>
    connection.execute(`UPDATE ${COI_CHAM_RA_DE_TABLE} SET khoa_duyet = ? WHERE id = ?`, [value, id]);

const deleteByYearAndSemester = async (connection, { namHoc, hocKy }) =>
    connection.execute(`DELETE FROM ${COI_CHAM_RA_DE_TABLE} WHERE nam_hoc = ? AND hoc_ky = ?`, [namHoc, hocKy]);

const countByYearAndSemester = async (connection, { namHoc, hocKy }) => {
    const [rows] = await connection.execute(
        `SELECT COUNT(*) AS count FROM ${COI_CHAM_RA_DE_TABLE} WHERE nam_hoc = ? AND hoc_ky = ?`,
        [namHoc, hocKy]
    );
    return rows[0].count;
};

const getByLecturerName = async (connection, { name, namHoc, hocKy }) => {
    const query = `
        SELECT ${buildSelect()} FROM ${COI_CHAM_RA_DE_TABLE}
        WHERE giang_vien LIKE ? AND hoc_ky = ? AND nam_hoc = ?
    `;
    const [rows] = await connection.execute(query, [`%${name}%`, hocKy, namHoc]);
    return rows;
};

const insertMany = async (connection, values) => {
    if (!values || values.length === 0) return { affectedRows: 0 };
    const query = `
        INSERT INTO ${COI_CHAM_RA_DE_TABLE}
        (giang_vien, khoa, hoc_ky, nam_hoc, hinh_thuc, ten_hoc_phan, lop_hoc_phan, doi_tuong, bai_cham_1, bai_cham_2, tong_so, quy_chuan, khoa_duyet, khao_thi_duyet, id_user, he_dao_tao_id)
        VALUES ?
    `;
    return connection.query(query, [values]);
};

module.exports = {
    COI_CHAM_RA_DE_TABLE,
    buildSelect,
    getTable,
    insert,
    getById,
    update,
    remove,
    updateBatchApproval,
    updateApproval,
    deleteByYearAndSemester,
    countByYearAndSemester,
    getByLecturerName,
    insertMany
};