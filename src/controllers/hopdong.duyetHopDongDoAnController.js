const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

/**
 * Display the contract approval page
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
 * Get data for contract approval based on filters with detailed training program breakdown
 */
const getDuyetHopDongData = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong, ki } = req.body; // Thêm ki vào destructure

        // Validate required parameters - THÊM ki vào validation
        if (!dot || !namHoc || !loaiHopDong || !ki) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Kỳ, Loại hợp đồng"
            });
        }

        // ...existing validation code...

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
                COALESCE('Đại học', 'Đại học') as he_dao_tao,
                da.NamHoc,
                da.Dot,
                da.ki,  -- Thêm ki vào SELECT
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
                pb.TenPhongBan,
                1 AS DaoTaoDuyet,
                1 AS TaiChinhDuyet
            FROM (
                SELECT
                    NgayBatDau,
                    NgayKetThuc,
                    MaPhongBan,
                    TRIM(SUBSTRING_INDEX(GiangVien1, '-', 1)) AS GiangVien,
                    Dot,
                    NamHoc,
                    ki,  -- Thêm ki vào SELECT
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
                    AND ki = ?  -- THÊM điều kiện ki
                
                UNION ALL
                
                SELECT
                    NgayBatDau,
                    NgayKetThuc,
                    MaPhongBan,
                    TRIM(SUBSTRING_INDEX(GiangVien2, '-', 1)) AS GiangVien,
                    Dot,
                    NamHoc,
                    ki,  -- Thêm ki vào SELECT
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
                    AND ki = ?  -- THÊM điều kiện ki
            ) da
            JOIN gvmoi gv ON da.GiangVien = gv.HoTen
            LEFT JOIN phongban pb ON da.MaPhongBan = pb.MaPhongBan
            WHERE 1=1
        `;

        let params = [namHoc, dot, ki, namHoc, dot, ki]; // Cập nhật params để bao gồm ki

        if (maPhongBan && maPhongBan !== "ALL") {
            query += " AND da.MaPhongBan = ?";
            params.push(maPhongBan);
        }

        query += `
            GROUP BY
                gv.id_Gvm, gv.HoTen, da.MaPhongBan, pb.TenPhongBan,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email, gv.MaSoThue, gv.HocVi, gv.ChucVu,
                gv.HSL, gv.DienThoai, gv.STK, gv.NganHang, gv.MaPhongBan, da.NamHoc, 
                da.Dot, da.ki, gv.NgayCapCCCD, gv.DiaChi, gv.BangTotNghiep, gv.NoiCongTac,  -- Thêm da.ki vào GROUP BY
                gv.BangTotNghiepLoai, gv.MonGiangDayChinh, da.NgayBatDau, da.NgayKetThuc
            ORDER BY SoTiet DESC, gv.HoTen, pb.TenPhongBan
        `;
        const [results] = await connection.query(query, params);

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
            }            // Add training program data with validation and error handling
            const programData = {
                he_dao_tao: current.he_dao_tao || 'Đại học',  // Default to "Đại học" for thesis contracts
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
            if (!programData.he_dao_tao) {
                console.warn(`Warning: Using default training program 'Đại học' for teacher ${teacher}`);
                programData.he_dao_tao = 'Đại học';
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
                totalSoTiet: teacherData.totalFinancials.totalSoTiet,
                maPhongBan: teacherData.teacherInfo.MaPhongBan
            };
        });

        // Sort by faculty first, then by total hours in descending order, then by teacher name
        teachersWithTotals.sort((a, b) => {
            // First sort by faculty
            if (a.maPhongBan !== b.maPhongBan) {
                return (a.maPhongBan || '').localeCompare(b.maPhongBan || '');
            }
            // Then by total hours descending
            if (b.totalSoTiet !== a.totalSoTiet) {
                return b.totalSoTiet - a.totalSoTiet;
            }
            // Finally by teacher name
            return a.teacherName.localeCompare(b.teacherName);
        });

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
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;        // Get SoQDList for thesis contracts
        let SoQDList = []; // Initialize with empty array as default
        if (maPhongBan && maPhongBan !== "ALL") {            // For Đồ án, get SoQD from doantotnghiep table
            const SoQDquery = `SELECT DISTINCT SoQD FROM doantotnghiep WHERE SoQD != 'NULL' AND SoQD IS NOT NULL AND Dot = ? AND NamHoc = ? AND MaPhongBan = ?`;
            [SoQDList] = await connection.query(SoQDquery, [dot, namHoc, maPhongBan]);
        }

        res.json({
            groupedByTeacher: simplifiedGroupedByTeacher,
            enhancedGroupedByTeacher: sortedEnhancedGroupedByTeacher, // Send detailed data for enhanced display, properly sorted
            SoTietDinhMuc: SoTietDinhMuc,
            SoQDList: SoQDList
        });
    } catch (error) {
        console.error("❌ Error in getDuyetHopDongData:");
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        console.error("Error code:", error.code);
        console.error("Error errno:", error.errno);
        console.error("Error sqlState:", error.sqlState);
        console.error("Error sqlMessage:", error.sqlMessage);

        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy dữ liệu",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Approve contracts based on criteria
 */
const approveContracts = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection(); const { dot, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Loại hợp đồng"
            });
        }

        // Validate loaiHopDong - only support thesis contracts
        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        // First, check if all records have DaoTaoDuyet = 1 for thesis contracts
        let unapprovedFaculties = [];

        // For đồ án, check specific faculty or all faculties
        const facultiesToCheck = [];

        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            facultiesToCheck.push(maPhongBan);
        } else {
            const [faculties] = await connection.query(`SELECT MaPhongBan FROM phongban`);
            facultiesToCheck.push(...faculties.map(f => f.MaPhongBan));
        } for (const facultyCode of facultiesToCheck) {
            const [check] = await connection.query(`
                SELECT DaoTaoDuyet FROM doantotnghiep 
                WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ?
            `, [facultyCode, namHoc, dot]);

            // Check if all records in this faculty have DaoTaoDuyet = 1
            const hasUnapprovedDaoTao = check.some(record => record.DaoTaoDuyet != 1);

            if (hasUnapprovedDaoTao) {
                unapprovedFaculties.push(facultyCode);
            }
        }

        // If there are faculties with unapproved DaoTao, return notification instead of error
        if (unapprovedFaculties.length > 0) {
            return res.status(200).json({
                success: false,
                isNotification: true,
                message: `Hiện tại không thể duyệt vì các khoa sau chưa được đào tạo duyệt hoàn toàn: ${unapprovedFaculties.join(', ')}. Vui lòng đợi đào tạo duyệt xong trước khi tiến hành duyệt tài chính.`,
                unapprovedFaculties: unapprovedFaculties,
                affectedRows: 0
            });
        }        // Update TaiChinhDuyet = 1 for thesis contracts
        let affectedRows = 0;

        // Handle specific faculty or all faculties for thesis contracts
        const facultiesToUpdate = [];

        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            facultiesToUpdate.push(maPhongBan);
        } else {
            const [faculties] = await connection.query(`SELECT MaPhongBan FROM phongban`);
            facultiesToUpdate.push(...faculties.map(f => f.MaPhongBan));
        }

        for (const facultyCode of facultiesToUpdate) {            // Double-check this faculty is fully approved by DaoTao
            const [check] = await connection.query(`
                SELECT DaoTaoDuyet FROM doantotnghiep 
                WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ?
            `, [facultyCode, namHoc, dot]);

            const allDaoTaoApproved = check.every(record => record.DaoTaoDuyet == 1);

            if (allDaoTaoApproved && check.length > 0) {
                const [updateResult] = await connection.query(`
                    UPDATE doantotnghiep 
                    SET TaiChinhDuyet = 1 
                    WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? 
                      AND DaoTaoDuyet = 1 AND TaiChinhDuyet != 1                `, [facultyCode, namHoc, dot]);

                affectedRows += updateResult.affectedRows;
            }
        } const facultyText = (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL')
            ? ` của khoa ${maPhongBan}`
            : ' của tất cả khoa';

        res.json({
            success: true,
            message: `Đã duyệt thành công ${affectedRows} hợp đồng đồ án${facultyText} cho đợt ${dot}, năm học ${namHoc}`,
            affectedRows: affectedRows
        });

    } catch (error) {
        console.error("Error approving contracts:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi duyệt hợp đồng"
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

/**
 * Unapprove contracts based on criteria (reverse of approval)
 */
const unapproveContracts = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Năm học, Loại hợp đồng"
            });
        }

        // Validate loaiHopDong - only support thesis contracts
        if (loaiHopDong !== "Đồ án") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Đồ án'",
                receivedLoaiHopDong: loaiHopDong
            });
        }

        // Update TaiChinhDuyet = 0 for thesis contracts (reverse of approval)
        let affectedRows = 0;

        // Handle specific faculty or all faculties for thesis contracts
        const facultiesToUpdate = [];

        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            // Single faculty
            facultiesToUpdate.push(maPhongBan);
        } else {
            // All faculties - get list of distinct faculties from database
            const [faculties] = await connection.query(`
                SELECT DISTINCT MaPhongBan 
                FROM doantotnghiep 
                WHERE NamHoc = ? AND Dot = ? 
                  AND TaiChinhDuyet = 1
            `, [namHoc, dot]);

            facultiesToUpdate.push(...faculties.map(f => f.MaPhongBan));
        }

        // Update each faculty's contracts
        for (const facultyCode of facultiesToUpdate) {
            const [updateResult] = await connection.query(`
                UPDATE doantotnghiep 
                SET TaiChinhDuyet = 0 
                WHERE MaPhongBan = ? AND NamHoc = ? AND Dot = ? 
                  AND TaiChinhDuyet = 1 AND DaLuu = 0;
            `, [facultyCode, namHoc, dot]);

            affectedRows += updateResult.affectedRows;
        }

        const facultyText = (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL')
            ? ` của khoa ${maPhongBan}`
            : ' của tất cả khoa';

        res.json({
            success: true,
            message: `Đã bỏ duyệt thành công ${affectedRows} hợp đồng đồ án${facultyText} cho đợt ${dot}, năm học ${namHoc}`,
            affectedRows: affectedRows
        });

    } catch (error) {
        console.error("Error unapproving contracts:", error);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi bỏ duyệt hợp đồng"
        });
    } finally {
        if (connection) {
            connection.release();
        }
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
                        WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 25
                        ELSE 15
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
                    10 AS SoTiet
                FROM doantotnghiep
                WHERE GiangVien2 IS NOT NULL 
                    AND GiangVien2 != 'không'
                    AND GiangVien2 != ''
                    AND (GiangVien2 NOT LIKE '%-%' OR TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(GiangVien2, '-', 2), '-', -1)) = 'Giảng viên mời')
                    AND NamHoc = ?
                    AND Dot = ?
            ) da
            JOIN gvmoi gv ON da.GiangVien = gv.HoTen
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
                            WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 25
                            ELSE 15
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
                        10 AS SoTiet
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
            `;

            const [teacherDetails] = await connection.query(teacherQueryWithFilter, teacherParams);

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
                        WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 25
                        ELSE 15
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
                    10 AS SoTiet
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
                        WHEN GiangVien2 = 'không' OR GiangVien2 = '' THEN 25
                        ELSE 15
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
                    10 AS SoTiet
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