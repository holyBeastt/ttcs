"use strict";

const {
    KTHP_TYPES,
    KTHP_DETAIL_KINDS,
    detailKindForType,
} = require("../../constants/vuotgio_v2/kthp.constant");

const TABLES = Object.freeze({
    PARENT: "vg_kthp",
    RA_DE: "vg_kthp_ra_de",
    COI_THI: "vg_kthp_coi_thi",
    CHAM_THI: "vg_kthp_cham_thi",
});

const typeLabelSql = (alias = "p") => `CASE ${alias}.loai_kthp
    WHEN 'RA_DE' THEN 'Ra đề'
    WHEN 'NGAN_HANG_CAU_HOI' THEN 'Ngân hàng câu hỏi'
    WHEN 'COI_THI' THEN 'Coi thi'
    WHEN 'CHAM_THI' THEN 'Chấm thi'
END`;

const totalSql = (alias = "p") => `CASE ${alias}.loai_kthp
    WHEN 'RA_DE' THEN rd.so_luong
    WHEN 'NGAN_HANG_CAU_HOI' THEN rd.so_luong
    WHEN 'COI_THI' THEN NULL
    WHEN 'CHAM_THI' THEN ch.so_bai_phach
END`;

const joinedSelect = () => `
    p.id,
    p.id_user,
    p.id_user AS id_User,
    p.giang_vien AS giangvien,
    p.giang_vien,
    p.khoa,
    p.hoc_ky AS ki,
    p.hoc_ky,
    p.dot,
    p.nam_hoc AS namhoc,
    p.nam_hoc,
    p.loai_kthp AS activity_type,
    p.loai_kthp,
    ${typeLabelSql()} AS hinhthuc,
    ${typeLabelSql()} AS hinh_thuc,
    p.ten_hoc_phan AS tenhocphan,
    p.ten_hoc_phan,
    p.ma_hoc_phan AS mahocphan,
    p.ma_hoc_phan,
    p.lop_hoc_phan AS lophocphan,
    p.lop_hoc_phan,
    COALESCE(hdt.he_dao_tao, p.doi_tuong) AS doituong,
    COALESCE(hdt.he_dao_tao, p.doi_tuong) AS doi_tuong,
    p.he_dao_tao_id,
    p.so_tc,
    p.so_sv,
    p.hinh_thuc_thi AS hinhthucthi,
    p.hinh_thuc_thi,
    p.he_so AS heso,
    p.he_so,
    p.quy_chuan AS sotietqc,
    p.quy_chuan,
    p.ghi_chu AS ghichu,
    p.ghi_chu,
    p.khoa_duyet AS khoaduyet,
    p.khoa_duyet,
    p.khao_thi_duyet AS khaothiduyet,
    p.khao_thi_duyet,
    ${totalSql()} AS tongso,
    ${totalSql()} AS tong_so,
    rd.so_luong,
    ct.ngay_thi AS ngaythi,
    ct.ngay_thi,
    ct.ca_thi AS cathi,
    ct.ca_thi,
    ct.thoi_gian AS thoigian,
    ct.thoi_gian,
    ct.phong_thi AS phongthi,
    ct.phong_thi,
    ch.so_bai_phach AS sobaiphach,
    ch.so_bai_phach,
    ch.vai_tro AS vaitro,
    ch.vai_tro,
    COALESCE(hdt.he_dao_tao, p.doi_tuong, 'Không xác định') AS ten_he_dao_tao
`;

const joinedFrom = () => `
    FROM ${TABLES.PARENT} p
    LEFT JOIN he_dao_tao hdt ON hdt.id = p.he_dao_tao_id
    LEFT JOIN ${TABLES.RA_DE} rd ON rd.kthp_id = p.id
    LEFT JOIN ${TABLES.COI_THI} ct ON ct.kthp_id = p.id
    LEFT JOIN ${TABLES.CHAM_THI} ch ON ch.kthp_id = p.id
`;

const assertParent = (parent) => {
    const required = [
        "employeeId",
        "employeeName",
        "department",
        "semester",
        "academicYear",
        "round",
        "activityType",
        ...(parent.activityType === KTHP_TYPES.COI_THI ? [] : ["courseName"]),
        "educationSystemId",
        "standardHours",
    ];
    for (const field of required) {
        if (parent?.[field] === null || parent?.[field] === undefined || parent?.[field] === "") {
            throw new Error(`Missing KTHP parent field: ${field}`);
        }
    }
    detailKindForType(parent.activityType);
};

const parentValues = (parent) => [
    parent.employeeId,
    parent.employeeName,
    parent.department,
    parent.academicYear,
    parent.semester,
    parent.round,
    parent.activityType,
    parent.courseName,
    parent.courseCode,
    parent.className,
    parent.credits,
    parent.studentCount,
    parent.educationSystemId,
    parent.educationSystemName,
    parent.examForm,
    parent.coefficient,
    parent.standardHours,
    parent.notes,
];

const insertParent = async (connection, parent) => {
    assertParent(parent);
    const [result] = await connection.execute(
        `INSERT INTO ${TABLES.PARENT} (
            id_user, giang_vien, khoa, nam_hoc, hoc_ky, dot, loai_kthp,
            ten_hoc_phan, ma_hoc_phan, lop_hoc_phan, so_tc, so_sv,
            he_dao_tao_id, doi_tuong, hinh_thuc_thi, he_so,
            quy_chuan, ghi_chu, khoa_duyet, khao_thi_duyet
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)`,
        parentValues(parent)
    );
    return result.insertId;
};

const assertDetail = (detailKind, detail) => {
    if (detailKind === KTHP_DETAIL_KINDS.RA_DE) {
        if (!Number.isInteger(detail?.quantity) || detail.quantity <= 0) {
            throw new Error("Invalid KTHP RA_DE detail");
        }
        return;
    }
    if (detailKind === KTHP_DETAIL_KINDS.COI_THI) {
        if (!detail?.examDate) {
            throw new Error("Invalid KTHP COI_THI detail");
        }
        if (detail.duration !== null
            && detail.duration !== undefined
            && (!Number.isInteger(detail.duration) || detail.duration < 0)) {
            throw new Error("Invalid KTHP COI_THI duration");
        }
        return;
    }
    if (detailKind === KTHP_DETAIL_KINDS.CHAM_THI) {
        if (!detail?.role
            || !Number.isInteger(detail.markedCount)
            || detail.markedCount <= 0) {
            throw new Error("Invalid KTHP CHAM_THI detail");
        }
        return;
    }
    throw new Error(`Unsupported KTHP detail kind: ${detailKind}`);
};

const insertDetail = async (connection, kthpId, detailKind, detail) => {
    if (!Number(kthpId)) throw new Error("Missing KTHP parent id");
    assertDetail(detailKind, detail);
    if (detailKind === KTHP_DETAIL_KINDS.RA_DE) {
        await connection.execute(
            `INSERT INTO ${TABLES.RA_DE} (kthp_id, so_luong) VALUES (?, ?)`,
            [kthpId, detail.quantity]
        );
        return;
    }
    if (detailKind === KTHP_DETAIL_KINDS.COI_THI) {
        await connection.execute(
            `INSERT INTO ${TABLES.COI_THI}
                (kthp_id, ngay_thi, ca_thi, thoi_gian, phong_thi)
             VALUES (?, ?, ?, ?, ?)`,
            [
                kthpId,
                detail.examDate,
                detail.shift,
                detail.duration,
                detail.room,
            ]
        );
        return;
    }
    if (detailKind === KTHP_DETAIL_KINDS.CHAM_THI) {
        await connection.execute(
            `INSERT INTO ${TABLES.CHAM_THI}
                (kthp_id, so_bai_phach, vai_tro)
             VALUES (?, ?, ?)`,
            [
                kthpId,
                detail.markedCount,
                detail.role,
            ]
        );
        return;
    }
    throw new Error(`Unsupported KTHP detail kind: ${detailKind}`);
};

const create = async (connection, model) => {
    if (model.detailKind !== detailKindForType(model.parent.activityType)) {
        throw new Error("KTHP parent type and detail kind do not match");
    }
    const id = await insertParent(connection, model.parent);
    await insertDetail(connection, id, model.detailKind, model.detail);
    return id;
};

const getTable = async (connection, { namHoc, khoa, heDaoTao, dot, ki }) => {
    let query = `SELECT ${joinedSelect()} ${joinedFrom()} WHERE p.nam_hoc = ?`;
    const params = [namHoc];
    if (khoa && khoa !== "ALL") {
        query += " AND p.khoa = ?";
        params.push(khoa);
    }
    if (heDaoTao && heDaoTao !== "ALL") {
        query += " AND p.he_dao_tao_id = ?";
        params.push(heDaoTao);
    }
    if (dot && dot !== "ALL") {
        query += " AND p.dot = ?";
        params.push(dot);
    }
    if (ki && ki !== "ALL") {
        query += " AND p.hoc_ky = ?";
        params.push(ki);
    }
    query += " ORDER BY p.loai_kthp, p.giang_vien, p.id";
    const [rows] = await connection.execute(query, params);
    return rows;
};

const getByIdForUpdate = async (connection, id) => {
    const [rows] = await connection.execute(
        `SELECT ${joinedSelect()} ${joinedFrom()} WHERE p.id = ? FOR UPDATE`,
        [id]
    );
    return rows[0] || null;
};

const updateParent = async (connection, id, parent) => {
    assertParent(parent);
    const values = parentValues(parent);
    values.splice(6, 1);
    const [result] = await connection.execute(
        `UPDATE ${TABLES.PARENT} SET
            id_user = ?,
            giang_vien = ?,
            khoa = ?,
            nam_hoc = ?,
            hoc_ky = ?,
            dot = ?,
            ten_hoc_phan = ?,
            ma_hoc_phan = ?,
            lop_hoc_phan = ?,
            so_tc = ?,
            so_sv = ?,
            he_dao_tao_id = ?,
            doi_tuong = ?,
            hinh_thuc_thi = ?,
            he_so = ?,
            quy_chuan = ?,
            ghi_chu = ?,
            khoa_duyet = 0,
            khao_thi_duyet = 0
         WHERE id = ? AND loai_kthp = ?`,
        [...values, id, parent.activityType]
    );
    return result;
};

const updateDetail = async (connection, id, detailKind, detail) => {
    assertDetail(detailKind, detail);
    if (detailKind === KTHP_DETAIL_KINDS.RA_DE) {
        const [result] = await connection.execute(
            `UPDATE ${TABLES.RA_DE} SET so_luong = ? WHERE kthp_id = ?`,
            [detail.quantity, id]
        );
        return result;
    }
    if (detailKind === KTHP_DETAIL_KINDS.COI_THI) {
        const [result] = await connection.execute(
            `UPDATE ${TABLES.COI_THI} SET
                ngay_thi = ?, ca_thi = ?, thoi_gian = ?, phong_thi = ?
             WHERE kthp_id = ?`,
            [detail.examDate, detail.shift, detail.duration, detail.room, id]
        );
        return result;
    }
    if (detailKind === KTHP_DETAIL_KINDS.CHAM_THI) {
        const [result] = await connection.execute(
            `UPDATE ${TABLES.CHAM_THI} SET
                so_bai_phach = ?, vai_tro = ?
             WHERE kthp_id = ?`,
            [
                detail.markedCount,
                detail.role,
                id,
            ]
        );
        return result;
    }
    throw new Error(`Unsupported KTHP detail kind: ${detailKind}`);
};

const update = async (connection, id, model) => {
    if (model.detailKind !== detailKindForType(model.parent.activityType)) {
        throw new Error("KTHP parent type and detail kind do not match");
    }
    const parentResult = await updateParent(connection, id, model.parent);
    if (parentResult.affectedRows !== 1) return parentResult;
    const detailResult = await updateDetail(connection, id, model.detailKind, model.detail);
    if (detailResult.affectedRows !== 1) {
        throw new Error(`KTHP detail missing for parent ${id}`);
    }
    return parentResult;
};

const remove = async (connection, id) =>
    connection.execute(`DELETE FROM ${TABLES.PARENT} WHERE id = ?`, [id]);

const updateBatchApproval = async (connection, records) => {
    let updatedCount = 0;
    for (const record of records) {
        const [result] = await connection.execute(
            `UPDATE ${TABLES.PARENT}
             SET khoa_duyet = ?, khao_thi_duyet = ?
             WHERE id = ?`,
            [record.khoa_duyet, record.khao_thi_duyet, record.id]
        );
        updatedCount += result.affectedRows;
    }
    return updatedCount;
};

const findDuplicateCandidates = async (connection, scopes) => {
    if (!Array.isArray(scopes) || scopes.length === 0) return [];
    const scopeClauses = scopes.map(() => `(
        p.id_user = ?
        AND p.nam_hoc = ?
        AND p.hoc_ky = ?
        AND p.dot = ?
        AND p.he_dao_tao_id = ?
    )`).join(" OR ");
    const params = scopes.flatMap((scope) => [
        scope.employeeId,
        scope.academicYear,
        scope.semester,
        scope.round,
        scope.educationSystemId,
    ]);
    const [rows] = await connection.execute(
        `SELECT ${joinedSelect()} ${joinedFrom()}
         WHERE ${scopeClauses}`,
        params
    );
    return rows;
};

const getApprovedByUser = async (
    connection,
    { namHoc, idUser, requireApproval = true }
) => {
    const approval = requireApproval
        ? " AND p.khoa_duyet = 1 AND p.khao_thi_duyet = 1"
        : "";
    const [rows] = await connection.execute(
        `SELECT ${joinedSelect()} ${joinedFrom()}
         WHERE p.nam_hoc = ? AND p.id_user = ?${approval}
         ORDER BY p.hoc_ky, p.loai_kthp, p.id`,
        [namHoc, idUser]
    );
    return rows;
};

const getApprovedByIds = async (
    connection,
    { namHoc, ids, requireApproval = true }
) => {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(", ");
    const approval = requireApproval
        ? " AND p.khoa_duyet = 1 AND p.khao_thi_duyet = 1"
        : "";
    const [rows] = await connection.execute(
        `SELECT ${joinedSelect()} ${joinedFrom()}
         WHERE p.nam_hoc = ? AND p.id_user IN (${placeholders})${approval}
         ORDER BY p.id_user, p.hoc_ky, p.loai_kthp, p.id`,
        [namHoc, ...ids]
    );
    return rows;
};

const getTotalsByUserIds = async (
    connection,
    { namHoc, ids, requireApproval = true }
) => {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(", ");
    const approval = requireApproval
        ? " AND khoa_duyet = 1 AND khao_thi_duyet = 1"
        : "";
    const [rows] = await connection.execute(
        `SELECT id_user AS id_User, SUM(quy_chuan) AS total
         FROM ${TABLES.PARENT}
         WHERE nam_hoc = ? AND id_user IN (${placeholders})${approval}
         GROUP BY id_user`,
        [namHoc, ...ids]
    );
    return rows;
};

const getApprovalCounts = async (connection, { namHoc, khoa }) => {
    const params = [namHoc];
    let scope = "";
    if (khoa) {
        scope = " AND khoa = ?";
        params.push(khoa);
    }
    const [rows] = await connection.execute(
        `SELECT
            COUNT(*) AS total,
            COALESCE(SUM(
                CASE WHEN khoa_duyet = 1 AND khao_thi_duyet = 1 THEN 0 ELSE 1 END
            ), 0) AS unapproved
         FROM ${TABLES.PARENT}
         WHERE nam_hoc = ?${scope}`,
        params
    );
    return {
        total: Number(rows[0].total) || 0,
        unapproved: Number(rows[0].unapproved) || 0,
    };
};

module.exports = {
    TABLES,
    joinedSelect,
    joinedFrom,
    create,
    getTable,
    getByIdForUpdate,
    update,
    remove,
    updateBatchApproval,
    findDuplicateCandidates,
    getApprovedByUser,
    getApprovedByIds,
    getTotalsByUserIds,
    getApprovalCounts,
};
