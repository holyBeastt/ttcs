/**
 * VUOT GIO V2 - Đồ án / Luận án tính vượt giờ Repository
 * Date: 2026-11-09
 */

"use strict";

const { getDoAnRowsByMode } = require("./tongHop.repo");

const buildDistinctFilterValues = async (connection) => {
    // Năm học: Lấy từ bảng namhoc kết hợp toàn bộ các bảng đồ án và giảng dạy
    let namHocList = [];
    try {
        const [namHocRows] = await connection.query(
            `SELECT DISTINCT TRIM(val) AS NamHoc FROM (
                SELECT NamHoc AS val FROM namhoc WHERE NamHoc IS NOT NULL AND NamHoc <> ''
                UNION
                SELECT NamHoc AS val FROM exportdoantotnghiep WHERE NamHoc IS NOT NULL AND NamHoc <> ''
                UNION
                SELECT NamHoc AS val FROM doantotnghiep WHERE NamHoc IS NOT NULL AND NamHoc <> ''
                UNION
                SELECT NamHoc AS val FROM giangday WHERE NamHoc IS NOT NULL AND NamHoc <> ''
                UNION
                SELECT NamHoc AS val FROM quychuan WHERE NamHoc IS NOT NULL AND NamHoc <> ''
            ) t ORDER BY NamHoc DESC`
        );
        namHocList = (namHocRows || []).map((r) => r.NamHoc).filter(Boolean);
    } catch (e) {
        console.error("[datnStats.repo] Error getting namhoc list:", e);
    }

    if (!namHocList || namHocList.length === 0) {
        namHocList = ["2027 - 2028", "2026 - 2027", "2025 - 2026", "2024 - 2025", "2023 - 2024"];
    }

    // Khoa / Phòng ban: lấy từ bảng phongban và dữ liệu thực tế trong DB
    let khoaList = [];
    try {
        const [khoaRows] = await connection.query(`
            SELECT DISTINCT 
                TRIM(t.MaPhongBan) AS MaPhongBan, 
                TRIM(COALESCE(pb.TenPhongBan, t.TenPhongBan, t.MaPhongBan)) AS TenPhongBan
            FROM (
                SELECT MaPhongBan, TenPhongBan FROM phongban WHERE isKhoa = 1
                UNION
                SELECT DISTINCT MaPhongBan, MaPhongBan AS TenPhongBan FROM doantotnghiep WHERE MaPhongBan IS NOT NULL AND MaPhongBan <> ''
                UNION
                SELECT DISTINCT MaPhongBan, MaPhongBan AS TenPhongBan FROM exportdoantotnghiep WHERE MaPhongBan IS NOT NULL AND MaPhongBan <> ''
                UNION
                SELECT DISTINCT Khoa AS MaPhongBan, Khoa AS TenPhongBan FROM giangday WHERE Khoa IS NOT NULL AND Khoa <> ''
                UNION
                SELECT DISTINCT Khoa AS MaPhongBan, Khoa AS TenPhongBan FROM quychuan WHERE Khoa IS NOT NULL AND Khoa <> ''
            ) t
            LEFT JOIN phongban pb ON pb.MaPhongBan = t.MaPhongBan
            WHERE t.MaPhongBan IS NOT NULL AND TRIM(t.MaPhongBan) <> ''
            ORDER BY TenPhongBan ASC, MaPhongBan ASC
        `);
        khoaList = (khoaRows || []).map((r) => ({
            id: r.MaPhongBan,
            code: r.MaPhongBan,
            name: r.TenPhongBan || r.MaPhongBan,
            displayName: r.TenPhongBan && r.TenPhongBan !== r.MaPhongBan ? `${r.TenPhongBan} (${r.MaPhongBan})` : r.MaPhongBan
        }));
    } catch (e) {
        console.error("[datnStats.repo] Error getting khoa list:", e);
    }

    // Hệ đào tạo: Lấy danh sách hệ đào tạo đồ án từ bảng he_dao_tao và dữ liệu đồ án
    let heDaoTaoList = [];
    try {
        const [heDaoTaoRows] = await connection.query(`
            SELECT DISTINCT id, name FROM (
                SELECT id, he_dao_tao AS name 
                FROM he_dao_tao 
                WHERE LOWER(TRIM(COALESCE(loai_hinh, ''))) = 'đồ án' 
                   OR LOWER(he_dao_tao) LIKE '%đồ án%' 
                   OR LOWER(he_dao_tao) LIKE '%luận án%'
                   OR LOWER(he_dao_tao) LIKE '%khóa luận%'
                UNION
                SELECT DISTINCT 
                    COALESCE(h.id, da.he_dao_tao) AS id, 
                    COALESCE(h.he_dao_tao, da.he_dao_tao) AS name
                FROM doantotnghiep da
                LEFT JOIN he_dao_tao h ON (h.id = da.he_dao_tao OR h.he_dao_tao = da.he_dao_tao)
                WHERE da.he_dao_tao IS NOT NULL AND da.he_dao_tao <> ''
                UNION
                SELECT DISTINCT 
                    COALESCE(h.id, eda.he_dao_tao) AS id, 
                    COALESCE(h.he_dao_tao, eda.he_dao_tao) AS name
                FROM exportdoantotnghiep eda
                LEFT JOIN he_dao_tao h ON (h.id = eda.he_dao_tao OR h.he_dao_tao = eda.he_dao_tao)
                WHERE eda.he_dao_tao IS NOT NULL AND eda.he_dao_tao <> ''
            ) t ORDER BY CAST(id AS UNSIGNED) ASC, id ASC
        `);
        heDaoTaoList = (heDaoTaoRows || []).map((r) => ({ id: String(r.id), name: r.name }));
    } catch (e) {
        console.error("[datnStats.repo] Error getting he_dao_tao list:", e);
    }

    // Đợt: đảm bảo hiển thị Đợt 1, Đợt 2
    let dotList = [];
    try {
        const [dotRows] = await connection.query(
            `SELECT DISTINCT Dot FROM (
                SELECT Dot FROM exportdoantotnghiep WHERE Dot IS NOT NULL AND Dot <> ''
                UNION
                SELECT Dot FROM doantotnghiep WHERE Dot IS NOT NULL AND Dot <> ''
            ) t ORDER BY CAST(Dot AS UNSIGNED) ASC, Dot ASC`
        );
        const distinctDots = new Set(["1", "2"]);
        (dotRows || []).forEach((r) => {
            if (r.Dot) distinctDots.add(String(r.Dot));
        });
        dotList = Array.from(distinctDots)
            .sort((a, b) => Number(a) - Number(b))
            .map((d) => ({
                id: d,
                name: `Đợt ${d}`
            }));
    } catch (e) {
        console.error("[datnStats.repo] Error getting dot list:", e);
        dotList = [
            { id: "1", name: "Đợt 1" },
            { id: "2", name: "Đợt 2" }
        ];
    }

    // Kỳ: đảm bảo hiển thị Kỳ 1, Kỳ 2
    let kiList = [];
    try {
        const [kiRows] = await connection.query(
            `SELECT DISTINCT Ki FROM (
                SELECT ki AS Ki FROM exportdoantotnghiep WHERE ki IS NOT NULL AND ki <> ''
                UNION
                SELECT Ki FROM doantotnghiep WHERE Ki IS NOT NULL AND Ki <> ''
            ) t ORDER BY CAST(Ki AS UNSIGNED) ASC, Ki ASC`
        );
        const distinctKis = new Set(["1", "2"]);
        (kiRows || []).forEach((r) => {
            if (r.Ki) distinctKis.add(String(r.Ki));
        });
        kiList = Array.from(distinctKis)
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => ({
                id: k,
                name: `Kỳ ${k}`
            }));
    } catch (e) {
        console.error("[datnStats.repo] Error getting ki list:", e);
        kiList = [
            { id: "1", name: "Kỳ 1" },
            { id: "2", name: "Kỳ 2" }
        ];
    }

    return {
        namHocList,
        khoaList,
        heDaoTaoList,
        dotList,
        kiList
    };
};

/**
 * Lấy danh sách bản ghi ĐATN theo bộ lọc và scope
 */
const getRawDoAnRecords = async (connection, params = {}) => {
    const {
        scope = "OFFICIAL",
        namHoc = "",
        dot = "ALL",
        ki = "ALL",
        khoa = "ALL",
        heDaoTao = "ALL",
        keyword = "",
        lecturerId = null
    } = params;

    const isDuKien = scope === "PREVIEW";
    let rows = [];

    if (!isDuKien) {
        // CHÍNH THỨC: Lấy từ exportdoantotnghiep (Chỉ cơ hữu isMoiGiang = 0)
        let query = `
            SELECT 
                da.ID,
                da.SinhVien,
                da.MaSV,
                da.KhoaDaoTao,
                da.SoQD,
                da.TenDeTai,
                da.SoNguoi,
                da.isHDChinh,
                da.GiangVien,
                da.CCCD,
                da.isMoiGiang,
                da.SoTiet,
                da.NgayBatDau,
                da.NgayKetThuc,
                COALESCE(NULLIF(da.MaPhongBan, ''), NULLIF(nv.MaPhongBan, ''), '') AS Khoa,
                COALESCE(NULLIF(da.MaPhongBan, ''), NULLIF(nv.MaPhongBan, ''), '') AS MaPhongBan,
                da.NamHoc,
                da.ki AS Ki,
                da.Dot,
                da.he_dao_tao,
                COALESCE(hdt.he_dao_tao, da.he_dao_tao, 'Không xác định') AS ten_he_dao_tao,
                COALESCE(NULLIF(da.KhoaDaoTao, ''), NULLIF(da.khoa_sinh_vien, ''), '') AS KhoaSV,
                da.KhoaDaoTao,
                COALESCE(da.nganh, pb.TenPhongBan, '') AS Nganh,
                COALESCE(da.id_User, nv.id_User) AS id_User
            FROM exportdoantotnghiep da
            LEFT JOIN he_dao_tao hdt ON hdt.id = da.he_dao_tao
            LEFT JOIN phongban pb ON pb.MaPhongBan = da.MaPhongBan
            LEFT JOIN nhanvien nv ON da.CCCD IS NOT NULL AND da.CCCD != '' AND nv.CCCD = da.CCCD
            WHERE da.isMoiGiang = 0
        `;
        const queryParams = [];

        const targetLecturer = lecturerId || params.lecturerName || params.name;
        if (targetLecturer) {
            query += ` AND (da.GiangVien = ? OR da.id_User = ? OR nv.id_User = ?)`;
            queryParams.push(targetLecturer, targetLecturer, targetLecturer);
        }

        if (namHoc && namHoc !== "ALL") {
            query += ` AND REPLACE(da.NamHoc, ' ', '') = REPLACE(?, ' ', '')`;
            queryParams.push(namHoc);
        }
        if (dot && dot !== "ALL") {
            query += ` AND da.Dot = ?`;
            queryParams.push(dot);
        }
        if (ki && ki !== "ALL") {
            query += ` AND da.ki = ?`;
            queryParams.push(ki);
        }
        if (khoa && khoa !== "ALL") {
            query += ` AND da.MaPhongBan = ?`;
            queryParams.push(khoa);
        }
        if (heDaoTao && heDaoTao !== "ALL") {
            query += ` AND (da.he_dao_tao = ? OR hdt.id = ? OR hdt.he_dao_tao = ?)`;
            queryParams.push(heDaoTao, heDaoTao, heDaoTao);
        }

        query += ` ORDER BY COALESCE(NULLIF(da.MaPhongBan, ''), NULLIF(nv.MaPhongBan, ''), '') ASC, da.GiangVien ASC, COALESCE(NULLIF(da.KhoaDaoTao, ''), NULLIF(da.khoa_sinh_vien, ''), '') ASC, da.SinhVien ASC`;
        const [sqlRows] = await connection.execute(query, queryParams);
        rows = sqlRows || [];
    } else {
        // DỰ KIẾN: Lấy dữ liệu dự thảo chưa hoàn tất duyệt hoặc dữ liệu dự kiến
        if (namHoc && namHoc !== "ALL") {
            const predictedRows = await getDoAnRowsByMode(connection, { namHoc, isDuKien: true });
            rows = predictedRows || [];
        } else {
            // Lấy toàn bộ năm học nếu chưa chọn
            const [namHocs] = await connection.execute(
                `SELECT DISTINCT NamHoc FROM doantotnghiep WHERE NamHoc IS NOT NULL AND NamHoc <> ''`
            );
            const allPromises = (namHocs || []).map((nh) =>
                getDoAnRowsByMode(connection, { namHoc: nh.NamHoc, isDuKien: true })
            );
            const results = await Promise.all(allPromises);
            rows = results.flat();
        }

        rows = rows.map((r) => {
            const rawClass = (r.KhoaDaoTao || r.KhoaSV || "").trim();
            const svClass = rawClass || (r.khoa_sinh_vien || "").trim();
            let dept = (r.MaPhongBan || r.Khoa || "").trim();
            // Nếu dept trùng với mã lớp (ví dụ "DT5") thì không lấy làm Khoa
            if (dept && dept === svClass) {
                dept = "";
            }
            return {
                ...r,
                Khoa: dept,
                KhoaSV: svClass,
                Nganh: r.Nganh || r.nganh || ""
            };
        });

        // Lọc trong bộ nhớ cho Dự kiến
        if (dot && dot !== "ALL") {
            rows = rows.filter((r) => String(r.Dot) === String(dot));
        }
        if (ki && ki !== "ALL") {
            rows = rows.filter((r) => String(r.Ki || r.ki) === String(ki));
        }
        if (khoa && khoa !== "ALL") {
            rows = rows.filter((r) => (r.MaPhongBan || r.Khoa) === khoa);
        }
        if (heDaoTao && heDaoTao !== "ALL") {
            rows = rows.filter(
                (r) => String(r.he_dao_tao) === String(heDaoTao) || String(r.ten_he_dao_tao) === String(heDaoTao)
            );
        }
    }

    // Lọc theo giảng viên ID hoặc tên nếu có
    const targetLecturer = lecturerId || params.lecturerName || params.name;
    if (targetLecturer) {
        rows = rows.filter(
            (r) => String(r.id_User) === String(targetLecturer) ||
                   String(r.GiangVien || "").trim().toLowerCase() === String(targetLecturer).trim().toLowerCase()
        );
    }

    // Tìm kiếm theo từ khóa (Giảng viên, Sinh viên, Tên đề tài, Mã SV)
    if (keyword && keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        rows = rows.filter((r) => {
            const gv = String(r.GiangVien || "").toLowerCase();
            const sv = String(r.SinhVien || "").toLowerCase();
            const dt = String(r.TenDeTai || "").toLowerCase();
            const msv = String(r.MaSV || "").toLowerCase();
            return gv.includes(kw) || sv.includes(kw) || dt.includes(kw) || msv.includes(kw);
        });
    }

    return rows;
};

module.exports = {
    buildDistinctFilterValues,
    getRawDoAnRecords
};
