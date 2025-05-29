const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

/**
 * Display the contract approval page
 */
const getDuyetHopDongPage = (req, res) => {
    try {
        res.render('hopdong.duyetHopDong.ejs');
    } catch (error) {
        console.error("Error rendering duyet hop dong page:", error);
        res.status(500).send("Internal Server Error");
    }
};

/**
 * Get data for contract approval based on filters with detailed training program breakdown
 */
const getDuyetHopDongData = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan, heDaoTao } = req.body;

        let query, params;
        if (heDaoTao === "Mời giảng") {
            // Enhanced query to show financial breakdown by training program
            query = `
    SELECT
        MIN(qc.NgayBatDau) AS NgayBatDau,
        MAX(qc.NgayKetThuc) AS NgayKetThuc,
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
        qc.Khoa AS MaKhoaMonHoc,

        -- Số tiết đã xử lý theo điều kiện cho từng hệ đào tạo
        SUM(
            IF(
                INSTR(qc.GiaoVienGiangDay, ',') > 0,
                0.7 * qc.QuyChuan,
                qc.QuyChuan
            )
        ) AS SoTiet,

        qc.he_dao_tao,
        qc.NamHoc,
        qc.KiHoc,
        qc.Dot,
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep,
        gv.NoiCongTac,
        gv.BangTotNghiepLoai,
        gv.MonGiangDayChinh,
        qc.MaHocPhan AS MonHoc,
        qc.TenLop AS Lop,
        qc.SoSinhVien AS SiSo,

        -- Tính tiền theo học vị và hệ đào tạo cho từng chương trình
        tl.SoTien AS TienMoiGiang,
        tl.SoTien * SUM(
            IF(
                INSTR(qc.GiaoVienGiangDay, ',') > 0,
                0.7 * qc.QuyChuan,
                qc.QuyChuan
            )
        ) AS ThanhTien,

        tl.SoTien * SUM(
            IF(
                INSTR(qc.GiaoVienGiangDay, ',') > 0,
                0.7 * qc.QuyChuan,
                qc.QuyChuan
            )
        ) * 0.1 AS Thue,

        tl.SoTien * SUM(
            IF(
                INSTR(qc.GiaoVienGiangDay, ',') > 0,
                0.7 * qc.QuyChuan,
                qc.QuyChuan
            )
        ) * 0.9 AS ThucNhan,

        NULL AS SoHopDong,
        'Chưa có hợp đồng' AS TrangThaiHopDong,
        pb.TenPhongBan

    FROM 
        quychuan qc

    -- JOIN tên giảng viên với logic xử lý tên từ chuỗi có dấu phẩy
    JOIN gvmoi gv 
        ON 
            IF(
                INSTR(qc.GiaoVienGiangDay, ',') > 0,
                TRIM(REPLACE(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1), ' (GVM)', '')),
                TRIM(REPLACE(qc.GiaoVienGiangDay, ' (GVM)', ''))
            ) = gv.HoTen

    -- JOIN với bảng tienluong để lấy mức tiền theo hệ đào tạo và học vị
    LEFT JOIN tienluong tl 
        ON qc.he_dao_tao = tl.he_dao_tao AND gv.HocVi = tl.HocVi

    LEFT JOIN phongban pb 
        ON gv.MaPhongBan = pb.MaPhongBan

    WHERE
        qc.MoiGiang = 1 
        AND qc.NamHoc = ?
        AND qc.Dot = ?
        AND qc.KiHoc = ?
`;
            params = [namHoc, dot, ki];

            if (maPhongBan && maPhongBan !== "ALL") {
                query += " AND gv.MaPhongBan = ?";
                params.push(maPhongBan);
            }            query += `
                GROUP BY
                    gv.id_Gvm, gv.HoTen, qc.he_dao_tao,
                    gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email, gv.MaSoThue, gv.HocVi, gv.ChucVu,
                    gv.HSL, gv.DienThoai, gv.STK, gv.NganHang, gv.MaPhongBan, qc.NamHoc, 
                    qc.KiHoc, qc.Dot, gv.NgayCapCCCD, gv.DiaChi, gv.BangTotNghiep, gv.NoiCongTac, 
                    gv.BangTotNghiepLoai, gv.MonGiangDayChinh, qc.Khoa, tl.SoTien, pb.TenPhongBan
                ORDER BY SoTiet DESC, gv.HoTen, qc.he_dao_tao
            `;} else if (heDaoTao === "Đồ án") {
            // Case 2: Query from doantotnghiep table with grouping by department/program
            query = `
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
                    COALESCE(pb.TenPhongBan, 'Đồ án chung') as he_dao_tao,  -- Use department as "program" for grouping
                    da.NamHoc,
                    da.ki as KiHoc,
                    da.Dot,
                    gv.NgayCapCCCD,
                    gv.DiaChi,
                    gv.BangTotNghiep,
                    gv.NoiCongTac,
                    gv.BangTotNghiepLoai,
                    gv.MonGiangDayChinh,
                    GROUP_CONCAT(DISTINCT da.TenDeTai SEPARATOR ', ') as MonHoc,
                    GROUP_CONCAT(DISTINCT da.SinhVien SEPARATOR ', ') as Lop,
                    GROUP_CONCAT(DISTINCT da.MaSV SEPARATOR ', ') as SiSo,
                    100000 AS TienMoiGiang,
                    SUM(da.SoTiet) * 100000 AS ThanhTien,
                    SUM(da.SoTiet) * 100000 * 0.1 AS Thue,
                    SUM(da.SoTiet) * 100000 * 0.9 AS ThucNhan,
                    NULL as SoHopDong,
                    'Chưa có hợp đồng' as TrangThaiHopDong,
                    pb.TenPhongBan
                FROM (
                    SELECT
                        NgayBatDau,
                        NgayKetThuc,
                        MaPhongBan,
                        TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
                        Dot,
                        ki,
                        NamHoc,
                        TenDeTai,
                        SinhVien,
                        MaSV,
                        CASE 
                            WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 25
                            ELSE 15
                        END AS SoTiet
                    FROM doantotnghiep
                    WHERE GiangVien1 IS NOT NULL
                        AND GiangVien1 != ''
                        AND (GiangVien1 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')
                        AND NamHoc = ?
                        AND Dot = ?
                        AND ki = ?
                    
                    UNION ALL
                    
                    SELECT
                        NgayBatDau,
                        NgayKetThuc,
                        MaPhongBan,
                        TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
                        Dot,
                        ki,
                        NamHoc,
                        TenDeTai,
                        SinhVien,
                        MaSV,
                        10 AS SoTiet
                    FROM doantotnghiep
                    WHERE GiangVien2 IS NOT NULL 
                        AND GiangVien2 != 'không'
                        AND GiangVien2 != ''
                        AND (GiangVien2 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
                        AND NamHoc = ?
                        AND Dot = ?
                        AND ki = ?
                ) da
                JOIN gvmoi gv ON da.GiangVien = gv.HoTen
                LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan
                WHERE 1=1
            `;
            params = [namHoc, dot, ki, namHoc, dot, ki];            if (maPhongBan && maPhongBan !== "ALL") {
                query += " AND da.MaPhongBan = ?";
                params.push(maPhongBan);
            }            query += `
                GROUP BY
                    gv.id_Gvm, gv.HoTen, da.MaPhongBan, pb.TenPhongBan,
                    gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email, gv.MaSoThue, gv.HocVi, gv.ChucVu,
                    gv.HSL, gv.DienThoai, gv.STK, gv.NganHang, gv.MaPhongBan, da.NamHoc, 
                    da.ki, da.Dot, gv.NgayCapCCCD, gv.DiaChi, gv.BangTotNghiep, gv.NoiCongTac, 
                    gv.BangTotNghiepLoai, gv.MonGiangDayChinh, da.NgayBatDau, da.NgayKetThuc
                ORDER BY SoTiet DESC, gv.HoTen, pb.TenPhongBan
            `;
        } else {
            // Default case - return empty result or error
            return res.status(400).json({
                message: "Hệ đào tạo không hợp lệ. Chỉ hỗ trợ 'Mời giảng' và 'Đồ án'"
            });
        }        const [results] = await connection.query(query, params);

        // Enhanced grouping: Group by teacher and training program to show detailed breakdown
        const groupedByTeacher = results.reduce((acc, current) => {
            const teacher = current.HoTen;
            if (!acc[teacher]) {
                acc[teacher] = {
                    teacherInfo: {
                        id_Gvm: current.id_Gvm,
                        HoTen: current.HoTen,
                        GioiTinh: current.GioiTinh,
                        NgaySinh: current.NgaySinh,
                        CCCD: current.CCCD,
                        NoiCapCCCD: current.NoiCapCCCD,
                        Email: current.Email,
                        MaSoThue: current.MaSoThue,
                        HocVi: current.HocVi,
                        ChucVu: current.ChucVu,
                        HSL: current.HSL,
                        DienThoai: current.DienThoai,
                        STK: current.STK,
                        NganHang: current.NganHang,
                        MaPhongBan: current.MaPhongBan,
                        NgayCapCCCD: current.NgayCapCCCD,
                        DiaChi: current.DiaChi,
                        BangTotNghiep: current.BangTotNghiep,
                        NoiCongTac: current.NoiCongTac,
                        BangTotNghiepLoai: current.BangTotNghiepLoai,
                        MonGiangDayChinh: current.MonGiangDayChinh,
                        NgayBatDau: current.NgayBatDau,
                        NgayKetThuc: current.NgayKetThuc,
                        TenPhongBan: current.TenPhongBan,
                        SoHopDong: current.SoHopDong,
                        TrangThaiHopDong: current.TrangThaiHopDong
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
              // Add training program data with validation and error handling
            const programData = {
                he_dao_tao: current.he_dao_tao || 'Không xác định',
                SoTiet: parseFloat(current.SoTiet) || 0,
                TienMoiGiang: parseFloat(current.TienMoiGiang) || 0,
                ThanhTien: parseFloat(current.ThanhTien) || 0,
                Thue: parseFloat(current.Thue) || 0,
                ThucNhan: parseFloat(current.ThucNhan) || 0,
                MaKhoaMonHoc: current.MaKhoaMonHoc || '',
                MonHoc: current.MonHoc || '',
                Lop: current.Lop || '',
                SiSo: current.SiSo || ''
            };
            
            // Validate program data for completeness
            if (!programData.he_dao_tao || programData.he_dao_tao === 'Không xác định') {
                console.warn(`Warning: Missing training program data for teacher ${teacher}`);
            }
            
            if (programData.SoTiet <= 0) {
                console.warn(`Warning: Invalid or missing hours data for teacher ${teacher}, program ${programData.he_dao_tao}`);
            }
            
            acc[teacher].trainingPrograms.push(programData);
            
            // Update totals
            acc[teacher].totalFinancials.totalSoTiet += programData.SoTiet;
            acc[teacher].totalFinancials.totalThanhTien += programData.ThanhTien;
            acc[teacher].totalFinancials.totalThue += programData.Thue;
            acc[teacher].totalFinancials.totalThucNhan += programData.ThucNhan;

            return acc;
        }, {});        // Convert to simpler format for frontend compatibility while preserving enhanced data
        // First create array of teachers with their total hours for proper sorting
        const teachersWithTotals = Object.keys(groupedByTeacher).map(teacherName => {
            const teacherData = groupedByTeacher[teacherName];
            return {
                teacherName,
                teacherData,
                totalSoTiet: teacherData.totalFinancials.totalSoTiet
            };
        });

        // Sort by total hours in descending order
        teachersWithTotals.sort((a, b) => b.totalSoTiet - a.totalSoTiet);

        // Convert to the expected format with proper sorting
        const simplifiedGroupedByTeacher = teachersWithTotals.reduce((acc, { teacherName, teacherData }) => {
            const combinedData = {
                ...teacherData.teacherInfo,
                // Add aggregated financial data for compatibility
                SoTiet: teacherData.totalFinancials.totalSoTiet,
                ThanhTien: teacherData.totalFinancials.totalThanhTien,
                Thue: teacherData.totalFinancials.totalThue,
                ThucNhan: teacherData.totalFinancials.totalThucNhan,
                // Add detailed breakdown for enhanced display
                trainingPrograms: teacherData.trainingPrograms,
                totalFinancials: teacherData.totalFinancials
            };
            acc[teacherName] = [combinedData]; // Keep as array for compatibility
            return acc;
        }, {});

        // Also sort the enhanced data to maintain consistency
        const sortedEnhancedGroupedByTeacher = teachersWithTotals.reduce((acc, { teacherName, teacherData }) => {
            acc[teacherName] = teacherData;
            return acc;
        }, {});
        // Get SoTietDinhMuc
        const sotietQuery = `SELECT GiangDay FROM sotietdinhmuc LIMIT 1`;
        const [sotietResult] = await connection.query(sotietQuery);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;

        // Get SoQDList like in hopDongDuKien controller
        let SoQDList;
        if (maPhongBan && maPhongBan !== "ALL") {
            if (heDaoTao === "Đồ án") {
                // For Đồ án, get SoQD from doantotnghiep table
                const SoQDquery = `SELECT DISTINCT SoQD FROM doantotnghiep WHERE SoQD != 'NULL' AND SoQD IS NOT NULL AND Dot = ? AND ki = ? AND NamHoc = ? AND MaPhongBan = ?`;
                [SoQDList] = await connection.query(SoQDquery, [dot, ki, namHoc, maPhongBan]);
            } else {
                // For Mời giảng, initialize empty array as there's no SoQD in quychuan
                SoQDList = [];
            }
        }        res.json({
            groupedByTeacher: simplifiedGroupedByTeacher,
            enhancedGroupedByTeacher: sortedEnhancedGroupedByTeacher, // Send detailed data for enhanced display, properly sorted
            SoTietDinhMuc: SoTietDinhMuc,
            SoQDList: SoQDList
        });
    } catch (error) {
        console.error("Error fetching duyet hop dong data:", error);
        res.status(500).json({
            message: "Đã xảy ra lỗi khi lấy dữ liệu"
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Export contract approval data to Excel
 */
const exportDuyetHopDongData = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan, heDaoTao } = req.query;

        if (!namHoc) {
            return res.status(400).send('Missing required parameters');
        }        // Use the same enhanced query structure as getDuyetHopDongData for consistency
        let query, params;
        if (heDaoTao === "Mời giảng") {
            // Case 1: Enhanced query from quychuan table grouped by training program
            query = `
                SELECT
                    gv.HoTen,
                    qc.he_dao_tao,
                    pb.TenPhongBan,
                    GROUP_CONCAT(DISTINCT qc.MaHocPhan SEPARATOR ', ') as MonHoc,
                    GROUP_CONCAT(DISTINCT qc.TenLop SEPARATOR ', ') as Lop,
                    GROUP_CONCAT(DISTINCT qc.SoSinhVien SEPARATOR ', ') as SiSo,
                    SUM(qc.QuyChuan) AS SoTiet,
                    AVG(tl.SoTien) AS TienMoiGiang,
                    SUM(tl.SoTien * qc.QuyChuan) AS ThanhTien,
                    SUM(tl.SoTien * qc.QuyChuan * 0.1) AS Thue,
                    SUM(tl.SoTien * qc.QuyChuan * 0.9) AS ThucNhan,
                    'Chưa có hợp đồng' AS TrangThaiHopDong,
                    NULL as SoHopDong
                FROM 
                    quychuan qc
                JOIN gvmoi gv 
                    ON 
                        IF(
                            INSTR(qc.GiaoVienGiangDay, ',') > 0,
                            TRIM(REPLACE(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1), ' (GVM)', '')),
                            TRIM(REPLACE(qc.GiaoVienGiangDay, ' (GVM)', ''))
                        ) = gv.HoTen
                LEFT JOIN tienluong tl 
                    ON qc.he_dao_tao = tl.he_dao_tao AND gv.HocVi = tl.HocVi
                LEFT JOIN phongban pb 
                    ON gv.MaPhongBan = pb.MaPhongBan
                WHERE
                    qc.MoiGiang = 1 
                    AND qc.NamHoc = ?
                    AND qc.Dot = ?
                    AND qc.KiHoc = ?
            `;
            params = [namHoc, dot, ki];

            if (maPhongBan && maPhongBan !== "ALL") {
                query += " AND gv.MaPhongBan = ?";
                params.push(maPhongBan);
            }            query += `
                GROUP BY
                    gv.HoTen, qc.he_dao_tao, pb.TenPhongBan
                ORDER BY SoTiet DESC, gv.HoTen, qc.he_dao_tao
            `;        } else if (heDaoTao === "Đồ án") {
            // Case 2: Query from doantotnghiep table with proper structure
            query = `
                SELECT
                    gv.HoTen,
                    COALESCE(pb.TenPhongBan, 'Đồ án chung') as he_dao_tao,
                    pb.TenPhongBan,
                    GROUP_CONCAT(DISTINCT da.TenDeTai SEPARATOR ', ') as MonHoc,
                    GROUP_CONCAT(DISTINCT da.SinhVien SEPARATOR ', ') as Lop,
                    GROUP_CONCAT(DISTINCT da.MaSV SEPARATOR ', ') as SiSo,
                    SUM(da.SoTiet) AS SoTiet,
                    100000 AS TienMoiGiang,
                    SUM(da.SoTiet) * 100000 AS ThanhTien,
                    SUM(da.SoTiet) * 100000 * 0.1 AS Thue,
                    SUM(da.SoTiet) * 100000 * 0.9 AS ThucNhan,
                    'Chưa có hợp đồng' as TrangThaiHopDong,
                    NULL as SoHopDong
                FROM (
                    SELECT
                        NgayBatDau,
                        NgayKetThuc,
                        MaPhongBan,
                        TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
                        Dot,
                        ki,
                        NamHoc,
                        TenDeTai,
                        SinhVien,
                        MaSV,
                        CASE 
                            WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 25
                            ELSE 15
                        END AS SoTiet
                    FROM doantotnghiep
                    WHERE GiangVien1 IS NOT NULL
                        AND GiangVien1 != ''
                        AND (GiangVien1 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien1, '-', 2), '-', -1)) = 'Giảng viên mời')
                        AND NamHoc = ?
                        AND Dot = ?
                        AND ki = ?
                    
                    UNION ALL
                    
                    SELECT
                        NgayBatDau,
                        NgayKetThuc,
                        MaPhongBan,
                        TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
                        Dot,
                        ki,
                        NamHoc,
                        TenDeTai,
                        SinhVien,
                        MaSV,
                        10 AS SoTiet
                    FROM doantotnghiep
                    WHERE GiangVien2 IS NOT NULL 
                        AND GiangVien2 != 'không'
                        AND GiangVien2 != ''
                        AND (GiangVien2 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
                        AND NamHoc = ?
                        AND Dot = ?
                        AND ki = ?
                ) da
                JOIN gvmoi gv ON da.GiangVien = gv.HoTen
                LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan
                WHERE 1=1
            `;
            params = [namHoc, dot, ki, namHoc, dot, ki];

            if (maPhongBan && maPhongBan !== "ALL") {
                query += " AND da.MaPhongBan = ?";
                params.push(maPhongBan);
            }            query += `
                GROUP BY
                    gv.HoTen, da.MaPhongBan, pb.TenPhongBan
                ORDER BY SoTiet DESC, gv.HoTen, pb.TenPhongBan
            `;
        } else {
            return res.status(400).send('Hệ đào tạo không hợp lệ. Chỉ hỗ trợ "Mời giảng" và "Đồ án"');
        }        // Execute the query
        const [results] = await connection.query(query, params);

        // Group results by teacher and calculate totals for proper sorting
        const groupedExportData = results.reduce((acc, current) => {
            const teacher = current.HoTen;
            if (!acc[teacher]) {
                acc[teacher] = {
                    teacherInfo: { ...current },
                    programs: [],
                    totalSoTiet: 0,
                    totalThanhTien: 0,
                    totalThue: 0,
                    totalThucNhan: 0
                };
            }
            
            acc[teacher].programs.push(current);
            acc[teacher].totalSoTiet += parseFloat(current.SoTiet) || 0;
            acc[teacher].totalThanhTien += parseFloat(current.ThanhTien) || 0;
            acc[teacher].totalThue += parseFloat(current.Thue) || 0;
            acc[teacher].totalThucNhan += parseFloat(current.ThucNhan) || 0;
            
            return acc;
        }, {});

        // Convert to array and sort by total hours
        const sortedTeachers = Object.values(groupedExportData).sort((a, b) => b.totalSoTiet - a.totalSoTiet);

        // Flatten back to individual program rows with proper teacher ordering
        const sortedResults = [];
        sortedTeachers.forEach(teacher => {
            teacher.programs.forEach(program => {
                sortedResults.push(program);
            });
        });

        // Create Excel workbook
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Duyệt Hợp Đồng');        // Add headers with training program breakdown
        worksheet.columns = [
            { header: 'STT', key: 'stt', width: 5 },
            { header: 'Họ tên giảng viên', key: 'hoTen', width: 25 },
            { header: 'Chương trình đào tạo', key: 'heDaoTao', width: 20 },
            { header: 'Khoa', key: 'tenPhongBan', width: 20 },
            { header: 'Môn học/Đề tài', key: 'monHoc', width: 40 },
            { header: 'Lớp/Sinh viên', key: 'lop', width: 25 },
            { header: 'Sĩ số/Mã SV', key: 'siSo', width: 20 },
            { header: 'Số tiết', key: 'soTiet', width: 10 },
            { header: 'Tiền/tiết', key: 'tienMoiGiang', width: 12 },
            { header: 'Thành tiền', key: 'thanhTien', width: 15 },
            { header: 'Thuế 10%', key: 'thue', width: 15 },
            { header: 'Thực nhận', key: 'thucNhan', width: 15 },
            { header: 'Trạng thái hợp đồng', key: 'trangThai', width: 20 },
            { header: 'Số hợp đồng', key: 'soHopDong', width: 15 }
        ];        // Add data with enhanced formatting
        sortedResults.forEach((row, index) => {
            worksheet.addRow({
                stt: index + 1,
                hoTen: row.HoTen,
                heDaoTao: row.he_dao_tao,                tenPhongBan: row.TenPhongBan,
                monHoc: row.MonHoc,
                lop: row.Lop,
                siSo: row.SiSo,
                soTiet: row.SoTiet,
                tienMoiGiang: row.TienMoiGiang,
                thanhTien: row.ThanhTien,
                thue: row.Thue,
                thucNhan: row.ThucNhan,
                trangThai: row.TrangThaiHopDong,
                soHopDong: row.SoHopDong || 'Chưa có'
            });
        });

        // Style the header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Set response headers for file download
        const fileName = `DuyetHopDong_${namHoc}${ki ? '_' + ki : ''}${dot ? '_' + dot : ''}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        // Send the workbook
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error("Error exporting duyet hop dong data:", error);
        res.status(500).send("Error exporting data");
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getDuyetHopDongPage,
    getDuyetHopDongData,
    exportDuyetHopDongData
};