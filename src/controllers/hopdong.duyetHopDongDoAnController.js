const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

/**
 * Redner site
 */
const getDuyetHopDongPage = (req, res) => {
    try {
        res.render('hopdong.duyetHopDongDoAn.ejs');
    } catch (error) {
        console.error("Error rendering duyet hop dong page:", error);
        res.status(500).send("Internal Server Error");
    }
};

/**
 * Xem theo giảng viên 
 */
const getDuyetHopDongData = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong, ki } = req.body;
        if (!dot || !namHoc || !loaiHopDong || !ki) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Kỳ, Loại hợp đồng"
            });
        }

        // Build query with MAX(TaiChinhDuyet)
        let query = `
      SELECT
        da.NgayBatDau,
        da.NgayKetThuc,
        gv.id_Gvm,
        gv.HoTen,
        gv.GioiTinh,
        gv.NgaySinh,
        gv.CCCD,
        gv.NoiCapCCCD,
        gv.Email,
        gv.MaSoThue,
        gv.HocVi,
        gv.ChucVu,
        gv.HSL,
        gv.DienThoai,
        gv.STK,
        gv.NganHang,
        gv.MaPhongBan,
        da.MaPhongBan AS MaKhoaMonHoc,
        SUM(da.SoTiet) AS SoTiet,
        COALESCE('Đại học','Đại học') AS he_dao_tao,
        da.NamHoc,
        da.Dot,
        da.ki,
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep,
        gv.NoiCongTac,
        gv.BangTotNghiepLoai,
        gv.MonGiangDayChinh,
        GROUP_CONCAT(DISTINCT da.TenDeTai SEPARATOR ', ') AS MonHoc,
        GROUP_CONCAT(DISTINCT da.SinhVien  SEPARATOR ', ') AS Lop,
        GROUP_CONCAT(DISTINCT da.MaSV      SEPARATOR ', ') AS SiSo,
        100000                       AS TienMoiGiang,
        SUM(da.SoTiet)*100000         AS ThanhTien,
        SUM(da.SoTiet)*100000*0.1     AS Thue,
        SUM(da.SoTiet)*100000*0.9     AS ThucNhan,
        NULL                          AS SoHopDong,
        'Chưa có hợp đồng'            AS TrangThaiHopDong,
        pb.TenPhongBan,
        1                              AS DaoTaoDuyet,
        MAX(da.TaiChinhDuyet)          AS TaiChinhDuyet
      FROM (
        -- Phần dành cho Giảng viên 1
        SELECT
          NgayBatDau,
          NgayKetThuc,
          MaPhongBan,
          TRIM(SUBSTRING_INDEX(GiangVien1,'-',1)) AS GiangVien,
          Dot,
          NamHoc,
          ki,
          TenDeTai,
          SinhVien,
          MaSV,
          CASE
            WHEN GiangVien2='không' OR GiangVien2='' THEN 20
            ELSE 12
          END AS SoTiet,
          TaiChinhDuyet
        FROM doantotnghiep
        WHERE GiangVien1 IS NOT NULL
          AND GiangVien1!=''
          AND (GiangVien1 NOT LIKE '%-%'
               OR TRIM(SUBSTRING_INDEX(
                   SUBSTRING_INDEX(GiangVien1,'-',2),'-',-1
                 ))='Giảng viên mời')
          AND NamHoc=?
          AND Dot=?
          AND ki=?

        UNION ALL

        -- Phần dành cho Giảng viên 2
        SELECT
          NgayBatDau,
          NgayKetThuc,
          MaPhongBan,
          TRIM(SUBSTRING_INDEX(GiangVien2,'-',1)) AS GiangVien,
          Dot,
          NamHoc,
          ki,
          TenDeTai,
          SinhVien,
          MaSV,
          8 AS SoTiet,
          TaiChinhDuyet
        FROM doantotnghiep
        WHERE GiangVien2 IS NOT NULL
          AND GiangVien2!='không'
          AND GiangVien2!=''
          AND (GiangVien2 NOT LIKE '%-%'
               OR TRIM(SUBSTRING_INDEX(
                   SUBSTRING_INDEX(GiangVien2,'-',2),'-',-1
                 ))='Giảng viên mời')
          AND NamHoc=?
          AND Dot=?
          AND ki=?
      ) da
      JOIN gvmoi gv ON da.GiangVien = gv.HoTen and gv.isQuanDoi != 1
      LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan
      WHERE 1=1
    `;

        const params = [namHoc, dot, ki, namHoc, dot, ki];
        if (maPhongBan && maPhongBan !== "ALL") {
            query += ` AND da.MaPhongBan = ?`;
            params.push(maPhongBan);
        }

        query += `
      GROUP BY
        gv.id_Gvm, gv.HoTen, da.MaPhongBan, pb.TenPhongBan,
        gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD,
        gv.Email, gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL,
        gv.DienThoai, gv.STK, gv.NganHang, gv.MaPhongBan,
        da.NamHoc, da.Dot, da.ki,
        gv.NgayCapCCCD, gv.DiaChi, gv.BangTotNghiep,
        gv.NoiCongTac, gv.BangTotNghiepLoai, gv.MonGiangDayChinh,
        da.NgayBatDau, da.NgayKetThuc
    `;

        const [results] = await connection.query(query, params);

        // 1) Gom nhóm theo giảng viên với breakdown chương trình
        const groupedByTeacher = results.reduce((acc, cur) => {
            const t = cur.HoTen;
            if (!acc[t]) {
                acc[t] = {
                    teacherInfo: {
                        id_Gvm: cur.id_Gvm,
                        HoTen: cur.HoTen,
                        GioiTinh: cur.GioiTinh,
                        NgaySinh: cur.NgaySinh,
                        CCCD: cur.CCCD,
                        NoiCapCCCD: cur.NoiCapCCCD,
                        Email: cur.Email,
                        MaSoThue: cur.MaSoThue,
                        HocVi: cur.HocVi,
                        ChucVu: cur.ChucVu,
                        HSL: cur.HSL,
                        DienThoai: cur.DienThoai,
                        STK: cur.STK,
                        NganHang: cur.NganHang,
                        MaPhongBan: cur.MaPhongBan,
                        NgayCapCCCD: cur.NgayCapCCCD,
                        DiaChi: cur.DiaChi,
                        BangTotNghiep: cur.BangTotNghiep,
                        NoiCongTac: cur.NoiCongTac,
                        BangTotNghiepLoai: cur.BangTotNghiepLoai,
                        MonGiangDayChinh: cur.MonGiangDayChinh,
                        NgayBatDau: cur.NgayBatDau,
                        NgayKetThuc: cur.NgayKetThuc,
                        TenPhongBan: cur.TenPhongBan,
                        SoHopDong: cur.SoHopDong,
                        TrangThaiHopDong: cur.TrangThaiHopDong,
                        DaoTaoDuyet: cur.DaoTaoDuyet,
                        TaiChinhDuyet: cur.TaiChinhDuyet
                    },
                    trainingPrograms: [],
                    totalFinancials: {
                        totalSoTiet: 0,
                        totalThanhTien: 0,
                        totalThue: 0,
                        totalThucNhan: 0
                    }
                };
            }
            const prog = {
                he_dao_tao: cur.he_dao_tao,
                SoTiet: +cur.SoTiet,
                TienMoiGiang: +cur.TienMoiGiang,
                ThanhTien: +cur.ThanhTien,
                Thue: +cur.Thue,
                ThucNhan: +cur.ThucNhan,
                MaKhoaMonHoc: cur.MaKhoaMonHoc,
                MonHoc: cur.MonHoc,
                Lop: cur.Lop,
                SiSo: cur.SiSo
            };
            acc[t].trainingPrograms.push(prog);
            acc[t].totalFinancials.totalSoTiet += prog.SoTiet;
            acc[t].totalFinancials.totalThanhTien += prog.ThanhTien;
            acc[t].totalFinancials.totalThue += prog.Thue;
            acc[t].totalFinancials.totalThucNhan += prog.ThucNhan;
            return acc;
        }, {});

        // 2) Chuyển thành mảng để sort
        const teachersArr = Object.entries(groupedByTeacher).map(([name, data]) => ({
            name,
            ...data,
            totalSoTiet: data.totalFinancials.totalSoTiet,
            maPhongBan: data.teacherInfo.MaPhongBan
        }));

        // 3) MỚI: chỉ sort theo khoa
        teachersArr.sort((a, b) =>
            a.maPhongBan.localeCompare(b.maPhongBan)
        );

        // 4) Chuẩn bị output cho 2 UI
        const simplifiedGroupedByTeacher = {};
        const enhancedGroupedByTeacher = {};
        for (const t of teachersArr) {
            simplifiedGroupedByTeacher[t.name] = [{
                ...t.teacherInfo,
                SoTiet: t.totalFinancials.totalSoTiet,
                ThanhTien: t.totalFinancials.totalThanhTien,
                Thue: t.totalFinancials.totalThue,
                ThucNhan: t.totalFinancials.totalThucNhan,
                trainingPrograms: t.trainingPrograms,
                totalFinancials: t.totalFinancials
            }];
            enhancedGroupedByTeacher[t.name] = {
                teacherInfo: t.teacherInfo,
                trainingPrograms: t.trainingPrograms,
                totalFinancials: t.totalFinancials
            };
        }

        // 5) Lấy SoTietDinhMuc
        const [sotietResult] = await connection.query(`SELECT GiangDay FROM sotietdinhmuc LIMIT 1`);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;

        // console.log(enhancedGroupedByTeacher);
        return res.json({
            groupedByTeacher: simplifiedGroupedByTeacher,
            enhancedGroupedByTeacher,
            SoTietDinhMuc,
        });

    } catch (error) {
        console.error("❌ Error in getDuyetHopDongData:", error);
        return res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy dữ liệu",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) connection.release();
    }
};



/**
 * Approve contracts based on criteria
 */
const approveContracts = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !namHoc || !loaiHopDong || ki === undefined) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kì, Năm học, Loại hợp đồng"
            });
        }

        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        // Lấy danh sách khoa cần xử lý
        const faculties = [];
        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            faculties.push(maPhongBan);
        } else {
            const [rows] = await connection.query(`SELECT MaPhongBan FROM phongban`);
            faculties.push(...rows.map(f => f.MaPhongBan));
        }

        // Kiểm tra duyệt đào tạo cho từng khoa (không xét bản đã lưu DaLuu)
        const unapprovedFaculties = [];
        for (const facultyCode of faculties) {
            const [check] = await connection.query(
                `SELECT DaoTaoDuyet FROM doantotnghiep
                 WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? AND Ki = ?
                   AND DaLuu = 0`,
                [facultyCode, namHoc, dot, ki]
            );
            if (check.some(r => r.DaoTaoDuyet != 1)) {
                unapprovedFaculties.push(facultyCode);
            }
        }

        if (unapprovedFaculties.length > 0) {
            return res.status(200).json({
                success: false,
                isNotification: true,
                message: `Các khoa chưa được Đào Tạo duyệt xong: ${unapprovedFaculties.join(', ')}. Vui lòng hoàn thành trước khi duyệt tài chính.`,
                unapprovedFaculties,
                affectedRows: 0
            });
        }

        // Cập nhật duyệt tài chính cho các bản ghi chưa lưu
        let affectedRows = 0;
        for (const facultyCode of faculties) {
            // Double-check bản ghi chưa lưu
            const [checkAll] = await connection.query(
                `SELECT DaoTaoDuyet FROM doantotnghiep
                 WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? AND Ki = ?
                   AND DaoTaoDuyet = 1 AND DaLuu = 0`,
                [facultyCode, namHoc, dot, ki]
            );
            if (checkAll.length > 0) {
                const [updateResult] = await connection.query(
                    `UPDATE doantotnghiep
                     SET TaiChinhDuyet = 1
                     WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? AND Ki = ?
                       AND DaoTaoDuyet = 1 AND TaiChinhDuyet != 1
                       AND DaLuu = 0`,
                    [facultyCode, namHoc, dot, ki]
                );
                affectedRows += updateResult.affectedRows;
            }
        }

        res.json({
            success: true,
            message: `Duyệt thành công`,
            affectedRows
        });

    } catch (error) {
        console.error("Error approving contracts:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi duyệt hợp đồng"
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Unapprove contracts based on criteria (reverse of approval)
 */
const unapproveContracts = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !namHoc || !loaiHopDong || ki === undefined) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kì, Năm học, Loại hợp đồng"
            });
        }

        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        const facultiesToUpdate = [];
        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            facultiesToUpdate.push(maPhongBan);
        } else {
            const [faculties] = await connection.query(
                `SELECT DISTINCT MaPhongBan
                 FROM doantotnghiep
                 WHERE NamHoc = ? AND Dot = ? AND Ki = ?
                   AND TaiChinhDuyet = 1 AND DaLuu = 0`,
                [namHoc, dot, ki]
            );
            facultiesToUpdate.push(...faculties.map(f => f.MaPhongBan));
        }

        let affectedRows = 0;
        for (const facultyCode of facultiesToUpdate) {
            const [updateResult] = await connection.query(
                `UPDATE doantotnghiep
                 SET TaiChinhDuyet = 0
                 WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? AND Ki = ?
                   AND TaiChinhDuyet = 1 AND DaLuu = 0`,
                [facultyCode, namHoc, dot, ki]
            );
            affectedRows += updateResult.affectedRows;
        }

        res.json({
            success: true,
            message: `Bỏ duyệt thành công`,
            affectedRows
        });
    } catch (error) {
        console.error("Error unapproving contracts:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi bỏ duyệt hợp đồng"
        });
    } finally {
        if (connection) connection.release();
    }
};


/**
 * Get contract approval data grouped by training program (he_dao_tao)
 */
const getDuyetHopDongTheoHeDaoTao = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Loại hợp đồng"
            });
        }// Validate loaiHopDong - only support thesis contracts
        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }        // Query for "Đồ án" - set default training program as "Đại học" since thesis contracts don't have separate training programs
        let query = `
            SELECT
                MIN(da.NgayBatDau) AS NgayBatDau,
                MAX(da.NgayKetThuc) AS NgayKetThuc,
                'Đại học' as he_dao_tao,  -- Default training program for thesis contracts                da.NamHoc,
                da.Dot,

                -- Tính tổng số tiết cho tất cả khoa
                SUM(da.SoTiet) AS SoTiet,

                -- Mức tiền cố định cho đồ án
                100000 AS TienMoiGiang,

                -- Tính thành tiền, thuế, thực nhận
                SUM(da.SoTiet) * 100000 AS ThanhTien,
                SUM(da.SoTiet) * 100000 * 0.1 AS Thue,
                SUM(da.SoTiet) * 100000 * 0.9 AS ThucNhan,

                -- Thông tin trạng thái duyệt cho đồ án
                1 AS DaoTaoDuyet,  -- Đồ án luôn được coi là đã duyệt đào tạo
                1 AS TaiChinhDuyet, -- Placeholder

                -- Số lượng giảng viên tổng cộng
                COUNT(DISTINCT da.GiangVien) AS SoGiangVien

            FROM (
                SELECT
                    NgayBatDau,
                    NgayKetThuc,
                    MaPhongBan,                    TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
                    Dot,
                    NamHoc,
                    CASE 
                        WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 20
                        ELSE 12
                    END AS SoTiet
                FROM doantotnghiep
                WHERE GiangVien1 IS NOT NULL
                    AND GiangVien1 != ''
                    AND (GiangVien1 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')
                    AND NamHoc = ?
                    AND Dot = ?
                
                UNION ALL
                
                SELECT
                    NgayBatDau,
                    NgayKetThuc,
                    MaPhongBan,
                    TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
                    Dot,
                    NamHoc,
                    8 AS SoTiet
                FROM doantotnghiep
                WHERE GiangVien2 IS NOT NULL 
                    AND GiangVien2 != 'không'
                    AND GiangVien2 != ''
                    AND (GiangVien2 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
                    AND NamHoc = ?
                    AND Dot = ?
            ) da
            JOIN gvmoi gv ON da.GiangVien = gv.HoTen and gv.isQuanDoi != 1
            LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan
            WHERE 1=1
        `;
        let params = [namHoc, dot, namHoc, dot];

        if (maPhongBan && maPhongBan !== "ALL") {
            query += " AND da.MaPhongBan = ?";
            params.push(maPhongBan);
        } query += `
            GROUP BY
                da.NamHoc, da.Dot
            ORDER BY 'Đại học'
        `;

        const [results] = await connection.query(query, params);        // Get detailed teacher information for the "Đại học" training program
        const enhancedResults = [];

        for (const heDaoTao of results) {
            // Query to get detailed teacher info for all thesis contracts (since we group everything under "Đại học")
            const teacherQuery = `
                SELECT
                    gv.id_Gvm,
                    gv.HoTen,
                    gv.GioiTinh,
                    gv.NgaySinh,
                    gv.CCCD,
                    gv.NoiCapCCCD,
                    gv.Email,
                    gv.MaSoThue,
                    gv.HocVi,
                    gv.ChucVu,
                    gv.HSL,
                    gv.DienThoai,
                    gv.STK,
                    gv.NganHang,
                    gv.MaPhongBan,
                    pb.TenPhongBan,
                    
                    SUM(da.SoTiet) AS SoTiet,
                    100000 AS TienMoiGiang,
                    SUM(da.SoTiet) * 100000 AS ThanhTien,
                    SUM(da.SoTiet) * 100000 * 0.1 AS Thue,
                    SUM(da.SoTiet) * 100000 * 0.9 AS ThucNhan,
                    
                    1 AS DaoTaoDuyet,
                    1 AS TaiChinhDuyet,
                    
                    GROUP_CONCAT(DISTINCT dt.TenDeTai SEPARATOR ', ') as MonHoc,
                    GROUP_CONCAT(DISTINCT dt.SinhVien SEPARATOR ', ') as Lop,
                    GROUP_CONCAT(DISTINCT dt.MaSV SEPARATOR ', ') as SiSo

                FROM (
                    SELECT
                        MaPhongBan,
                        TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
                        CASE 
                            WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 20
                            ELSE 12
                        END AS SoTiet
                    FROM doantotnghiep
                    WHERE GiangVien1 IS NOT NULL
                        AND GiangVien1 != ''
                        AND (GiangVien1 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')                        AND NamHoc = ?
                        AND Dot = ?
                    
                    UNION ALL
                    
                    SELECT
                        MaPhongBan,
                        TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
                        8 AS SoTiet
                    FROM doantotnghiep
                    WHERE GiangVien2 IS NOT NULL 
                        AND GiangVien2 != 'không'
                        AND GiangVien2 != ''
                        AND (GiangVien2 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
                        AND NamHoc = ?
                        AND Dot = ?
                ) da
                JOIN gvmoi gv ON da.GiangVien = gv.HoTen
                LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan                LEFT JOIN doantotnghiep dt ON (
                    (TRIM(SUBSTRING_INDEX(dt.GiangVien1, '-', 1)) = gv.HoTen OR TRIM(SUBSTRING_INDEX(dt.GiangVien2, '-', 1)) = gv.HoTen)
                    AND dt.NamHoc = ? AND dt.Dot = ?
                    AND dt.MaPhongBan = da.MaPhongBan  -- Thêm điều kiện này để tránh duplicate
                )
                WHERE 1=1
            `;

            let teacherParams = [namHoc, dot, namHoc, dot, namHoc, dot];
            let teacherQueryWithFilter = teacherQuery;

            // Add department filter if specified
            if (maPhongBan && maPhongBan !== "ALL") {
                teacherQueryWithFilter += " AND da.MaPhongBan = ?";
                teacherParams.push(maPhongBan);
            }

            teacherQueryWithFilter += `
                GROUP BY
                    gv.id_Gvm, gv.HoTen, gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, 
                    gv.Email, gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai, 
                    gv.STK, gv.NganHang, gv.MaPhongBan, pb.TenPhongBan
                ORDER BY SoTiet DESC, gv.HoTen
            `; const [teacherDetails] = await connection.query(teacherQueryWithFilter, teacherParams);

            // Debug: Check HSL in database results
            if (teacherDetails.length > 0) {
                console.log('Database HSL Debug for first teacher:', {
                    teacher: teacherDetails[0].HoTen,
                    HSL: teacherDetails[0].HSL,
                    HSLType: typeof teacherDetails[0].HSL,
                    HSLNull: teacherDetails[0].HSL === null,
                    HSLUndefined: teacherDetails[0].HSL === undefined
                });
            }

            // Add teacher details to the training program data
            enhancedResults.push({
                ...heDaoTao,
                chiTietGiangVien: teacherDetails
            });
        }

        // Get SoTietDinhMuc
        const sotietQuery = `SELECT GiangDay FROM sotietdinhmuc LIMIT 1`;
        const [sotietResult] = await connection.query(sotietQuery);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0; res.json({
            success: true,
            data: results,
            enhancedData: enhancedResults,  // Include detailed data with teacher information
            SoTietDinhMuc: SoTietDinhMuc,
            message: `Tải dữ liệu thành công. Tìm thấy ${results.length} hệ đào tạo cho đồ án (mặc định: Đại học)`
        });

    } catch (error) {
        console.error("❌ Error in getDuyetHopDongTheoHeDaoTao:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy dữ liệu theo hệ đào tạo",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Check contract save status based on filter conditions
 */
const checkContractSaveStatus = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Loại hợp đồng"
            });
        }// Validate loaiHopDong - only support thesis contracts
        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'"
            });
        }        // Check overall status for thesis contracts
        let statusQuery = "SELECT COUNT(*) as totalRecords, COUNT(DISTINCT DaLuu) as distinctValues, MIN(DaLuu) as minValue, MAX(DaLuu) as maxVal FROM doantotnghiep dt WHERE dt.NamHoc = ? AND dt.Dot = ?";
        let statusParams = [namHoc, dot];

        if (maPhongBan && maPhongBan !== "ALL") {
            statusQuery += " AND dt.MaPhongBan = ?";
            statusParams.push(maPhongBan);
        }

        const [statusResults] = await connection.query(statusQuery, statusParams);
        const statusData = statusResults[0];

        let message;
        let unmetRecords = [];

        if (statusData.totalRecords === 0) {
            message = "Không có dữ liệu";
        } else if (statusData.distinctValues === 1 && statusData.minValue === 1) {
            // Tất cả bản ghi đều có DaLuu = 1
            message = "Đã lưu HĐ";
        } else {
            // Có bản ghi chưa đạt điều kiện - lấy chi tiết
            message = "Chưa lưu HĐ";

            let detailQuery = `
                SELECT 
                    dt.ID,
                    dt.MaPhongBan as Khoa,
                    dt.TenDeTai,
                    dt.SinhVien,
                    dt.MaSV,
                    dt.GiangVien1,
                    dt.GiangVien2,
                    dt.DaLuu,
                    dt.NgayBatDau,
                    dt.NgayKetThuc,
                    pb.TenPhongBan as TenKhoa
                FROM doantotnghiep dt
                LEFT JOIN phongban pb ON dt.MaPhongBan = pb.MaPhongBan                WHERE dt.NamHoc = ? 
                  AND dt.Dot = ? 
                  AND (dt.DaLuu IS NULL OR dt.DaLuu <> 1)
            `;
            let detailParams = [namHoc, dot];

            if (maPhongBan && maPhongBan !== "ALL") {
                detailQuery += " AND dt.MaPhongBan = ?";
                detailParams.push(maPhongBan);
            }

            const [detailResults] = await connection.query(detailQuery, detailParams);
            unmetRecords = detailResults;
        } res.json({
            success: true,
            message: message,
            data: {
                totalRecords: statusData.totalRecords,
                unmetRecords: unmetRecords,
                unmetCount: unmetRecords.length
            }
        });

    } catch (error) {
        console.error("❌ Error in checkContractSaveStatus:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi kiểm tra trạng thái lưu hợp đồng",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Debug function to compare results between two functions
 */
const debugCompareQueries = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { dot, ki, namHoc, maPhongBan } = req.body;

        console.log("🔍 DEBUG: Comparing queries for:", { dot, ki, namHoc, maPhongBan });

        // Query 1: getDuyetHopDongData style - detailed by teacher
        const detailQuery = `
            SELECT
                gv.HoTen,
                SUM(da.SoTiet) AS SoTiet,
                COUNT(*) as RecordCount
            FROM (
                SELECT
                    MaPhongBan,
                    TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
                    CASE 
                        WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 20
                        ELSE 12
                    END AS SoTiet
                FROM doantotnghiep
                WHERE GiangVien1 IS NOT NULL
                    AND GiangVien1 != ''
                    AND (GiangVien1 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')
                    AND NamHoc = ? AND Dot = ? AND ki = ?
                
                UNION ALL
                
                SELECT
                    MaPhongBan,
                    TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
                    8 AS SoTiet
                FROM doantotnghiep
                WHERE GiangVien2 IS NOT NULL 
                    AND GiangVien2 != 'không'
                    AND GiangVien2 != ''
                    AND (GiangVien2 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
                    AND NamHoc = ? AND Dot = ? AND ki = ?
            ) da
            JOIN gvmoi gv ON da.GiangVien = gv.HoTen
            WHERE 1=1
            ${maPhongBan && maPhongBan !== "ALL" ? "AND da.MaPhongBan = ?" : ""}
            GROUP BY gv.HoTen
            ORDER BY SoTiet DESC
        `;

        // Query 2: getDuyetHopDongTheoHeDaoTao style - total summary
        const summaryQuery = `
            SELECT
                SUM(da.SoTiet) AS TotalSoTiet,
                COUNT(DISTINCT da.GiangVien) AS UniqueTeachers,
                COUNT(*) as TotalRecords
            FROM (
                SELECT
                    MaPhongBan,
                    TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
                    CASE 
                        WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 20
                        ELSE 12
                    END AS SoTiet
                FROM doantotnghiep
                WHERE GiangVien1 IS NOT NULL
                    AND GiangVien1 != ''
                    AND (GiangVien1 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')
                    AND NamHoc = ? AND Dot = ? AND ki = ?
                
                UNION ALL
                
                SELECT
                    MaPhongBan,
                    TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
                    8 AS SoTiet
                FROM doantotnghiep
                WHERE GiangVien2 IS NOT NULL 
                    AND GiangVien2 != 'không'
                    AND GiangVien2 != ''
                    AND (GiangVien2 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
                    AND NamHoc = ? AND Dot = ? AND ki = ?
            ) da
            JOIN gvmoi gv ON da.GiangVien = gv.HoTen
            WHERE 1=1
            ${maPhongBan && maPhongBan !== "ALL" ? "AND da.MaPhongBan = ?" : ""}
        `;

        let params1 = [namHoc, dot, ki, namHoc, dot, ki];
        let params2 = [namHoc, dot, ki, namHoc, dot, ki];

        if (maPhongBan && maPhongBan !== "ALL") {
            params1.push(maPhongBan);
            params2.push(maPhongBan);
        }

        const [detailResults] = await connection.query(detailQuery, params1);
        const [summaryResults] = await connection.query(summaryQuery, params2);

        // Calculate total from detail results
        const calculatedTotal = detailResults.reduce((sum, row) => sum + parseFloat(row.SoTiet), 0);

        console.log("📊 DETAIL RESULTS:", detailResults);
        console.log("📈 SUMMARY RESULTS:", summaryResults[0]);
        console.log("🧮 CALCULATED TOTAL from details:", calculatedTotal);

        res.json({
            success: true,
            detailResults: detailResults,
            summaryResults: summaryResults[0],
            calculatedTotalFromDetails: calculatedTotal,
            comparison: {
                match: Math.abs(calculatedTotal - summaryResults[0].TotalSoTiet) < 0.01,
                difference: calculatedTotal - summaryResults[0].TotalSoTiet
            }
        });

    } catch (error) {
        console.error("❌ Error in debugCompareQueries:", error);
        res.status(500).json({
            success: false,
            message: "Debug error",
            error: error.message
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Check contract financial approval status based on filter conditions
 */
const checkContractFinancialApprovalStatus = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Loại hợp đồng"
            });
        }

        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        let statusQuery = "SELECT COUNT(*) as totalRecords, COUNT(DISTINCT TaiChinhDuyet) as distinctValues, MIN(TaiChinhDuyet) as minValue, MAX(TaiChinhDuyet) as maxVal FROM doantotnghiep dt WHERE dt.NamHoc = ? AND dt.Dot = ?";
        let statusParams = [namHoc, dot];

        if (maPhongBan && maPhongBan !== "ALL") {
            statusQuery += " AND dt.MaPhongBan = ?";
            statusParams.push(maPhongBan);
        }

        const [statusResults] = await connection.query(statusQuery, statusParams);
        const statusData = statusResults[0];

        let message;
        let unmetRecords = [];

        if (statusData.totalRecords === 0) {
            message = "Không tìm thấy dữ liệu nào phù hợp với điều kiện lọc";
        } else if (statusData.distinctValues === 1 && statusData.minValue === 1) {
            message = `Đã duyệt`;
        } else if (statusData.distinctValues === 1 && statusData.minValue === 0) {
            message = `Chưa duyệt`;
        } else {
            // Trường hợp có nhiều giá trị distinct (cả 0 và 1)
            message = `Chưa duyệt`;
        }

        console.log("debug tc duyet do an : " + message);
        res.json({
            success: true,
            message: message,
            data: {
                totalRecords: statusData.totalRecords,
                unmetRecords: unmetRecords,
                unmetCount: unmetRecords.length
            }
        });

    } catch (error) {
        console.error("❌ Error in checkContractFinancialApprovalStatus:");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi kiểm tra trạng thái duyệt tài chính hợp đồng",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getDuyetHopDongPage,
    getDuyetHopDongData,
    getDuyetHopDongTheoHeDaoTao,
    approveContracts,
    unapproveContracts,
    checkContractSaveStatus,
    checkContractFinancialApprovalStatus,
    debugCompareQueries
};