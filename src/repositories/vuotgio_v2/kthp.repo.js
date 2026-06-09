const COI_CHAM_RA_DE_TABLE = "vg_coi_cham_ra_de";

const buildSelect = () => `
    id,
    id_user,
    giang_vien AS giangvien,
    giang_vien,
    khoa,
    hoc_ky AS ki,
    hoc_ky,
    dot,
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

const getTable = async (connection, { namHoc, khoa, heDaoTao, dot, ki }) => {
    let query = `
        SELECT 
          t.id,
          t.id_user,
          t.giang_vien AS giangvien,
          t.giang_vien,
          t.khoa,
          t.hoc_ky AS ki,
          t.hoc_ky,
          t.dot,
          t.nam_hoc AS namhoc,
          t.nam_hoc,
          t.hinh_thuc AS hinhthuc,
          t.hinh_thuc,
          t.ten_hoc_phan AS tenhocphan,
          t.ten_hoc_phan,
          t.lop_hoc_phan AS lophocphan,
          t.lop_hoc_phan,
          h.he_dao_tao AS doituong,
          h.he_dao_tao AS doi_tuong,
          t.bai_cham_1 AS baicham1,
          t.bai_cham_1,
          t.bai_cham_2 AS baicham2,
          t.bai_cham_2,
          t.tong_so AS tongso,
          t.tong_so,
          t.quy_chuan AS sotietqc,
          t.quy_chuan,
          t.ghi_chu AS ghichu,
          t.ghi_chu,
          t.khoa_duyet AS khoaduyet,
          t.khoa_duyet,
          t.khao_thi_duyet AS khaothiduyet,
          t.khao_thi_duyet,
          t.so_tc,
          t.so_sv
        FROM ${COI_CHAM_RA_DE_TABLE} t
        LEFT JOIN he_dao_tao h ON t.he_dao_tao_id = h.id
        WHERE t.nam_hoc = ?
    `;
    const params = [namHoc];

    if (khoa && khoa !== "ALL") {
        query += ` AND t.khoa = ?`;
        params.push(khoa);
    }

    if (heDaoTao && heDaoTao !== "ALL") {
        query += ` AND t.he_dao_tao_id = ?`;
        params.push(heDaoTao);
    }

    if (dot && dot !== "ALL") {
        query += ` AND t.dot = ?`;
        params.push(dot);
    }

    if (ki && ki !== "ALL") {
        query += ` AND t.hoc_ky = ?`;
        params.push(ki);
    }

    query += ` ORDER BY t.giang_vien, t.ten_hoc_phan, t.hinh_thuc`;
    const [rows] = await connection.execute(query, params);
    return rows;
};

const insert = async (connection, values) => {
    const query = `
        INSERT INTO ${COI_CHAM_RA_DE_TABLE}
        (id_user, giang_vien, khoa, hoc_ky, nam_hoc, dot, hinh_thuc, ten_hoc_phan, lop_hoc_phan, doi_tuong, he_dao_tao_id, bai_cham_1, bai_cham_2, tong_so, quy_chuan, ghi_chu, khoa_duyet, khao_thi_duyet, so_tc, so_sv)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
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
            dot = ?,
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

const deleteByYearAndSemester = async (connection, { namHoc, hocKy, dot }) => {
    if (dot !== undefined && dot !== null && dot !== '') {
        return connection.execute(`DELETE FROM ${COI_CHAM_RA_DE_TABLE} WHERE nam_hoc = ? AND hoc_ky = ? AND dot = ?`, [namHoc, hocKy, dot]);
    }
    return connection.execute(`DELETE FROM ${COI_CHAM_RA_DE_TABLE} WHERE nam_hoc = ? AND hoc_ky = ?`, [namHoc, hocKy]);
};

const countByYearAndSemester = async (connection, { namHoc, hocKy, dot }) => {
    let query = `SELECT COUNT(*) AS count FROM ${COI_CHAM_RA_DE_TABLE} WHERE nam_hoc = ? AND hoc_ky = ?`;
    let params = [namHoc, hocKy];
    
    if (dot !== undefined && dot !== null && dot !== '') {
        query += ` AND dot = ?`;
        params.push(dot);
    }
    
    const [rows] = await connection.execute(query, params);
    return rows[0].count;
};

const getByLecturerName = async (connection, { name, namHoc, hocKy }) => {
    const query = `
        SELECT 
          t.id,
          t.id_user,
          t.giang_vien AS giangvien,
          t.giang_vien,
          t.khoa,
          t.hoc_ky AS ki,
          t.hoc_ky,
          t.dot,
          t.nam_hoc AS namhoc,
          t.nam_hoc,
          t.hinh_thuc AS hinhthuc,
          t.hinh_thuc,
          t.ten_hoc_phan AS tenhocphan,
          t.ten_hoc_phan,
          t.lop_hoc_phan AS lophocphan,
          t.lop_hoc_phan,
          h.he_dao_tao AS doituong,
          h.he_dao_tao AS doi_tuong,
          t.bai_cham_1 AS baicham1,
          t.bai_cham_1,
          t.bai_cham_2 AS baicham2,
          t.bai_cham_2,
          t.tong_so AS tongso,
          t.tong_so,
          t.quy_chuan AS sotietqc,
          t.quy_chuan,
          t.ghi_chu AS ghichu,
          t.ghi_chu,
          t.khoa_duyet AS khoaduyet,
          t.khoa_duyet,
          t.khao_thi_duyet AS khaothiduyet,
          t.khao_thi_duyet,
          t.so_tc,
          t.so_sv
        FROM ${COI_CHAM_RA_DE_TABLE} t
        LEFT JOIN he_dao_tao h ON t.he_dao_tao_id = h.id
        WHERE t.giang_vien LIKE ? AND t.hoc_ky = ? AND t.nam_hoc = ?
    `;
    const [rows] = await connection.execute(query, [`%${name}%`, hocKy, namHoc]);
    return rows;
};

const insertMany = async (connection, values) => {
    if (!values || values.length === 0) return { affectedRows: 0 };
    const query = `
        INSERT INTO ${COI_CHAM_RA_DE_TABLE}
        (giang_vien, khoa, hoc_ky, nam_hoc, dot, hinh_thuc, ten_hoc_phan, lop_hoc_phan, doi_tuong, bai_cham_1, bai_cham_2, tong_so, quy_chuan, khoa_duyet, khao_thi_duyet, id_user, he_dao_tao_id)
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