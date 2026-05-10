const LNQC_TABLE = "vg_lop_ngoai_quy_chuan";
const DRAFT_TABLE = "course_schedule_details";

const buildDraftSelect = () => `
    id,
    course_id,
    course_name,
    course_code,
    major,
    lecturer,
    start_date,
    end_date,
    ll_total,
    credit_hours,
    ll_code,
    student_quantity,
    student_bonus,
    bonus_time,
    qc,
    dot,
    ki_hoc,
    nam_hoc,
    note,
    he_dao_tao
`;

const buildOfficialSelect = () => `
    id AS ID,
    id_user,
    tt,
    so_tin_chi AS SoTinChi,
    so_tin_chi,
    lop_hoc_phan AS LopHocPhan,
    lop_hoc_phan,
    ma_bo_mon AS MaBoMon,
    ma_bo_mon,
    ll AS LL,
    so_tiet_ctdt AS SoTietCTDT,
    so_tiet_ctdt,
    he_so_t7cn AS HeSoT7CN,
    he_so_t7cn,
    so_sv AS SoSV,
    he_so_lop_dong AS HeSoLopDong,
    he_so_lop_dong,
    quy_chuan AS QuyChuan,
    quy_chuan,
    hoc_ky AS KiHoc,
    hoc_ky,
    nam_hoc AS NamHoc,
    nam_hoc,
    ma_hoc_phan AS MaHocPhan,
    ma_hoc_phan,
    giang_vien AS GiangVien,
    giang_vien,
    giao_vien_giang_day AS GiaoVienGiangDay,
    giao_vien_giang_day,
    moi_giang AS MoiGiang,
    moi_giang,
    he_dao_tao_id AS he_dao_tao,
    ten_lop AS TenLop,
    ten_lop,
    khoa_duyet AS KhoaDuyet,
    dao_tao_duyet AS DaoTaoDuyet,
    tai_chinh_duyet AS TaiChinhDuyet,
    ngay_bat_dau AS NgayBatDau,
    ngay_ket_thuc AS NgayKetThuc,
    khoa AS Khoa,
    dot AS Dot,
    ghi_chu AS GhiChu,
    ghi_chu,
    hoan_thanh AS HoanThanh,
    0 AS DaLuu
`;

const getDraftTable = async (connection, { dot, kiHoc, namHoc, khoa }) => {
    let query = `
        SELECT ${buildDraftSelect()}
        FROM ${DRAFT_TABLE}
        WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? AND da_luu = 0 AND class_type = ?
    `;
    const params = [dot, kiHoc, namHoc, "ngoai_quy_chuan"];

    if (khoa && khoa !== "ALL") {
        query += ` AND major = ?`;
        params.push(khoa);
    }

    query += ` ORDER BY lecturer, course_name`;
    const [rows] = await connection.execute(query, params);
    return rows;
};

const insertDraft = async (connection, values) => {
    const query = `
        INSERT INTO ${DRAFT_TABLE}
        (tt, course_code, credit_hours, student_quantity, student_bonus, bonus_time,
         ll_code, ll_total, qc, course_name, lecturer, major, he_dao_tao, course_id,
         start_date, end_date, dot, ki_hoc, nam_hoc, note, class_type, da_luu)
        VALUES ?
    `;

    return connection.query(query, [values]);
};

const getDraftMaxTT = async (connection, { dot, kiHoc, namHoc }) => {
    const [rows] = await connection.query(
        `SELECT MAX(tt) AS maxTT FROM ${DRAFT_TABLE} WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ?`,
        [dot, kiHoc, namHoc]
    );
    return rows[0]?.maxTT || 0;
};

const updateDraftSaved = async (connection, { dot, kiHoc, namHoc, major, excludedIds }) => {
    let query = `UPDATE ${DRAFT_TABLE} SET da_luu = 1 WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? AND class_type = ?`;
    const params = [dot, kiHoc, namHoc, "ngoai_quy_chuan"];

    if (major === "ALL" && excludedIds.length > 0) {
        query += ` AND id NOT IN (${excludedIds.join(", ")})`;
    } else if (major !== "ALL") {
        query += ` AND major = ?`;
        params.push(major);
    }

    return connection.query(query, params);
};

const deleteDraftByFilter = async (connection, { namHoc, kiHoc, dot, major }) => {
    let query = `DELETE FROM ${DRAFT_TABLE} WHERE nam_hoc = ? AND class_type = ? AND da_luu = 0`;
    const params = [namHoc, "ngoai_quy_chuan"];

    if (kiHoc) {
        query += ` AND ki_hoc = ?`;
        params.push(kiHoc);
    }
    if (dot) {
        query += ` AND dot = ?`;
        params.push(dot);
    }
    if (major && major !== "ALL") {
        query += ` AND major = ?`;
        params.push(major);
    }

    return connection.execute(query, params);
};

const getOfficialTable = async (connection, { namHoc, khoa }) => {
    let query = `
        SELECT ${buildOfficialSelect()}
        FROM ${LNQC_TABLE}
        WHERE nam_hoc = ?
    `;
    const params = [namHoc];

    if (khoa && khoa !== "ALL") {
        query += ` AND khoa = ?`;
        params.push(khoa);
    }

    query += ` ORDER BY giang_vien, lop_hoc_phan`;
    const [rows] = await connection.execute(query, params);
    return rows;
};

const insertOfficialBatch = async (connection, insertValues) => {
    const query = `
        INSERT INTO ${LNQC_TABLE}
        (tt, so_tin_chi, lop_hoc_phan, ma_bo_mon, id_user, ll, so_tiet_ctdt, he_so_t7cn,
         so_sv, he_so_lop_dong, quy_chuan, hoc_ky, nam_hoc, ma_hoc_phan, giang_vien,
         giao_vien_giang_day, moi_giang, he_dao_tao_id, ten_lop, khoa_duyet, dao_tao_duyet,
         tai_chinh_duyet, ngay_bat_dau, ngay_ket_thuc, khoa, dot, ghi_chu, hoan_thanh)
        VALUES ?
    `;
    return connection.query(query, [insertValues]);
};

const updateOfficial = async (connection, id, values) => {
    const query = `
        UPDATE ${LNQC_TABLE} SET
            nam_hoc = ?, hoc_ky = ?, lop_hoc_phan = ?, ma_hoc_phan = ?, so_tin_chi = ?,
            ten_lop = ?, ll = ?, so_sv = ?, so_tiet_ctdt = ?, he_so_t7cn = ?,
            he_so_lop_dong = ?, quy_chuan = ?, giang_vien = ?, khoa = ?,
            he_dao_tao_id = ?, ghi_chu = ?, ngay_bat_dau = ?, ngay_ket_thuc = ?,
            tt = ?, ma_bo_mon = ?, giao_vien_giang_day = ?, moi_giang = ?,
            dot = ?, hoan_thanh = ?
        WHERE id = ?
    `;
    return connection.execute(query, [...values, id]);
};

const deleteOfficial = async (connection, id) => connection.execute(`DELETE FROM ${LNQC_TABLE} WHERE id = ?`, [id]);

const updateApproval = async (connection, id, column, value) =>
    connection.execute(`UPDATE ${LNQC_TABLE} SET ${column} = ? WHERE id = ?`, [value, id]);

const batchUpdateApproval = async (connection, groups) => {
    let updatedCount = 0;
    for (const [key, ids] of Object.entries(groups)) {
        const [khoa, daoTao] = key.split("_").map(Number);
        const [result] = await connection.query(
            `UPDATE ${LNQC_TABLE} SET khoa_duyet = ?, dao_tao_duyet = ? WHERE id IN (?)`,
            [khoa, daoTao, ids]
        );
        updatedCount += result.affectedRows;
    }
    return updatedCount;
};

const getLecturerIdsByNames = async (connection, names) => {
    if (!names || names.length === 0) return new Map();
    const placeholders = names.map(() => "?").join(", ");
    const [rows] = await connection.query(
        `SELECT id_User, TenNhanVien FROM nhanvien WHERE TenNhanVien IN (${placeholders})`,
        names
    );
    const map = new Map();
    rows.forEach((row) => map.set(row.TenNhanVien, row.id_User));
    return map;
};

const getKhoaList = async (connection) => {
    const [rows] = await connection.query(`SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`);
    return rows.map((row) => row.MaPhongBan);
};

module.exports = {
    LNQC_TABLE,
    buildDraftSelect,
    buildOfficialSelect,
    getDraftTable,
    insertDraft,
    getDraftMaxTT,
    updateDraftSaved,
    deleteDraftByFilter,
    getOfficialTable,
    insertOfficialBatch,
    updateOfficial,
    deleteOfficial,
    updateApproval,
    batchUpdateApproval,
    getLecturerIdsByNames,
    getKhoaList,
};