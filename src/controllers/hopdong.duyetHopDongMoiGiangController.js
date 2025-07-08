const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

/**
 * Render site
 */
const getDuyetHopDongPage = (req, res) => {
    try {
        res.render('hopdong.duyetHopDongMoiGiang.ejs');
    } catch (error) {
        console.error("Error rendering duyet hop dong page:", error);
        res.status(500).send("Internal Server Error");
    }
};

/**
 * * Lấy data hợp đồng mời giảng
 */
const getDuyetHopDongData22 = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const { dot, ki, namHoc, maPhongBan } = req.body;

        // Validate required parameters
        if (!dot || !ki || !namHoc) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học"
            });
        }

        query = `
        WITH DaiHocData AS (
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

                -- Cho hệ Đại học: KHÔNG áp dụng logic 0.7
                SUM(qc.QuyChuan) AS SoTiet,

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

                -- Tính tiền cho hệ Đại học
                tl.SoTien AS TienMoiGiang,
                tl.SoTien * SUM(qc.QuyChuan) AS ThanhTien,
                tl.SoTien * SUM(qc.QuyChuan) * 0.1 AS Thue,
                tl.SoTien * SUM(qc.QuyChuan) * 0.9 AS ThucNhan,        
                
                 pb.TenPhongBan,    -- nhớ thêm cột này

                -- Thông tin trạng thái duyệt
                MAX(qc.DaoTaoDuyet) AS DaoTaoDuyet,
                MAX(qc.TaiChinhDuyet) AS TaiChinhDuyet

            FROM quychuan qc

            -- JOIN cho hệ Đại học: dùng dấu ' - '
            JOIN gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen

            -- JOIN với bảng tienluong
            LEFT JOIN tienluong tl ON qc.he_dao_tao = tl.he_dao_tao AND gv.HocVi = tl.HocVi
            LEFT JOIN phongban pb ON gv.MaPhongBan = pb.MaPhongBan

            WHERE
                qc.MoiGiang = 1 
                AND qc.NamHoc = ?
                AND qc.Dot = ?
                AND qc.KiHoc = ?
                AND qc.he_dao_tao LIKE '%Đại học%'
                ${maPhongBan && maPhongBan !== "ALL" ? "AND gv.MaPhongBan = ?" : ""}

            GROUP BY
                gv.id_Gvm, gv.HoTen, qc.he_dao_tao,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email, gv.MaSoThue, 
                gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai, gv.STK, gv.NganHang, gv.MaPhongBan, 
                qc.NamHoc, qc.KiHoc, qc.Dot, gv.NgayCapCCCD, gv.DiaChi, gv.BangTotNghiep, 
                gv.NoiCongTac, gv.BangTotNghiepLoai, gv.MonGiangDayChinh, qc.Khoa, 
                tl.SoTien, pb.TenPhongBan
        ),
        
        SauDaiHocData AS (
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

                -- Cho hệ Sau đại học: CÓ áp dụng logic 0.7
                SUM(
                    ROUND(
                        qc.QuyChuan * CASE 
                            WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 
                            ELSE 1 
                        END, 2
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

                -- Tính tiền cho hệ Sau đại học
                tl.SoTien AS TienMoiGiang,
                tl.SoTien * SUM(
                    ROUND(
                        qc.QuyChuan * CASE 
                            WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 
                            ELSE 1 
                        END, 2
                    )
                ) AS ThanhTien,
                tl.SoTien * SUM(
                    ROUND(
                        qc.QuyChuan * CASE 
                            WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 
                            ELSE 1 
                        END, 2
                    )
                ) * 0.1 AS Thue,
                tl.SoTien * SUM(
                    ROUND(
                        qc.QuyChuan * CASE 
                            WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 
                            ELSE 1 
                        END, 2
                    )
                ) * 0.9 AS ThucNhan,        
               
                pb.TenPhongBan,
                
                -- Thông tin trạng thái duyệt
                MAX(qc.DaoTaoDuyet) AS DaoTaoDuyet,
                MAX(qc.TaiChinhDuyet) AS TaiChinhDuyet

            FROM quychuan qc

            -- JOIN cho hệ Sau đại học: dùng dấu phẩy
            JOIN gvmoi gv ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen

            -- JOIN với bảng tienluong
            LEFT JOIN tienluong tl ON qc.he_dao_tao = tl.he_dao_tao AND gv.HocVi = tl.HocVi
            LEFT JOIN phongban pb ON gv.MaPhongBan = pb.MaPhongBan

            WHERE
                qc.MoiGiang = 1 
                AND qc.NamHoc = ?
                AND qc.Dot = ?
                AND qc.KiHoc = ?
                AND qc.he_dao_tao NOT LIKE '%Đại học%'
                ${maPhongBan && maPhongBan !== "ALL" ? "AND gv.MaPhongBan = ?" : ""}

            GROUP BY
                gv.id_Gvm, gv.HoTen, qc.he_dao_tao,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email, gv.MaSoThue, 
                gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai, gv.STK, gv.NganHang, gv.MaPhongBan, 
                qc.NamHoc, qc.KiHoc, qc.Dot, gv.NgayCapCCCD, gv.DiaChi, gv.BangTotNghiep, 
                gv.NoiCongTac, gv.BangTotNghiepLoai, gv.MonGiangDayChinh, qc.Khoa, 
                tl.SoTien, pb.TenPhongBan
        )
        
        -- Kết hợp dữ liệu từ cả hai hệ
        SELECT * FROM DaiHocData
        UNION ALL
        SELECT * FROM SauDaiHocData
        ORDER BY SoTiet DESC, HoTen, he_dao_tao
        `;

        // Tạo mảng params
        params = [namHoc, dot, ki];
        if (maPhongBan && maPhongBan !== "ALL") {
            params.push(maPhongBan);
        }

        // Thêm params cho CTE thứ hai
        params.push(namHoc, dot, ki);
        if (maPhongBan && maPhongBan !== "ALL") {
            params.push(maPhongBan);
        }

        const [results] = await connection.query(query, params);

        // Enhanced grouping: Group by teacher and training program to show detailed breakdown
        const groupedByTeacher = results.reduce((acc, current) => {
            const teacher = current.HoTen;
            if (!acc[teacher]) {                acc[teacher] = {
                    teacherInfo: {
                        id_Gvm: current.id_Gvm,
                        HoTen: current.HoTen,
                        GioiTinh: current.GioiTinh,
                        NgaySinh: current.NgaySinh,
                        CCCD: current.CCCD,
                        NoiCapCCCD: current.NoiCapCCCD,
                        NgayCapCCCD: current.NgayCapCCCD,
                        Email: current.Email,
                        MaSoThue: current.MaSoThue,
                        HocVi: current.HocVi,
                        ChucVu: current.ChucVu,
                        HSL: current.HSL,
                        DienThoai: current.DienThoai,
                        STK: current.STK,
                        NganHang: current.NganHang,
                        MaPhongBan: current.MaPhongBan,
                        DiaChi: current.DiaChi,
                        BangTotNghiep: current.BangTotNghiep,
                        NoiCongTac: current.NoiCongTac,
                        BangTotNghiepLoai: current.BangTotNghiepLoai,
                        MonGiangDayChinh: current.MonGiangDayChinh,
                        NgayBatDau: current.NgayBatDau,
                        NgayKetThuc: current.NgayKetThuc,
                        TenPhongBan: current.TenPhongBan,
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
                SiSo: current.SiSo || '',
                DaoTaoDuyet: current.DaoTaoDuyet || 0,
                TaiChinhDuyet: current.TaiChinhDuyet || 0,
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
        }, {});

        // Convert to simpler format for frontend compatibility while preserving enhanced data
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
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;

        // Calculate totals for teacher view
        let totalQC = 0;
        let totalThanhTienAll = 0;
        let totalThueAll = 0;
        let totalThucNhanAll = 0;        Object.values(sortedEnhancedGroupedByTeacher).forEach(teacherData => {
            totalQC += teacherData.totalFinancials.totalSoTiet;
            totalThanhTienAll += teacherData.totalFinancials.totalThanhTien;
            totalThueAll += teacherData.totalFinancials.totalThue;
            totalThucNhanAll += teacherData.totalFinancials.totalThucNhan;
        });

        // Debug log HSL data for MoiGiang contracts
        console.log('[MoiGiang Backend] HSL data sample:', Object.keys(sortedEnhancedGroupedByTeacher).slice(0, 3).map(teacherName => ({
            teacher: teacherName,
            HSL: sortedEnhancedGroupedByTeacher[teacherName].teacherInfo.HSL
        })));

        res.json({
            groupedByTeacher: simplifiedGroupedByTeacher,
            enhancedGroupedByTeacher: sortedEnhancedGroupedByTeacher, // Send detailed data for enhanced display, properly sorted
            SoTietDinhMuc: SoTietDinhMuc,
            // Include calculated totals for teacher view
            totalsByTeacher: {
                totalQC: totalQC,
                totalThanhTienAll: totalThanhTienAll,
                totalThueAll: totalThueAll,
                totalThucNhanAll: totalThucNhanAll
            }
        });
    } catch (error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
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

const getDuyetHopDongData = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan } = req.body;
        if (!dot || !ki || !namHoc) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học"
            });
        }

        /** ------------------------------------------------------------------
         *  1. TRUY VẤN SQL
         *  ------------------------------------------------------------------ */
        const query = `
        /* ---------- HỆ ĐẠI HỌC ---------- */
        WITH DaiHocData AS (
            SELECT
                MIN(qc.NgayBatDau)                              AS NgayBatDau,
                MAX(qc.NgayKetThuc)                              AS NgayKetThuc,
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
                gv.MaPhongBan,          -- ← khoa của giảng viên
                gv.MaPhongBan           AS MaKhoaMonHoc,        -- gán luôn làm khóa môn
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

                /* SỐ TIẾT & TÀI CHÍNH */
                SUM(qc.QuyChuan)                               AS SoTiet,
                tl.SoTien                                       AS TienMoiGiang,
                tl.SoTien * SUM(qc.QuyChuan)                    AS ThanhTien,
                tl.SoTien * SUM(qc.QuyChuan) * 0.1              AS Thue,
                tl.SoTien * SUM(qc.QuyChuan) * 0.9              AS ThucNhan,

                pb.TenPhongBan,

                /* TRẠNG THÁI DUYỆT */
                MAX(qc.DaoTaoDuyet)                             AS DaoTaoDuyet,
                MAX(qc.TaiChinhDuyet)                           AS TaiChinhDuyet
            FROM quychuan qc
                /* MATCH GIẢNG VIÊN HỆ ĐH: lấy phần trước ' - ' */
                JOIN gvmoi gv
                    ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
                LEFT JOIN tienluong tl
                    ON qc.he_dao_tao = tl.he_dao_tao AND gv.HocVi = tl.HocVi
                LEFT JOIN phongban pb
                    ON gv.MaPhongBan = pb.MaPhongBan
            WHERE
                qc.MoiGiang = 1
                AND qc.NamHoc = ?
                AND qc.Dot    = ?
                AND qc.KiHoc  = ?
                AND qc.he_dao_tao LIKE '%Đại học%'
                ${maPhongBan && maPhongBan !== 'ALL' ? 'AND gv.MaPhongBan = ?' : ''}
            /* Gộp THEO GIẢNG VIÊN + HỆ ĐÀO TẠO (KHÔNG gộp theo khoa học phần) */
            GROUP BY
                gv.id_Gvm, gv.HoTen, qc.he_dao_tao,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email,
                gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai,
                gv.STK, gv.NganHang, gv.MaPhongBan,
                qc.NamHoc, qc.KiHoc, qc.Dot,
                gv.NgayCapCCCD, gv.DiaChi,
                gv.BangTotNghiep, gv.NoiCongTac, gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,
                tl.SoTien, pb.TenPhongBan
        ),

        /* ---------- HỆ SAU ĐẠI HỌC ---------- */
        SauDaiHocData AS (
            SELECT
                MIN(qc.NgayBatDau)                              AS NgayBatDau,
                MAX(qc.NgayKetThuc)                              AS NgayKetThuc,
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
                gv.MaPhongBan           AS MaKhoaMonHoc,
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

                /* SỐ TIẾT (có hệ số 0.7) & TÀI CHÍNH */
                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                )                                             AS SoTiet,
                tl.SoTien                                       AS TienMoiGiang,
                tl.SoTien * SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                )                                             AS ThanhTien,
                tl.SoTien * SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                ) * 0.1                                       AS Thue,
                tl.SoTien * SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                ) * 0.9                                       AS ThucNhan,

                pb.TenPhongBan,
                MAX(qc.DaoTaoDuyet)                             AS DaoTaoDuyet,
                MAX(qc.TaiChinhDuyet)                           AS TaiChinhDuyet
            FROM quychuan qc
                /* MATCH GIẢNG VIÊN HỆ SĐH: lấy phần sau dấu phẩy cuối */
                JOIN gvmoi gv
                    ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen
                LEFT JOIN tienluong tl
                    ON qc.he_dao_tao = tl.he_dao_tao AND gv.HocVi = tl.HocVi
                LEFT JOIN phongban pb
                    ON gv.MaPhongBan = pb.MaPhongBan
            WHERE
                qc.MoiGiang = 1
                AND qc.NamHoc = ?
                AND qc.Dot    = ?
                AND qc.KiHoc  = ?
                AND qc.he_dao_tao NOT LIKE '%Đại học%'
                ${maPhongBan && maPhongBan !== 'ALL' ? 'AND gv.MaPhongBan = ?' : ''}
            GROUP BY
                gv.id_Gvm, gv.HoTen, qc.he_dao_tao,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email,
                gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai,
                gv.STK, gv.NganHang, gv.MaPhongBan,
                qc.NamHoc, qc.KiHoc, qc.Dot,
                gv.NgayCapCCCD, gv.DiaChi,
                gv.BangTotNghiep, gv.NoiCongTac, gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,
                tl.SoTien, pb.TenPhongBan
        )

        /* ---------- KẾT HỢP ---------- */
        SELECT * FROM DaiHocData
        UNION ALL
        SELECT * FROM SauDaiHocData
        ORDER BY SoTiet DESC, HoTen, he_dao_tao
        `;

        /* PARAMS cho 2 CTE (lặp lại) */
        const params = [namHoc, dot, ki];
        if (maPhongBan && maPhongBan !== 'ALL') params.push(maPhongBan);
        params.push(namHoc, dot, ki);
        if (maPhongBan && maPhongBan !== 'ALL') params.push(maPhongBan);

        const [results] = await connection.query(query, params);

        /** ------------------------------------------------------------------
         *  2. GOM + TÍNH TOÁN TRONG JS
         *     (từ đây không còn “double” trainingPrograms)
         *  ------------------------------------------------------------------ */
        const groupedByTeacher = results.reduce((acc, cur) => {
            const teacher = cur.HoTen;
            if (!acc[teacher]) {
                acc[teacher] = {
                    teacherInfo: {
                        id_Gvm: cur.id_Gvm,
                        HoTen: cur.HoTen,
                        GioiTinh: cur.GioiTinh,
                        NgaySinh: cur.NgaySinh,
                        CCCD: cur.CCCD,
                        NoiCapCCCD: cur.NoiCapCCCD,
                        NgayCapCCCD: cur.NgayCapCCCD,
                        Email: cur.Email,
                        MaSoThue: cur.MaSoThue,
                        HocVi: cur.HocVi,
                        ChucVu: cur.ChucVu,
                        HSL: cur.HSL,
                        DienThoai: cur.DienThoai,
                        STK: cur.STK,
                        NganHang: cur.NganHang,
                        MaPhongBan: cur.MaPhongBan,
                        DiaChi: cur.DiaChi,
                        BangTotNghiep: cur.BangTotNghiep,
                        NoiCongTac: cur.NoiCongTac,
                        BangTotNghiepLoai: cur.BangTotNghiepLoai,
                        MonGiangDayChinh: cur.MonGiangDayChinh,
                        NgayBatDau: cur.NgayBatDau,
                        NgayKetThuc: cur.NgayKetThuc,
                        TenPhongBan: cur.TenPhongBan
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

            /* Gộp theo he_dao_tao (nếu trùng thì cộng dồn) */
            const tpArr = acc[teacher].trainingPrograms;
            const existing = tpArr.find(tp => tp.he_dao_tao === cur.he_dao_tao);

            const currProgram = {
                he_dao_tao: cur.he_dao_tao,
                SoTiet: parseFloat(cur.SoTiet) || 0,
                TienMoiGiang: parseFloat(cur.TienMoiGiang) || 0,
                ThanhTien: parseFloat(cur.ThanhTien) || 0,
                Thue: parseFloat(cur.Thue) || 0,
                ThucNhan: parseFloat(cur.ThucNhan) || 0,
                MaKhoaMonHoc: cur.MaKhoaMonHoc,
                DaoTaoDuyet: cur.DaoTaoDuyet,
                TaiChinhDuyet: cur.TaiChinhDuyet
            };

            if (existing) {
                /* Cộng dồn trị số nếu đã có hệ này */
                existing.SoTiet += currProgram.SoTiet;
                existing.ThanhTien += currProgram.ThanhTien;
                existing.Thue += currProgram.Thue;
                existing.ThucNhan += currProgram.ThucNhan;
            } else {
                tpArr.push(currProgram);
            }

            /* Cộng dồn tổng */
            acc[teacher].totalFinancials.totalSoTiet += currProgram.SoTiet;
            acc[teacher].totalFinancials.totalThanhTien += currProgram.ThanhTien;
            acc[teacher].totalFinancials.totalThue += currProgram.Thue;
            acc[teacher].totalFinancials.totalThucNhan += currProgram.ThucNhan;

            return acc;
        }, {});

        /** ------------------------------------------------------------------
         *  3. SẮP XẾP & CHUẨN HÓA OUTPUT
         *  ------------------------------------------------------------------ */
        const teachersWithTotals = Object.keys(groupedByTeacher).map(name => ({
            teacherName: name,
            teacherData: groupedByTeacher[name],
            totalSoTiet: groupedByTeacher[name].totalFinancials.totalSoTiet,
            maPhongBan: groupedByTeacher[name].teacherInfo.MaPhongBan
        }));

        teachersWithTotals.sort((a, b) => {
            if (a.maPhongBan !== b.maPhongBan) {
                return (a.maPhongBan || '').localeCompare(b.maPhongBan || '', 'vi');
            }
            if (b.totalSoTiet !== a.totalSoTiet) return b.totalSoTiet - a.totalSoTiet;
            return a.teacherName.localeCompare(b.teacherName, 'vi');
        });

        const simplifiedGroupedByTeacher = teachersWithTotals.reduce((acc, { teacherName, teacherData }) => {
            acc[teacherName] = [{
                ...teacherData.teacherInfo,
                SoTiet: teacherData.totalFinancials.totalSoTiet,
                ThanhTien: teacherData.totalFinancials.totalThanhTien,
                Thue: teacherData.totalFinancials.totalThue,
                ThucNhan: teacherData.totalFinancials.totalThucNhan,
                trainingPrograms: teacherData.trainingPrograms,
                totalFinancials: teacherData.totalFinancials
            }];
            return acc;
        }, {});

        /** ------------------------------------------------------------------
         *  4. SỐ TIẾT ĐỊNH MỨC + TỔNG TOÀN BẢNG
         *  ------------------------------------------------------------------ */
        const [sotietResult] = await connection.query(
            `SELECT GiangDay FROM sotietdinhmuc LIMIT 1`
        );
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;

        let totalQC = 0, totalThanhTienAll = 0, totalThueAll = 0, totalThucNhanAll = 0;
        Object.values(groupedByTeacher).forEach(t => {
            totalQC += t.totalFinancials.totalSoTiet;
            totalThanhTienAll += t.totalFinancials.totalThanhTien;
            totalThueAll += t.totalFinancials.totalThue;
            totalThucNhanAll += t.totalFinancials.totalThucNhan;
        });

        /* ------------------------------------------------------------------ */
        /*  5. TRẢ KẾT QUẢ  */
        /* ------------------------------------------------------------------ */
        res.json({
            groupedByTeacher: simplifiedGroupedByTeacher,
            enhancedGroupedByTeacher: groupedByTeacher,    // full detail
            SoTietDinhMuc,
            totalsByTeacher: {
                totalQC,
                totalThanhTienAll,
                totalThueAll,
                totalThucNhanAll
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: "Đã xảy ra lỗi khi lấy dữ liệu",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
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

        if (!dot || !ki || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }        // Validation for contract type
        if (loaiHopDong !== "Mời giảng") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Mời giảng'"
            });
        }

        // Validation for "Mời giảng" - must select all faculties
        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            return res.status(400).json({
                success: false,
                message: "Với hợp đồng mời giảng, chỉ được chọn tất cả khoa, không thể duyệt từng khoa riêng lẻ"
            });
        }        // First, check if all records have DaoTaoDuyet = 1 (following TaiChinhCheckAll pattern)
        let unapprovedFaculties = [];

        // For mời giảng, check all faculties if no specific faculty selected
        if (!maPhongBan || maPhongBan === '' || maPhongBan === 'ALL') {
            // Get all faculties
            const [faculties] = await connection.query(`SELECT MaPhongBan FROM phongban`);

            for (const faculty of faculties) {
                const [check] = await connection.query(`
                    SELECT DaoTaoDuyet FROM quychuan 
                    WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ? AND DaLuu = 0 
                `, [faculty.MaPhongBan, dot, ki, namHoc]);

                // Check if all records in this faculty have DaoTaoDuyet = 1
                const hasUnapprovedDaoTao = check.some(record => record.DaoTaoDuyet != 1);
                if (hasUnapprovedDaoTao) {
                    unapprovedFaculties.push(faculty.MaPhongBan);
                }
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
        }        // If all checks pass, update TaiChinhDuyet = 1 for mời giảng
        let affectedRows = 0;

        // For mời giảng, update all faculties if no specific faculty selected
        if (!maPhongBan || maPhongBan === '' || maPhongBan === 'ALL') {
            // Get all faculties and update each that has all DaoTaoDuyet = 1
            const [faculties] = await connection.query(`SELECT MaPhongBan FROM phongban`);

            for (const faculty of faculties) {
                // Double-check this faculty is fully approved by DaoTao
                const [check] = await connection.query(`
                    SELECT DaoTaoDuyet FROM quychuan 
                    WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ? AND DaLuu = 0 
                `, [faculty.MaPhongBan, dot, ki, namHoc]);

                const allDaoTaoApproved = check.every(record => record.DaoTaoDuyet == 1);

                if (allDaoTaoApproved && check.length > 0) {
                    const [updateResult] = await connection.query(`
                        UPDATE quychuan 
                        SET TaiChinhDuyet = 1 
                        WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ? 
                          AND DaoTaoDuyet = 1 AND TaiChinhDuyet != 1 AND DaLuu = 0
                    `, [faculty.MaPhongBan, dot, ki, namHoc]);

                    affectedRows += updateResult.affectedRows;
                }
            }
        } const facultyText = ' của tất cả khoa';

        res.json({
            success: true,
            message: `Duyệt thành công`,
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

        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        if (!dot || !ki || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }

        // Validation for contract type
        if (loaiHopDong !== "Mời giảng") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Mời giảng'"
            });
        }

        // Validation for "Mời giảng" - must select all faculties
        if (maPhongBan && maPhongBan !== '' && maPhongBan !== 'ALL') {
            return res.status(400).json({
                success: false,
                message: "Với hợp đồng mời giảng, chỉ được chọn tất cả khoa, không thể bỏ duyệt từng khoa riêng lẻ"
            });
        }

        // Update TaiChinhDuyet = 0 for mời giảng (reverse of approval)
        let affectedRows = 0;

        // For mời giảng, update all faculties if no specific faculty selected
        if (!maPhongBan || maPhongBan === '' || maPhongBan === 'ALL') {
            // Get all faculties and update each that has TaiChinhDuyet = 1
            const [faculties] = await connection.query(`SELECT MaPhongBan FROM phongban`);

            for (const faculty of faculties) {
                const [updateResult] = await connection.query(`
                    UPDATE quychuan 
                    SET TaiChinhDuyet = 0 
                    WHERE Khoa = ? AND Dot = ? AND KiHoc = ? AND NamHoc = ? AND DaLuu = 0
                      AND TaiChinhDuyet = 1 AND DaLuu = 0 
                `, [faculty.MaPhongBan, dot, ki, namHoc]);

                affectedRows += updateResult.affectedRows;
            }
        } const facultyText = ' của tất cả khoa';

        res.json({
            success: true,
            message: `Đã bỏ duyệt thành công hợp đồng`,
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

        const { dot, ki, namHoc, maPhongBan } = req.body;

        // Validate required parameters
        if (!dot || !ki || !namHoc) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học"
            });
        }        // Validate loaiHopDong values
        let query = `
            SELECT
                MIN(qc.NgayBatDau) AS NgayBatDau,
                MAX(qc.NgayKetThuc) AS NgayKetThuc,
                qc.he_dao_tao,
                qc.NamHoc,
                qc.KiHoc,
                qc.Dot,

                -- Tính tổng số tiết theo hệ đào tạo (áp dụng 0.7 nếu nhiều giảng viên)
                SUM(
                    IF(
                        INSTR(qc.GiaoVienGiangDay, ',') > 0,
                        0.7 * qc.QuyChuan,
                        qc.QuyChuan
                    )
                ) AS SoTiet,

                -- Không lấy trung bình, sẽ tính sau dựa trên từng giảng viên
                NULL AS TienMoiGiang,

                -- Tính thành tiền, thuế, thực nhận dựa trên mức tiền thực tế của từng giảng viên
                SUM(
                    tl.SoTien * 
                    IF(
                        INSTR(qc.GiaoVienGiangDay, ',') > 0,
                        0.7 * qc.QuyChuan,
                        qc.QuyChuan
                    )
                ) AS ThanhTien,

                SUM(
                    tl.SoTien * 
                    IF(
                        INSTR(qc.GiaoVienGiangDay, ',') > 0,
                        0.7 * qc.QuyChuan,
                        qc.QuyChuan
                    ) * 0.1
                ) AS Thue,

                SUM(
                    tl.SoTien * 
                    IF(
                        INSTR(qc.GiaoVienGiangDay, ',') > 0,
                        0.7 * qc.QuyChuan,
                        qc.QuyChuan
                    ) * 0.9
                ) AS ThucNhan,

                -- Thông tin trạng thái duyệt
                MIN(qc.DaoTaoDuyet) AS DaoTaoDuyet,
                MIN(qc.TaiChinhDuyet) AS TaiChinhDuyet,

                -- Số lượng giảng viên trong hệ đào tạo này
                COUNT(DISTINCT 
                    IF(
                        INSTR(qc.GiaoVienGiangDay, ',') > 0,
                        TRIM(REPLACE(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1), ' (GVM)', '')),
                        TRIM(REPLACE(qc.GiaoVienGiangDay, ' (GVM)', ''))
                    )
                ) AS SoGiangVien

            FROM 
                quychuan qc

            -- JOIN với bảng gvmoi (INNER JOIN để chỉ lấy giảng viên tồn tại)
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

            WHERE
                qc.MoiGiang = 1 
                AND qc.NamHoc = ?
                AND qc.Dot = ?
                AND qc.KiHoc = ?
        `;
        const params = [namHoc, dot, ki];

        if (maPhongBan && maPhongBan !== "ALL") {
            query += " AND qc.Khoa = ?";
            params.push(maPhongBan);
        }

        query += `
            GROUP BY
                qc.he_dao_tao, qc.NamHoc, qc.KiHoc, qc.Dot
            ORDER BY SoTiet DESC, qc.he_dao_tao
        `;

        const [results] = await connection.query(query, params);

        // Get detailed teacher information for each training program
        const enhancedResults = [];
        for (const heDaoTao of results) {
            // Query to get detailed teacher info for this training program
            let teacherQuery = `
    SELECT
        MIN(qc.NgayBatDau) AS NgayBatDau,          -- ✅ BỔ SUNG
        MAX(qc.NgayKetThuc) AS NgayKetThuc,        -- ✅ BỔ SUNG
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
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep,
        gv.NoiCongTac,
        gv.BangTotNghiepLoai,
        gv.MonGiangDayChinh,
        pb.TenPhongBan,
        
        SUM(
            IF(
                INSTR(qc.GiaoVienGiangDay, ',') > 0,
                0.7 * qc.QuyChuan,
                qc.QuyChuan
            )
        ) AS SoTiet,
        
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
            ) * 0.9
        ) AS ThucNhan,
        
        MAX(qc.DaoTaoDuyet) AS DaoTaoDuyet,
        MAX(qc.TaiChinhDuyet) AS TaiChinhDuyet

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
        AND qc.he_dao_tao = ?
`;
            const teacherParams = [namHoc, dot, ki, heDaoTao.he_dao_tao];

            if (maPhongBan && maPhongBan !== "ALL") {
                teacherQuery += " AND qc.Khoa = ?";
                teacherParams.push(maPhongBan);
            }

            teacherQuery += `
              GROUP BY
        gv.id_Gvm, gv.HoTen, gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, 
        gv.Email, gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai, 
        gv.STK, gv.NganHang, gv.MaPhongBan, gv.NgayCapCCCD, gv.DiaChi, 
        gv.BangTotNghiep, gv.NoiCongTac, gv.BangTotNghiepLoai, gv.MonGiangDayChinh,
        pb.TenPhongBan, tl.SoTien
    ORDER BY SoTiet DESC, gv.HoTen
            `;

            const [teacherDetails] = await connection.query(teacherQuery, teacherParams);

            // Add teacher details to the training program data
            enhancedResults.push({
                ...heDaoTao,
                chiTietGiangVien: teacherDetails
            });
        }        // Get SoTietDinhMuc
        const sotietQuery = `SELECT GiangDay FROM sotietdinhmuc LIMIT 1`;
        const [sotietResult] = await connection.query(sotietQuery);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;

        // Calculate totals for training program view
        let totalSoTietHeDaoTao = 0;
        let totalThanhTienHeDaoTao = 0;
        let totalThueHeDaoTao = 0;
        let totalThucNhanHeDaoTao = 0;

        results.forEach(heDaoTao => {
            totalSoTietHeDaoTao += parseFloat(heDaoTao.SoTiet) || 0;
            totalThanhTienHeDaoTao += parseFloat(heDaoTao.ThanhTien) || 0;
            totalThueHeDaoTao += parseFloat(heDaoTao.Thue) || 0;
            totalThucNhanHeDaoTao += parseFloat(heDaoTao.ThucNhan) || 0;
        });

        res.json({
            success: true,
            data: results,
            enhancedData: enhancedResults,  // Include detailed data with teacher information
            SoTietDinhMuc: SoTietDinhMuc,
            message: `Tải dữ liệu thành công`,
            // Include calculated totals for training program view
            totalsByHeDaoTao: {
                totalSoTietHeDaoTao: totalSoTietHeDaoTao,
                totalThanhTienHeDaoTao: totalThanhTienHeDaoTao,
                totalThueHeDaoTao: totalThueHeDaoTao,
                totalThucNhanHeDaoTao: totalThucNhanHeDaoTao
            }
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

        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !ki || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }        // Validate loaiHopDong values
        if (loaiHopDong !== "Mời giảng") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Mời giảng'"
            });
        }        // Check overall status for mời giảng
        // const statusQuery = "SELECT COUNT(*) as totalRecords, COUNT(DISTINCT DaLuu) as distinctValues, MIN(DaLuu) as minValue, MAX(DaLuu) as maxVal FROM quychuan qc WHERE qc.NamHoc = ? AND qc.Dot = ? AND qc.KiHoc = ?";
        const statusQuery = `
    SELECT COUNT(*) as totalRecords, 
           COUNT(DISTINCT DaLuu) as distinctValues, 
           MIN(DaLuu) as minValue, 
           MAX(DaLuu) as maxVal 
    FROM quychuan qc 
    WHERE qc.NamHoc = ? 
      AND qc.Dot = ? 
      AND qc.KiHoc = ?
      AND qc.MoiGiang = 1`;
        const statusParams = [namHoc, dot, ki];

        if (maPhongBan && maPhongBan !== "ALL") {
            statusQuery += " AND qc.Khoa = ?";
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
        } else {            // Có bản ghi chưa đạt điều kiện - lấy chi tiết
            message = "Chưa lưu HĐ";

            const detailQuery = `
    SELECT 
        qc.ID,
        qc.Khoa,
        qc.MaHocPhan,
        qc.LopHocPhan,
        qc.TenLop,
        qc.GiaoVienGiangDay,
        qc.QuyChuan,
        qc.DaLuu,
        qc.NgayBatDau,
        qc.NgayKetThuc,
        pb.TenPhongBan as TenKhoa
    FROM quychuan qc
    LEFT JOIN phongban pb ON qc.Khoa = pb.MaPhongBan
    WHERE qc.NamHoc = ? 
      AND qc.Dot = ? 
      AND qc.KiHoc = ?
      AND qc.MoiGiang = 1          -- ✅ BỔ SUNG
      AND (qc.DaLuu IS NULL OR qc.DaLuu <> 1)
`;
            const detailParams = [namHoc, dot, ki];

            if (maPhongBan && maPhongBan !== "ALL") {
                detailQuery += " AND qc.Khoa = ?";
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
 * Check contract finance approval status based on filter conditions
 */
const checkContractFinanceApprovalStatus = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();

        const { dot, ki, namHoc, maPhongBan, loaiHopDong } = req.body;

        // Validate required parameters
        if (!dot || !ki || !namHoc || !loaiHopDong) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Đợt, Kỳ, Năm học, Loại hợp đồng"
            });
        }

        // Validate loaiHopDong values
        if (loaiHopDong !== "Mời giảng") {
            return res.status(400).json({
                success: false,
                message: "Loại hợp đồng không hợp lệ. Chỉ hỗ trợ 'Mời giảng'"
            });
        }

        // Check overall TaiChinhDuyet status for mời giảng
        let statusQuery = `
            SELECT COUNT(*) as totalRecords, 
                   COUNT(DISTINCT TaiChinhDuyet) as distinctValues, 
                   MIN(TaiChinhDuyet) as minValue, 
                   MAX(TaiChinhDuyet) as maxVal 
            FROM quychuan qc 
            WHERE qc.NamHoc = ? 
              AND qc.Dot = ? 
              AND qc.KiHoc = ?
              AND qc.MoiGiang = 1`;

        const statusParams = [namHoc, dot, ki];

        if (maPhongBan && maPhongBan !== "ALL") {
            statusQuery += " AND qc.Khoa = ?";
            statusParams.push(maPhongBan);
        }

        const [statusResults] = await connection.query(statusQuery, statusParams);
        const statusData = statusResults[0];

        let message;

        if (statusData.totalRecords === 0) {
            message = "Chưa duyệt";
        } else if (statusData.distinctValues === 1 && statusData.minValue === 1) {
            // Tất cả bản ghi đều có TaiChinhDuyet = 1
            message = "Đã duyệt";
        } else {
            // Có bản ghi chưa đạt điều kiện
            message = "Chưa duyệt";
        }

        console.log("debug tc duyet moi giang : " + message);

        res.json({
            success: true,
            message: message
        });

    } catch (error) {
        console.error("❌ Error in checkContractFinanceApprovalStatus:");
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
    checkContractFinanceApprovalStatus
};