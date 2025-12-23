const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

const { DON_GIA_EXPR } = require('../queries/hopdongQueries');

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
        gv.isNghiHuu,
        da.MaPhongBan AS MaKhoaMonHoc,
        SUM(da.SoTiet) AS SoTiet,
        da.he_dao_tao,
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
        GROUP_CONCAT(DISTINCT da.khoa_sinh_vien SEPARATOR ', ') AS KhoaSinhVien,
        GROUP_CONCAT(DISTINCT da.nganh SEPARATOR ', ') AS Nganh,
        ${DON_GIA_EXPR('da', 'MaPhongBan')}                       AS TienMoiGiang,
        SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')}         AS ThanhTien,
        SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} * 0.1   AS Thue,
        SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} * 0.9   AS ThucNhan,
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
          khoa_sinh_vien,
          nganh,
          he_dao_tao,
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
          khoa_sinh_vien,
          nganh,
          he_dao_tao,
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
      JOIN gvmoi gv ON da.GiangVien = gv.HoTen AND gv.isQuanDoi = 0
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
        gv.DienThoai, gv.STK, gv.NganHang, gv.MaPhongBan, gv.isNghiHuu,
        da.NamHoc, da.Dot, da.ki, da.he_dao_tao,
        gv.NgayCapCCCD, gv.DiaChi, gv.BangTotNghiep,
        gv.NoiCongTac, gv.BangTotNghiepLoai, gv.MonGiangDayChinh,
        da.NgayBatDau, da.NgayKetThuc
    `;

        const [results] = await connection.query(query, params);

        // DEBUG: Log raw database results to check isNghiHuu field
        if (results.length > 0) {
            console.log('[DEBUG CONTROLLER] First result from DB:', {
                HoTen: results[0].HoTen,
                isNghiHuu: results[0].isNghiHuu,
                isNghiHuuType: typeof results[0].isNghiHuu,
                allKeys: Object.keys(results[0])
            });
        }

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
                        isNghiHuu: cur.isNghiHuu,
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
                        TaiChinhDuyet: cur.TaiChinhDuyet,
                        KhoaSinhVien: cur.KhoaSinhVien,
                        Nganh: cur.Nganh
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
                id: cur.he_dao_tao,  // ID để preview page sử dụng
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
        const [sotietResult] = await connection.query(`SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;
        const SoTietDinhMucChuaNghiHuu = sotietResult[0]?.GiangDayChuaNghiHuu || SoTietDinhMuc || 280;
        const SoTietDinhMucDaNghiHuu = sotietResult[0]?.GiangDayDaNghiHuu || 560;

        // console.log(enhancedGroupedByTeacher);
        return res.json({
            groupedByTeacher: simplifiedGroupedByTeacher,
            enhancedGroupedByTeacher,
            SoTietDinhMuc,
            SoTietDinhMucChuaNghiHuu,
            SoTietDinhMucDaNghiHuu,
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
                // Update with JOIN to filter by isQuanDoi = 0
                // For thesis, need to check both GiangVien1 and GiangVien2
                const [updateResult] = await connection.query(
                    `UPDATE doantotnghiep dt
                     SET dt.TaiChinhDuyet = 1
                     WHERE dt.MaPhongBan = ? AND dt.NamHoc = ? AND dt.Dot = ? AND dt.Ki = ?
                       AND dt.DaoTaoDuyet = 1 AND dt.TaiChinhDuyet != 1
                       AND dt.DaLuu = 0
                       AND (
                         EXISTS (
                           SELECT 1 FROM gvmoi gv 
                           WHERE TRIM(SUBSTRING_INDEX(dt.GiangVien1, '-', 1)) = gv.HoTen 
                             AND gv.isQuanDoi = 0
                         )
                         OR EXISTS (
                           SELECT 1 FROM gvmoi gv 
                           WHERE TRIM(SUBSTRING_INDEX(dt.GiangVien2, '-', 1)) = gv.HoTen 
                             AND gv.isQuanDoi = 0
                         )
                       )`,
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
            // Update with JOIN to filter by isQuanDoi = 0
            const [updateResult] = await connection.query(
                `UPDATE doantotnghiep dt
                 SET dt.TaiChinhDuyet = 0
                 WHERE dt.MaPhongBan = ? AND dt.NamHoc = ? AND dt.Dot = ? AND dt.Ki = ?
                   AND dt.TaiChinhDuyet = 1 AND dt.DaLuu = 0
                   AND (
                     EXISTS (
                       SELECT 1 FROM gvmoi gv 
                       WHERE TRIM(SUBSTRING_INDEX(dt.GiangVien1, '-', 1)) = gv.HoTen 
                         AND gv.isQuanDoi = 0
                     )
                     OR EXISTS (
                       SELECT 1 FROM gvmoi gv 
                       WHERE TRIM(SUBSTRING_INDEX(dt.GiangVien2, '-', 1)) = gv.HoTen 
                         AND gv.isQuanDoi = 0
                     )
                   )`,
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
        }        // Query for "Đồ án" - chỉ lấy he_dao_tao (ID), frontend sẽ mapping lấy tên
        let query = `
            SELECT
                MIN(da.NgayBatDau) AS NgayBatDau,
                MAX(da.NgayKetThuc) AS NgayKetThuc,
                da.he_dao_tao,
                da.NamHoc,
                da.Dot,
                SUM(da.SoTiet) AS SoTiet,
                100000 AS TienMoiGiang,
                SUM(da.SoTiet) * 100000 AS ThanhTien,
                SUM(da.SoTiet) * 100000 * 0.1 AS Thue,
                SUM(da.SoTiet) * 100000 * 0.9 AS ThucNhan,
                1 AS DaoTaoDuyet,
                1 AS TaiChinhDuyet,
                COUNT(DISTINCT da.GiangVien) AS SoGiangVien
            FROM (
                SELECT
                    NgayBatDau,
                    NgayKetThuc,
                    MaPhongBan,
                    TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
                    Dot,
                    NamHoc,
                    he_dao_tao,
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
                    he_dao_tao,
                    8 AS SoTiet
                FROM doantotnghiep
                WHERE GiangVien2 IS NOT NULL 
                    AND GiangVien2 != 'không'
                    AND GiangVien2 != ''
                    AND (GiangVien2 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
                    AND NamHoc = ?
                    AND Dot = ?
            ) da
            JOIN gvmoi gv ON da.GiangVien = gv.HoTen AND gv.isQuanDoi = 0
            LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan
            WHERE 1=1
        `;
        let params = [namHoc, dot, namHoc, dot];

        if (maPhongBan && maPhongBan !== "ALL") {
            query += " AND da.MaPhongBan = ?";
            params.push(maPhongBan);
        } query += `
            GROUP BY da.NamHoc, da.Dot, da.he_dao_tao
            ORDER BY da.he_dao_tao
        `;

        const [results] = await connection.query(query, params);

        // Debug
        console.log('[DEBUG getDuyetHopDongTheoHeDaoTao] Results count:', results.length);
        if (results.length > 0) {
            console.log('[DEBUG getDuyetHopDongTheoHeDaoTao] First result:', {
                he_dao_tao: results[0].he_dao_tao,
                allKeys: Object.keys(results[0])
            });
        }

        // Get detailed teacher information for the "Đại học" training program
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
                    gv.isNghiHuu,
                    pb.TenPhongBan,
                    
                    SUM(da.SoTiet) AS SoTiet,
                    ${DON_GIA_EXPR('da', 'MaPhongBan')} AS TienMoiGiang,
                    SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} AS ThanhTien,
                    SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} * 0.1 AS Thue,
                    SUM(da.SoTiet) * ${DON_GIA_EXPR('da', 'MaPhongBan')} * 0.9 AS ThucNhan,
                    
                    1 AS DaoTaoDuyet,
                    1 AS TaiChinhDuyet,
                    
                    GROUP_CONCAT(DISTINCT dt.TenDeTai SEPARATOR ', ') as MonHoc,
                    GROUP_CONCAT(DISTINCT dt.SinhVien SEPARATOR ', ') as Lop,
                    GROUP_CONCAT(DISTINCT dt.MaSV SEPARATOR ', ') as SiSo,
                    GROUP_CONCAT(DISTINCT dt.khoa_sinh_vien SEPARATOR ', ') as KhoaSinhVien,
                    GROUP_CONCAT(DISTINCT dt.nganh SEPARATOR ', ') as Nganh

                FROM (
                    SELECT
                        MaPhongBan,
                        he_dao_tao,
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
                        he_dao_tao,
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
                JOIN gvmoi gv ON da.GiangVien = gv.HoTen AND gv.isQuanDoi = 0
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
                    gv.STK, gv.NganHang, gv.MaPhongBan, gv.isNghiHuu, pb.TenPhongBan
                ORDER BY SoTiet DESC, gv.HoTen
            `; const [teacherDetails] = await connection.query(teacherQueryWithFilter, teacherParams);

            // DEBUG: Check isNghiHuu and HSL in database results
            if (teacherDetails.length > 0) {
                console.log('[DEBUG CONTROLLER HE DAO TAO] First teacher from DB:', {
                    teacher: teacherDetails[0].HoTen,
                    isNghiHuu: teacherDetails[0].isNghiHuu,
                    isNghiHuuType: typeof teacherDetails[0].isNghiHuu,
                    HSL: teacherDetails[0].HSL,
                    HSLType: typeof teacherDetails[0].HSL,
                    allKeys: Object.keys(teacherDetails[0])
                });
            }

            // Original HSL debug
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
        const sotietQuery = `SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`;
        const [sotietResult] = await connection.query(sotietQuery);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;
        const SoTietDinhMucChuaNghiHuu = sotietResult[0]?.GiangDayChuaNghiHuu || SoTietDinhMuc || 280;
        const SoTietDinhMucDaNghiHuu = sotietResult[0]?.GiangDayDaNghiHuu || 560; res.json({
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
    checkContractFinancialApprovalStatus
};