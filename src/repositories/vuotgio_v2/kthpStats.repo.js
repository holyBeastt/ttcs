"use strict";

const TABLES = Object.freeze({
    PARENT: "vg_kthp",
    RA_DE: "vg_kthp_ra_de",
    COI_THI: "vg_kthp_coi_thi",
    CHAM_THI: "vg_kthp_cham_thi",
});

const DEPARTMENT_ALIASES = Object.freeze({
    KAT: "ATTT",
    KCB: "CB",
    KCN: "CNTT",
    KDV: "ĐTVM",
    KMM: "MM",
    VNC: "NC&HTPT",
});

const getDepartmentVariants = (deptCode) => {
    if (!deptCode || deptCode === "ALL") return [];
    const clean = String(deptCode).trim();
    const variants = new Set([clean]);
    if (DEPARTMENT_ALIASES[clean]) {
        variants.add(DEPARTMENT_ALIASES[clean]);
    }
    for (const [alias, canonical] of Object.entries(DEPARTMENT_ALIASES)) {
        if (canonical.toLowerCase() === clean.toLowerCase() || alias.toLowerCase() === clean.toLowerCase()) {
            variants.add(alias);
            variants.add(canonical);
        }
    }
    return Array.from(variants);
};

const parseAcademicYearStart = (value) => {
    const match = String(value || "").match(/\b(19|20)\d{2}\b/);
    return match ? Number(match[0]) : null;
};

const buildStatsWhere = ({ namHoc, namHocFrom, namHocTo, loaiKthp, scope, khoa, keyword }) => {
    const fromYear = parseAcademicYearStart(namHocFrom);
    const toYear = parseAcademicYearStart(namHocTo);
    const hasYearRange = fromYear !== null && toYear !== null;

    const conditions = [];
    const params = [];

    if (hasYearRange) {
        const startY = Math.min(fromYear, toYear);
        const endY = Math.max(fromYear, toYear);
        conditions.push("CAST(SUBSTRING(TRIM(p.nam_hoc), 1, 4) AS UNSIGNED) BETWEEN ? AND ?");
        params.push(startY, endY);
    } else {
        const target = String(namHoc || namHocFrom || "").trim();
        conditions.push("(p.nam_hoc = ? OR REPLACE(p.nam_hoc, ' ', '') = REPLACE(?, ' ', ''))");
        params.push(target, target);
    }

    // CHÍNH THỨC: Phải duyệt đủ 2 cấp (khoa và khảo thí)
    // DỰ KIẾN: Chưa duyệt đủ 2 cấp (loại trừ các bản ghi đã duyệt đủ)
    if (scope === "OFFICIAL") {
        conditions.push("p.khoa_duyet = 1 AND p.khao_thi_duyet = 1");
    } else if (scope === "PREVIEW") {
        conditions.push("(COALESCE(p.khoa_duyet, 0) = 0 OR COALESCE(p.khao_thi_duyet, 0) = 0)");
    }

    if (loaiKthp && loaiKthp !== "ALL") {
        if (loaiKthp === "RA_DE") {
            conditions.push("p.loai_kthp IN ('RA_DE', 'NGAN_HANG_CAU_HOI')");
        } else {
            conditions.push("p.loai_kthp = ?");
            params.push(loaiKthp);
        }
    }

    if (khoa && khoa !== "ALL") {
        const variants = getDepartmentVariants(khoa);
        const placeholders = variants.map(() => "?").join(",");
        conditions.push(`(
            p.khoa IN (${placeholders}) 
            OR nv.MaPhongBan IN (${placeholders}) 
            OR pb.MaPhongBan IN (${placeholders}) 
            OR pb.TenPhongBan = ?
        )`);
        params.push(...variants, ...variants, ...variants, khoa);
    }

    if (keyword && String(keyword).trim() !== "") {
        conditions.push("(p.giang_vien LIKE ? OR nv.TenNhanVien LIKE ?)");
        const kw = `%${String(keyword).trim()}%`;
        params.push(kw, kw);
    }

    return { where: conditions.join(" AND "), params };
};

const getFilters = async (connection) => {
    // Lấy danh sách các khoa có trong phongban và có trong vg_kthp
    const [khoaRows] = await connection.query(`
        SELECT DISTINCT MaPhongBan, TenPhongBan FROM (
            SELECT MaPhongBan, COALESCE(TenPhongBan, MaPhongBan) AS TenPhongBan 
            FROM phongban 
            WHERE MaPhongBan IS NOT NULL AND MaPhongBan != ''
            UNION
            SELECT DISTINCT p.khoa AS MaPhongBan, COALESCE(pb.TenPhongBan, p.khoa) AS TenPhongBan
            FROM ${TABLES.PARENT} p
            LEFT JOIN phongban pb ON (pb.MaPhongBan = p.khoa)
            WHERE p.khoa IS NOT NULL AND p.khoa != ''
        ) AS combined
        ORDER BY TenPhongBan ASC, MaPhongBan ASC
    `);

    const [namHocRows] = await connection.query(`
        SELECT NamHoc, trangthai FROM namhoc ORDER BY id DESC
    `).catch(async () => {
        return connection.query(`
            SELECT DISTINCT nam_hoc AS NamHoc, 0 AS trangthai FROM ${TABLES.PARENT} 
            WHERE nam_hoc IS NOT NULL AND nam_hoc != '' ORDER BY nam_hoc DESC
        `);
    });

    return {
        khoaList: khoaRows,
        namHocList: namHocRows[0] || namHocRows,
    };
};

const listLecturerSummary = async (connection, { namHoc, namHocFrom, namHocTo, khoa = "ALL", loaiKthp = "ALL", keyword = "", scope = "OFFICIAL", lecturerId = null }) => {
    const { where, params } = buildStatsWhere({ namHoc, namHocFrom, namHocTo, loaiKthp, scope, khoa, keyword });

    let query = `
        SELECT
            p.id_user AS lecturer_id,
            COALESCE(nv.TenNhanVien, p.giang_vien) AS ten_nhan_vien,
            p.giang_vien,
            COALESCE(nv.MaPhongBan, p.khoa) AS ma_phong_ban,
            COALESCE(pb.TenPhongBan, nv.MaPhongBan, p.khoa) AS ten_phong_ban,
            COUNT(p.id) AS cong_viec_count,
            COALESCE(SUM(p.quy_chuan), 0) AS tong_so_tiet_qc,
            COALESCE(SUM(CASE WHEN p.loai_kthp = 'COI_THI' THEN p.quy_chuan ELSE 0 END), 0) AS so_tiet_coi_thi,
            COALESCE(SUM(CASE WHEN p.loai_kthp IN ('RA_DE', 'NGAN_HANG_CAU_HOI') THEN p.quy_chuan ELSE 0 END), 0) AS so_tiet_ra_de,
            COALESCE(SUM(CASE WHEN p.loai_kthp = 'CHAM_THI' THEN p.quy_chuan ELSE 0 END), 0) AS so_tiet_cham_thi,
            COUNT(CASE WHEN p.loai_kthp = 'COI_THI' THEN 1 END) AS so_luot_coi_thi,
            COUNT(CASE WHEN p.loai_kthp IN ('RA_DE', 'NGAN_HANG_CAU_HOI') THEN 1 END) AS so_luot_ra_de,
            COUNT(CASE WHEN p.loai_kthp = 'CHAM_THI' THEN 1 END) AS so_luot_cham_thi
        FROM ${TABLES.PARENT} p
        LEFT JOIN nhanvien nv ON nv.id_User = p.id_user
        LEFT JOIN phongban pb ON (pb.id = nv.phongban_id OR pb.MaPhongBan = nv.MaPhongBan OR pb.MaPhongBan = p.khoa)
        WHERE ${where}
    `;

    if (lecturerId) {
        query += " AND p.id_user = ?";
        params.push(Number(lecturerId));
    }

    query += `
        GROUP BY 
            p.id_user, 
            COALESCE(nv.TenNhanVien, p.giang_vien), 
            p.giang_vien, 
            COALESCE(nv.MaPhongBan, p.khoa), 
            COALESCE(pb.TenPhongBan, nv.MaPhongBan, p.khoa)
        ORDER BY tong_so_tiet_qc DESC, ten_nhan_vien ASC
    `;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const listLecturerRecords = async (connection, { lecturerId, namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", scope = "OFFICIAL", khoa = "ALL" }) => {
    const { where, params } = buildStatsWhere({ namHoc, namHocFrom, namHocTo, loaiKthp, scope, khoa });

    const query = `
        SELECT
            p.id,
            p.id_user,
            p.giang_vien,
            p.khoa,
            p.hoc_ky,
            p.dot,
            p.nam_hoc,
            p.loai_kthp,
            CASE p.loai_kthp
                WHEN 'RA_DE' THEN 'Ra đề'
                WHEN 'NGAN_HANG_CAU_HOI' THEN 'Ngân hàng câu hỏi'
                WHEN 'COI_THI' THEN 'Coi thi'
                WHEN 'CHAM_THI' THEN 'Chấm thi'
            END AS loai_kthp_label,
            p.ten_hoc_phan,
            p.ma_hoc_phan,
            p.lop_hoc_phan,
            COALESCE(hdt.he_dao_tao, p.doi_tuong) AS he_dao_tao,
            p.so_tc,
            p.so_sv,
            p.hinh_thuc_thi,
            p.he_so,
            p.quy_chuan,
            p.ghi_chu,
            p.khoa_duyet,
            p.khao_thi_duyet,
            ct.ngay_thi,
            ct.ca_thi,
            ct.thoi_gian,
            ct.phong_thi,
            ch.so_bai_phach,
            ch.vai_tro,
            rd.so_luong AS so_luong_de
        FROM ${TABLES.PARENT} p
        LEFT JOIN nhanvien nv ON nv.id_User = p.id_user
        LEFT JOIN phongban pb ON (pb.id = nv.phongban_id OR pb.MaPhongBan = nv.MaPhongBan OR pb.MaPhongBan = p.khoa)
        LEFT JOIN he_dao_tao hdt ON hdt.id = p.he_dao_tao_id
        LEFT JOIN ${TABLES.COI_THI} ct ON ct.kthp_id = p.id
        LEFT JOIN ${TABLES.CHAM_THI} ch ON ch.kthp_id = p.id
        LEFT JOIN ${TABLES.RA_DE} rd ON rd.kthp_id = p.id
        WHERE p.id_user = ? AND ${where}
        ORDER BY p.hoc_ky ASC, p.loai_kthp ASC, p.id ASC
    `;

    const [rows] = await connection.execute(query, [Number(lecturerId), ...params]);
    return rows;
};

const listFacultySummary = async (connection, { namHoc, namHocFrom, namHocTo, khoaId = "ALL", loaiKthp = "ALL", scope = "OFFICIAL" }) => {
    const { where, params } = buildStatsWhere({ namHoc, namHocFrom, namHocTo, loaiKthp, scope, khoa: khoaId });

    const query = `
        SELECT
            COALESCE(pb.MaPhongBan, nv.MaPhongBan, p.khoa) AS ma_phong_ban,
            COALESCE(pb.TenPhongBan, nv.MaPhongBan, p.khoa) AS ten_phong_ban,
            COUNT(DISTINCT p.id_user) AS gv_count,
            COUNT(p.id) AS cong_viec_count,
            COALESCE(SUM(p.quy_chuan), 0) AS tong_so_tiet_qc,
            COALESCE(SUM(CASE WHEN p.loai_kthp = 'COI_THI' THEN p.quy_chuan ELSE 0 END), 0) AS so_tiet_coi_thi,
            COALESCE(SUM(CASE WHEN p.loai_kthp IN ('RA_DE', 'NGAN_HANG_CAU_HOI') THEN p.quy_chuan ELSE 0 END), 0) AS so_tiet_ra_de,
            COALESCE(SUM(CASE WHEN p.loai_kthp = 'CHAM_THI' THEN p.quy_chuan ELSE 0 END), 0) AS so_tiet_cham_thi,
            COUNT(CASE WHEN p.loai_kthp = 'COI_THI' THEN 1 END) AS so_luot_coi_thi,
            COUNT(CASE WHEN p.loai_kthp IN ('RA_DE', 'NGAN_HANG_CAU_HOI') THEN 1 END) AS so_luot_ra_de,
            COUNT(CASE WHEN p.loai_kthp = 'CHAM_THI' THEN 1 END) AS so_luot_cham_thi
        FROM ${TABLES.PARENT} p
        LEFT JOIN nhanvien nv ON nv.id_User = p.id_user
        LEFT JOIN phongban pb ON (pb.id = nv.phongban_id OR pb.MaPhongBan = nv.MaPhongBan OR pb.MaPhongBan = p.khoa)
        WHERE ${where}
        GROUP BY 
            COALESCE(pb.MaPhongBan, nv.MaPhongBan, p.khoa), 
            COALESCE(pb.TenPhongBan, nv.MaPhongBan, p.khoa)
        ORDER BY tong_so_tiet_qc DESC, ma_phong_ban ASC
    `;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const listFacultyRecords = async (connection, { khoa, namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", scope = "OFFICIAL" }) => {
    const { where, params } = buildStatsWhere({ namHoc, namHocFrom, namHocTo, loaiKthp, scope, khoa });

    const query = `
        SELECT
            p.id,
            p.id_user,
            p.giang_vien,
            p.khoa,
            p.hoc_ky,
            p.dot,
            p.nam_hoc,
            p.loai_kthp,
            CASE p.loai_kthp
                WHEN 'RA_DE' THEN 'Ra đề'
                WHEN 'NGAN_HANG_CAU_HOI' THEN 'Ngân hàng câu hỏi'
                WHEN 'COI_THI' THEN 'Coi thi'
                WHEN 'CHAM_THI' THEN 'Chấm thi'
            END AS loai_kthp_label,
            p.ten_hoc_phan,
            p.ma_hoc_phan,
            p.lop_hoc_phan,
            COALESCE(hdt.he_dao_tao, p.doi_tuong) AS he_dao_tao,
            p.so_tc,
            p.so_sv,
            p.hinh_thuc_thi,
            p.he_so,
            p.quy_chuan,
            p.ghi_chu,
            p.khoa_duyet,
            p.khao_thi_duyet,
            ct.ngay_thi,
            ct.ca_thi,
            ct.thoi_gian,
            ct.phong_thi,
            ch.so_bai_phach,
            ch.vai_tro,
            rd.so_luong AS so_luong_de
        FROM ${TABLES.PARENT} p
        LEFT JOIN nhanvien nv ON nv.id_User = p.id_user
        LEFT JOIN phongban pb ON (pb.id = nv.phongban_id OR pb.MaPhongBan = nv.MaPhongBan OR pb.MaPhongBan = p.khoa)
        LEFT JOIN he_dao_tao hdt ON hdt.id = p.he_dao_tao_id
        LEFT JOIN ${TABLES.COI_THI} ct ON ct.kthp_id = p.id
        LEFT JOIN ${TABLES.CHAM_THI} ch ON ch.kthp_id = p.id
        LEFT JOIN ${TABLES.RA_DE} rd ON rd.kthp_id = p.id
        WHERE ${where}
        ORDER BY p.giang_vien ASC, p.hoc_ky ASC, p.loai_kthp ASC, p.id ASC
    `;

    const [rows] = await connection.execute(query, params);
    return rows;
};

const listInstituteSummary = async (connection, { namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", scope = "OFFICIAL" }) => {
    const { where, params } = buildStatsWhere({ namHoc, namHocFrom, namHocTo, loaiKthp, scope });

    const queryByType = `
        SELECT
            CASE
                WHEN p.loai_kthp IN ('RA_DE', 'NGAN_HANG_CAU_HOI') THEN 'RA_DE'
                ELSE p.loai_kthp
            END AS loai_kthp_group,
            CASE
                WHEN p.loai_kthp IN ('RA_DE', 'NGAN_HANG_CAU_HOI') THEN 'Ra đề thi'
                WHEN p.loai_kthp = 'COI_THI' THEN 'Coi thi'
                WHEN p.loai_kthp = 'CHAM_THI' THEN 'Chấm thi'
                ELSE 'Khác'
            END AS loai_kthp_label,
            COUNT(DISTINCT p.id_user) AS gv_count,
            COUNT(p.id) AS cong_viec_count,
            COALESCE(SUM(p.quy_chuan), 0) AS tong_so_tiet_qc
        FROM ${TABLES.PARENT} p
        LEFT JOIN nhanvien nv ON nv.id_User = p.id_user
        LEFT JOIN phongban pb ON (pb.id = nv.phongban_id OR pb.MaPhongBan = nv.MaPhongBan OR pb.MaPhongBan = p.khoa)
        WHERE ${where}
        GROUP BY loai_kthp_group, loai_kthp_label
        ORDER BY tong_so_tiet_qc DESC
    `;

    const queryOverview = `
        SELECT
            COUNT(DISTINCT p.id_user) AS tong_gv,
            COUNT(DISTINCT COALESCE(pb.MaPhongBan, nv.MaPhongBan, p.khoa)) AS tong_khoa,
            COUNT(p.id) AS tong_cong_viec,
            COALESCE(SUM(p.quy_chuan), 0) AS tong_so_tiet_qc,
            COALESCE(SUM(CASE WHEN p.loai_kthp = 'COI_THI' THEN p.quy_chuan ELSE 0 END), 0) AS so_tiet_coi_thi,
            COALESCE(SUM(CASE WHEN p.loai_kthp IN ('RA_DE', 'NGAN_HANG_CAU_HOI') THEN p.quy_chuan ELSE 0 END), 0) AS so_tiet_ra_de,
            COALESCE(SUM(CASE WHEN p.loai_kthp = 'CHAM_THI' THEN p.quy_chuan ELSE 0 END), 0) AS so_tiet_cham_thi
        FROM ${TABLES.PARENT} p
        LEFT JOIN nhanvien nv ON nv.id_User = p.id_user
        LEFT JOIN phongban pb ON (pb.id = nv.phongban_id OR pb.MaPhongBan = nv.MaPhongBan OR pb.MaPhongBan = p.khoa)
        WHERE ${where}
    `;

    const [byType] = await connection.execute(queryByType, params);
    const [overviewRows] = await connection.execute(queryOverview, params);

    return {
        byType,
        overview: overviewRows[0] || {
            tong_gv: 0,
            tong_khoa: 0,
            tong_cong_viec: 0,
            tong_so_tiet_qc: 0,
            so_tiet_coi_thi: 0,
            so_tiet_ra_de: 0,
            so_tiet_cham_thi: 0,
        },
    };
};

const listInstituteRecords = async (connection, { namHoc, namHocFrom, namHocTo, loaiKthp = "ALL", khoa = "ALL", scope = "OFFICIAL" }) => {
    const { where, params } = buildStatsWhere({ namHoc, namHocFrom, namHocTo, loaiKthp, scope, khoa });

    const query = `
        SELECT
            p.id,
            p.id_user,
            p.giang_vien,
            p.khoa,
            COALESCE(pb.TenPhongBan, nv.MaPhongBan, p.khoa) AS ten_phong_ban,
            p.hoc_ky,
            p.dot,
            p.nam_hoc,
            p.loai_kthp,
            CASE p.loai_kthp
                WHEN 'RA_DE' THEN 'Ra đề'
                WHEN 'NGAN_HANG_CAU_HOI' THEN 'Ngân hàng câu hỏi'
                WHEN 'COI_THI' THEN 'Coi thi'
                WHEN 'CHAM_THI' THEN 'Chấm thi'
            END AS loai_kthp_label,
            p.ten_hoc_phan,
            p.ma_hoc_phan,
            p.lop_hoc_phan,
            COALESCE(hdt.he_dao_tao, p.doi_tuong) AS he_dao_tao,
            p.so_tc,
            p.so_sv,
            p.hinh_thuc_thi,
            p.he_so,
            p.quy_chuan,
            p.ghi_chu,
            p.khoa_duyet,
            p.khao_thi_duyet,
            ct.ngay_thi,
            ct.ca_thi,
            ct.thoi_gian,
            ct.phong_thi,
            ch.so_bai_phach,
            ch.vai_tro,
            rd.so_luong AS so_luong_de
        FROM ${TABLES.PARENT} p
        LEFT JOIN nhanvien nv ON nv.id_User = p.id_user
        LEFT JOIN phongban pb ON (pb.id = nv.phongban_id OR pb.MaPhongBan = nv.MaPhongBan OR pb.MaPhongBan = p.khoa)
        LEFT JOIN he_dao_tao hdt ON hdt.id = p.he_dao_tao_id
        LEFT JOIN ${TABLES.COI_THI} ct ON ct.kthp_id = p.id
        LEFT JOIN ${TABLES.CHAM_THI} ch ON ch.kthp_id = p.id
        LEFT JOIN ${TABLES.RA_DE} rd ON rd.kthp_id = p.id
        WHERE ${where}
        ORDER BY p.khoa ASC, p.giang_vien ASC, p.loai_kthp ASC, p.id ASC
    `;

    const [rows] = await connection.execute(query, params);
    return rows;
};

module.exports = {
    getFilters,
    listLecturerSummary,
    listLecturerRecords,
    listFacultySummary,
    listFacultyRecords,
    listInstituteSummary,
    listInstituteRecords,
};
