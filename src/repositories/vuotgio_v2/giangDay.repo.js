/**
 * VUOT GIO V2 - Giảng dạy (TKB) Repository
 * Date: 2026-11-09
 */

"use strict";

const getStatistics = async (connection, { dot, ki, namHoc, khoa, heDaoTao, scope = "OFFICIAL" }) => {
    const isDuKien = scope === "PREVIEW";
    let rows = [];

    if (!isDuKien) {
        // CHÍNH THỨC: Lấy từ bảng giangday (đã lưu chính thức, cơ hữu có id_User IS NOT NULL AND id_User <> 1)
        let query = `
            SELECT
                gd.id_User,
                gd.GiangVien,
                gd.TenHocPhan,
                gd.Lop,
                gd.SoTC,
                gd.Dot,
                gd.HocKy,
                gd.NamHoc,
                gd.QuyChuan,
                gd.Khoa,
                gd.he_dao_tao,
                COALESCE(hdt.he_dao_tao, gd.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
            FROM giangday gd
            LEFT JOIN he_dao_tao hdt ON hdt.id = gd.he_dao_tao
            WHERE gd.id_User IS NOT NULL AND gd.id_User <> 1
        `;
        const params = [];

        if (dot && dot !== "ALL" && dot !== "") {
            query += " AND gd.Dot = ?";
            params.push(dot);
        }
        if (ki && ki !== "ALL" && ki !== "") {
            query += " AND gd.HocKy = ?";
            params.push(ki);
        }
        if (namHoc && namHoc !== "ALL" && namHoc !== "") {
            query += " AND REPLACE(gd.NamHoc, ' ', '') = REPLACE(?, ' ', '')";
            params.push(namHoc);
        }
        if (khoa && khoa !== "ALL" && khoa !== "") {
            query += " AND gd.Khoa = ?";
            params.push(khoa);
        }
        if (heDaoTao && heDaoTao !== "ALL" && heDaoTao !== "") {
            query += " AND (gd.he_dao_tao = ? OR hdt.id = ? OR hdt.he_dao_tao = ?)";
            params.push(heDaoTao, heDaoTao, heDaoTao);
        }

        query += ` ORDER BY gd.Khoa ASC, gd.GiangVien ASC, gd.TenHocPhan ASC, gd.Lop ASC`;

        try {
            const [officialRows] = await connection.execute(query, params);
            rows = officialRows || [];
        } catch (err) {
            console.error("[giangDay.repo] Error querying giangday:", err);
            rows = [];
        }

        // Nếu bảng giangday chưa có bản ghi, fallback kiểm tra quychuan đã duyệt cả 2 cấp
        if (rows.length === 0) {
            let qcQuery = `
                SELECT
                    0 AS id_User,
                    TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) AS GiangVien,
                    qc.LopHocPhan AS TenHocPhan,
                    qc.TenLop AS Lop,
                    qc.SoTinChi AS SoTC,
                    qc.Dot,
                    qc.KiHoc AS HocKy,
                    qc.NamHoc,
                    qc.QuyChuan,
                    qc.Khoa,
                    qc.he_dao_tao,
                    COALESCE(hdt.he_dao_tao, qc.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
                FROM quychuan qc
                LEFT JOIN he_dao_tao hdt ON hdt.id = qc.he_dao_tao
                WHERE (qc.MoiGiang = 0 OR qc.MoiGiang IS NULL)
                  AND qc.KhoaDuyet = 1 AND qc.DaoTaoDuyet = 1 AND qc.DaLuu = 1
            `;
            const qcParams = [];
            if (dot && dot !== "ALL" && dot !== "") {
                qcQuery += " AND qc.Dot = ?";
                qcParams.push(dot);
            }
            if (ki && ki !== "ALL" && ki !== "") {
                qcQuery += " AND qc.KiHoc = ?";
                qcParams.push(ki);
            }
            if (namHoc && namHoc !== "ALL" && namHoc !== "") {
                qcQuery += " AND REPLACE(qc.NamHoc, ' ', '') = REPLACE(?, ' ', '')";
                qcParams.push(namHoc);
            }
            if (khoa && khoa !== "ALL" && khoa !== "") {
                qcQuery += " AND qc.Khoa = ?";
                qcParams.push(khoa);
            }
            if (heDaoTao && heDaoTao !== "ALL" && heDaoTao !== "") {
                qcQuery += " AND (qc.he_dao_tao = ? OR hdt.id = ? OR hdt.he_dao_tao = ?)";
                qcParams.push(heDaoTao, heDaoTao, heDaoTao);
            }
            qcQuery += ` ORDER BY qc.Khoa ASC, GiangVien ASC, TenHocPhan ASC, qc.TenLop ASC`;

            try {
                const [qcRows] = await connection.execute(qcQuery, qcParams);
                if (qcRows && qcRows.length > 0) {
                    rows = qcRows;
                }
            } catch (errQc) {
                console.error("[giangDay.repo] Error fallback to quychuan approved:", errQc);
            }
        }
    } else {
        // DỰ KIẾN: Lấy từ bảng quychuan (các lớp chưa hoàn tất duyệt 2 cấp)
        let query = `
            SELECT
                0 AS id_User,
                TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) AS GiangVien,
                qc.LopHocPhan AS TenHocPhan,
                qc.TenLop AS Lop,
                qc.SoTinChi AS SoTC,
                qc.Dot,
                qc.KiHoc AS HocKy,
                qc.NamHoc,
                qc.QuyChuan,
                qc.Khoa,
                qc.he_dao_tao,
                COALESCE(hdt.he_dao_tao, qc.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
            FROM quychuan qc
            LEFT JOIN he_dao_tao hdt ON hdt.id = qc.he_dao_tao
            WHERE (qc.MoiGiang = 0 OR qc.MoiGiang IS NULL)
              AND (COALESCE(qc.KhoaDuyet, 0) = 0 OR COALESCE(qc.DaoTaoDuyet, 0) = 0 OR COALESCE(qc.DaLuu, 0) = 0)
        `;
        const params = [];

        if (dot && dot !== "ALL" && dot !== "") {
            query += " AND qc.Dot = ?";
            params.push(dot);
        }
        if (ki && ki !== "ALL" && ki !== "") {
            query += " AND qc.KiHoc = ?";
            params.push(ki);
        }
        if (namHoc && namHoc !== "ALL" && namHoc !== "") {
            query += " AND REPLACE(qc.NamHoc, ' ', '') = REPLACE(?, ' ', '')";
            params.push(namHoc);
        }
        if (khoa && khoa !== "ALL" && khoa !== "") {
            query += " AND qc.Khoa = ?";
            params.push(khoa);
        }
        if (heDaoTao && heDaoTao !== "ALL" && heDaoTao !== "") {
            query += " AND (qc.he_dao_tao = ? OR hdt.id = ? OR hdt.he_dao_tao = ?)";
            params.push(heDaoTao, heDaoTao, heDaoTao);
        }

        query += ` ORDER BY qc.Khoa ASC, GiangVien ASC, TenHocPhan ASC, qc.TenLop ASC`;

        try {
            const [previewRows] = await connection.execute(query, params);
            rows = previewRows || [];
        } catch (errPrev) {
            console.error("[giangDay.repo] Error querying quychuan preview:", errPrev);
            rows = [];
        }

        // Nếu quychuan chưa có dữ liệu chưa duyệt, fallback lấy tất cả cơ hữu trong quychuan
        if (rows.length === 0) {
            let allQcQuery = `
                SELECT
                    0 AS id_User,
                    TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) AS GiangVien,
                    qc.LopHocPhan AS TenHocPhan,
                    qc.TenLop AS Lop,
                    qc.SoTinChi AS SoTC,
                    qc.Dot,
                    qc.KiHoc AS HocKy,
                    qc.NamHoc,
                    qc.QuyChuan,
                    qc.Khoa,
                    qc.he_dao_tao,
                    COALESCE(hdt.he_dao_tao, qc.he_dao_tao, 'Không xác định') AS ten_he_dao_tao
                FROM quychuan qc
                LEFT JOIN he_dao_tao hdt ON hdt.id = qc.he_dao_tao
                WHERE (qc.MoiGiang = 0 OR qc.MoiGiang IS NULL)
            `;
            const allQcParams = [];
            if (dot && dot !== "ALL" && dot !== "") {
                allQcQuery += " AND qc.Dot = ?";
                allQcParams.push(dot);
            }
            if (ki && ki !== "ALL" && ki !== "") {
                allQcQuery += " AND qc.KiHoc = ?";
                allQcParams.push(ki);
            }
            if (namHoc && namHoc !== "ALL" && namHoc !== "") {
                allQcQuery += " AND REPLACE(qc.NamHoc, ' ', '') = REPLACE(?, ' ', '')";
                allQcParams.push(namHoc);
            }
            if (khoa && khoa !== "ALL" && khoa !== "") {
                allQcQuery += " AND qc.Khoa = ?";
                allQcParams.push(khoa);
            }
            if (heDaoTao && heDaoTao !== "ALL" && heDaoTao !== "") {
                allQcQuery += " AND (qc.he_dao_tao = ? OR hdt.id = ? OR hdt.he_dao_tao = ?)";
                allQcParams.push(heDaoTao, heDaoTao, heDaoTao);
            }
            allQcQuery += ` ORDER BY qc.Khoa ASC, GiangVien ASC, TenHocPhan ASC, qc.TenLop ASC`;

            try {
                const [allRows] = await connection.execute(allQcQuery, allQcParams);
                rows = allRows || [];
            } catch (errAll) {
                console.error("[giangDay.repo] Error fallback all quychuan:", errAll);
            }
        }
    }

    return rows;
};

/**
 * Lấy danh sách tùy chọn cho toàn bộ bộ lọc trực tiếp từ các bảng cấu hình DB
 */
const getFilterOptions = async (connection) => {
    // 1. Năm học: lấy từ bảng namhoc kết hợp toàn bộ các bảng giảng dạy và đồ án
    let namHocList = [];
    try {
        const [rows] = await connection.query(`
            SELECT DISTINCT TRIM(val) AS val FROM (
                SELECT NamHoc AS val FROM namhoc WHERE NamHoc IS NOT NULL AND NamHoc <> ''
                UNION
                SELECT NamHoc AS val FROM giangday WHERE NamHoc IS NOT NULL AND NamHoc <> ''
                UNION
                SELECT NamHoc AS val FROM quychuan WHERE NamHoc IS NOT NULL AND NamHoc <> ''
                UNION
                SELECT NamHoc AS val FROM doantotnghiep WHERE NamHoc IS NOT NULL AND NamHoc <> ''
                UNION
                SELECT NamHoc AS val FROM exportdoantotnghiep WHERE NamHoc IS NOT NULL AND NamHoc <> ''
            ) t ORDER BY val DESC
        `);
        namHocList = (rows || []).map((r) => r.val).filter(Boolean);
    } catch (e) {
        console.error("[giangDay.repo] Error getting namhoc list:", e);
    }

    if (!namHocList || namHocList.length === 0) {
        namHocList = ["2027 - 2028", "2026 - 2027", "2025 - 2026", "2024 - 2025", "2023 - 2024"];
    }

    // 2. Khoa / Phòng ban: lấy từ bảng phongban (khoa) và dữ liệu thực tế trong DB
    let khoaList = [];
    try {
        const [rows] = await connection.query(`
            SELECT DISTINCT 
                TRIM(t.MaPhongBan) AS MaPhongBan, 
                TRIM(COALESCE(pb.TenPhongBan, t.TenPhongBan, t.MaPhongBan)) AS TenPhongBan
            FROM (
                SELECT MaPhongBan, TenPhongBan FROM phongban WHERE isKhoa = 1
                UNION
                SELECT DISTINCT Khoa AS MaPhongBan, Khoa AS TenPhongBan FROM giangday WHERE Khoa IS NOT NULL AND Khoa <> ''
                UNION
                SELECT DISTINCT Khoa AS MaPhongBan, Khoa AS TenPhongBan FROM quychuan WHERE Khoa IS NOT NULL AND Khoa <> ''
                UNION
                SELECT DISTINCT MaPhongBan, MaPhongBan AS TenPhongBan FROM doantotnghiep WHERE MaPhongBan IS NOT NULL AND MaPhongBan <> ''
                UNION
                SELECT DISTINCT MaPhongBan, MaPhongBan AS TenPhongBan FROM exportdoantotnghiep WHERE MaPhongBan IS NOT NULL AND MaPhongBan <> ''
            ) t
            LEFT JOIN phongban pb ON pb.MaPhongBan = t.MaPhongBan
            WHERE t.MaPhongBan IS NOT NULL AND TRIM(t.MaPhongBan) <> ''
            ORDER BY TenPhongBan ASC, MaPhongBan ASC
        `);
        khoaList = (rows || []).map((r) => {
            const code = (r.MaPhongBan || "").trim();
            const name = (r.TenPhongBan || "").trim() || code;
            const displayName = name && name.toUpperCase() !== code.toUpperCase() ? `${name} (${code})` : code;
            return {
                id: code,
                code: code,
                name: name,
                displayName: displayName
            };
        });
    } catch (e) {
        console.error("[giangDay.repo] Error getting khoa list:", e);
    }

    // 3. Hệ đào tạo: lấy trực tiếp từ bảng he_dao_tao và dữ liệu giangday/quychuan
    let heDaoTaoList = [];
    try {
        const [rows] = await connection.query(`
            SELECT DISTINCT id, he_dao_tao FROM (
                SELECT id, he_dao_tao 
                FROM he_dao_tao 
                WHERE LOWER(TRIM(COALESCE(loai_hinh, ''))) = 'mời giảng' 
                   OR (LOWER(TRIM(COALESCE(loai_hinh, ''))) != 'đồ án' AND LOWER(he_dao_tao) NOT LIKE '%đồ án%')
                UNION
                SELECT DISTINCT 
                    COALESCE(h.id, gd.he_dao_tao) AS id, 
                    COALESCE(h.he_dao_tao, gd.he_dao_tao) AS he_dao_tao
                FROM giangday gd
                LEFT JOIN he_dao_tao h ON (h.id = gd.he_dao_tao OR h.he_dao_tao = gd.he_dao_tao)
                WHERE gd.he_dao_tao IS NOT NULL AND gd.he_dao_tao <> ''
                UNION
                SELECT DISTINCT 
                    COALESCE(h.id, qc.he_dao_tao) AS id, 
                    COALESCE(h.he_dao_tao, qc.he_dao_tao) AS he_dao_tao
                FROM quychuan qc
                LEFT JOIN he_dao_tao h ON (h.id = qc.he_dao_tao OR h.he_dao_tao = qc.he_dao_tao)
                WHERE qc.he_dao_tao IS NOT NULL AND qc.he_dao_tao <> ''
            ) t ORDER BY CAST(id AS UNSIGNED) ASC, id ASC
        `);
        heDaoTaoList = (rows || []).map((r) => ({
            id: String(r.id),
            name: r.he_dao_tao
        }));
    } catch (e) {
        console.error("[giangDay.repo] Error getting he_dao_tao list:", e);
    }

    // 4. Đợt: lấy từ giangday và quychuan (đảm bảo hiển thị Đợt 1, Đợt 2)
    let dotList = [];
    try {
        const [rows] = await connection.query(`
            SELECT DISTINCT val FROM (
                SELECT Dot AS val FROM giangday WHERE Dot IS NOT NULL AND Dot <> ''
                UNION
                SELECT Dot AS val FROM quychuan WHERE Dot IS NOT NULL AND Dot <> ''
            ) t ORDER BY CAST(val AS UNSIGNED) ASC, val ASC
        `);
        const distinctDots = new Set(["1", "2"]);
        (rows || []).forEach((r) => {
            if (r.val) distinctDots.add(String(r.val));
        });
        dotList = Array.from(distinctDots)
            .sort((a, b) => Number(a) - Number(b))
            .map((d) => ({
                id: d,
                name: `Đợt ${d}`
            }));
    } catch (e) {
        console.error("[giangDay.repo] Error getting dot list:", e);
        dotList = [
            { id: "1", name: "Đợt 1" },
            { id: "2", name: "Đợt 2" }
        ];
    }

    // 5. Kỳ: lấy từ giangday và quychuan (đảm bảo hiển thị Kỳ 1, Kỳ 2)
    let kiList = [];
    try {
        const [rows] = await connection.query(`
            SELECT DISTINCT val FROM (
                SELECT HocKy AS val FROM giangday WHERE HocKy IS NOT NULL AND HocKy <> ''
                UNION
                SELECT KiHoc AS val FROM quychuan WHERE KiHoc IS NOT NULL AND KiHoc <> ''
            ) t ORDER BY CAST(val AS UNSIGNED) ASC, val ASC
        `);
        const distinctKis = new Set(["1", "2"]);
        (rows || []).forEach((r) => {
            if (r.val) distinctKis.add(String(r.val));
        });
        kiList = Array.from(distinctKis)
            .sort((a, b) => Number(a) - Number(b))
            .map((k) => ({
                id: k,
                name: `Kỳ ${k}`
            }));
    } catch (e) {
        console.error("[giangDay.repo] Error getting ki list:", e);
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

module.exports = {
    getStatistics,
    getFilterOptions
};
