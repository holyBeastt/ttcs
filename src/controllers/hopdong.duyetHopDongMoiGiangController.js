const express = require("express");
const multer = require("multer");
const createPoolConnection = require("../config/databasePool");

const { DON_GIA_EXPR } = require('../queries/hopdongQueries');

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
         *  Truy vấn vào bảng quychuan, tính theo 2 hệ : Đại học, Sau đại học.
         * 
         * Hệ đại học : 100% số tiết
         * Hệ sau đại học : giảng viên trước dấu phẩy 0,3 sau dấu phẩy nhân 0,7 số tiết
         * 
         * 
         *  ------------------------------------------------------------------ */
        const query = `
        /* HỆ ĐẠI HỌC  */
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
                gv.MaPhongBan,          -- Khoa 
                gv.isNghiHuu,
                gv.MaPhongBan           AS MaKhoaMonHoc,        
                qc.he_dao_tao           AS id_he_dao_tao,
                hdt.he_dao_tao          AS ten_he_dao_tao,
                qc.NamHoc,
                qc.KiHoc,
                qc.Dot,
                gv.NgayCapCCCD,
                gv.DiaChi,
                gv.BangTotNghiep,
                gv.NoiCongTac,
                gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,

                /* ===== TIỀN (DÙNG EXPR – KHÔNG JOIN tienluong) ===== */
                SUM(qc.QuyChuan)                                        AS SoTiet,
                ${DON_GIA_EXPR('qc', 'Khoa')}                           AS TienMoiGiang,
                ${DON_GIA_EXPR('qc', 'Khoa')} * SUM(qc.QuyChuan)        AS ThanhTien,
                ${DON_GIA_EXPR('qc', 'Khoa')} * SUM(qc.QuyChuan) * 0.1  AS Thue,
                ${DON_GIA_EXPR('qc', 'Khoa')} * SUM(qc.QuyChuan) * 0.9  AS ThucNhan,

                pb.TenPhongBan,

                /* Duyệt */
                MAX(qc.DaoTaoDuyet)                             AS DaoTaoDuyet,
                MAX(qc.TaiChinhDuyet)                           AS TaiChinhDuyet
            FROM quychuan qc
                /* MATCH GIẢNG VIÊN HỆ ĐH: lấy phần trước ' - ' */
                JOIN gvmoi gv
                    ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
                JOIN he_dao_tao hdt
                    ON qc.he_dao_tao = hdt.id
                LEFT JOIN phongban pb
                    ON gv.MaPhongBan = pb.MaPhongBan
            WHERE
                qc.MoiGiang = 1
                AND qc.NamHoc = ?
                AND qc.Dot    = ?
                AND qc.KiHoc  = ?
                AND hdt.cap_do = 1
                AND gv.isQuanDoi = 0
                ${maPhongBan && maPhongBan !== 'ALL' ? 'AND gv.MaPhongBan = ?' : ''}
            /* Gộp THEO GIẢNG VIÊN + HỆ ĐÀO TẠO (KHÔNG gộp theo khoa học phần) */
            GROUP BY
                gv.id_Gvm, gv.HoTen, qc.he_dao_tao, hdt.he_dao_tao,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email,
                gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai,
                gv.STK, gv.NganHang, gv.MaPhongBan, gv.isNghiHuu,
                qc.NamHoc, qc.KiHoc, qc.Dot, qc.Khoa,
                gv.NgayCapCCCD, gv.DiaChi,
                gv.BangTotNghiep, gv.NoiCongTac, gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,
                pb.TenPhongBan
        ),

        /* SAU ĐẠI HỌC */
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
                gv.isNghiHuu,
                gv.MaPhongBan           AS MaKhoaMonHoc,
                qc.he_dao_tao           AS id_he_dao_tao,
                hdt.he_dao_tao          AS ten_he_dao_tao,
                qc.NamHoc,
                qc.KiHoc,
                qc.Dot,
                gv.NgayCapCCCD,
                gv.DiaChi,
                gv.BangTotNghiep,
                gv.NoiCongTac,
                gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,

                /* ===== TIỀN (DÙNG EXPR) ===== */
                                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                )                                             AS SoTiet,
                ${DON_GIA_EXPR('qc', 'Khoa')} AS TienMoiGiang,

                ${DON_GIA_EXPR('qc', 'Khoa')} *
                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                ) AS ThanhTien,

                ${DON_GIA_EXPR('qc', 'Khoa')} *
                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                ) * 0.1 AS Thue,

                ${DON_GIA_EXPR('qc', 'Khoa')} *
                SUM(
                    ROUND(
                        qc.QuyChuan *
                        CASE WHEN qc.GiaoVienGiangDay LIKE '%,%' THEN 0.7 ELSE 1 END
                    , 2)
                ) * 0.9 AS ThucNhan,

                pb.TenPhongBan,
                MAX(qc.DaoTaoDuyet)                             AS DaoTaoDuyet,
                MAX(qc.TaiChinhDuyet)                           AS TaiChinhDuyet
            FROM quychuan qc
                
                JOIN gvmoi gv
                    ON TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1)) = gv.HoTen
                JOIN he_dao_tao hdt
                    ON qc.he_dao_tao = hdt.id
                LEFT JOIN phongban pb
                    ON gv.MaPhongBan = pb.MaPhongBan
            WHERE
                qc.MoiGiang = 1
                AND qc.NamHoc = ?
                AND qc.Dot    = ?
                AND qc.KiHoc  = ?
                AND hdt.cap_do != 1
                AND gv.isQuanDoi = 0
                ${maPhongBan && maPhongBan !== 'ALL' ? 'AND gv.MaPhongBan = ?' : ''}
            GROUP BY
                gv.id_Gvm, gv.HoTen, qc.he_dao_tao, hdt.he_dao_tao,
                gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, gv.Email,
                gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai,
                gv.STK, gv.NganHang, gv.MaPhongBan, gv.isNghiHuu,
                qc.NamHoc, qc.KiHoc, qc.Dot, qc.Khoa,
                gv.NgayCapCCCD, gv.DiaChi,
                gv.BangTotNghiep, gv.NoiCongTac, gv.BangTotNghiepLoai,
                gv.MonGiangDayChinh,
                pb.TenPhongBan
        )

        /* UNION DATA */
        SELECT * FROM DaiHocData
        UNION ALL
        SELECT * FROM SauDaiHocData
        ORDER BY SoTiet DESC, HoTen, id_he_dao_tao
        `;

        /* tham số truyền vào where */
        const params = [namHoc, dot, ki];
        if (maPhongBan && maPhongBan !== 'ALL') params.push(maPhongBan);
        params.push(namHoc, dot, ki);
        if (maPhongBan && maPhongBan !== 'ALL') params.push(maPhongBan);

        const [results] = await connection.query(query, params);

        /** ------------------------------------------------------------------
         *  2. Tính theo giảng viên
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
                        TenPhongBan: cur.TenPhongBan,
                        isNghiHuu: cur.isNghiHuu
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
            const existing = tpArr.find(tp => tp.id === cur.id_he_dao_tao);

            const currProgram = {
                id: cur.id_he_dao_tao,
                tenHe: cur.ten_he_dao_tao,
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

        // Chuyển sang Mảng để sort theo số tiết
        const teachersWithTotals = Object.keys(groupedByTeacher).map(name => ({
            teacherName: name,
            teacherData: groupedByTeacher[name],
            totalSoTiet: groupedByTeacher[name].totalFinancials.totalSoTiet,
            maPhongBan: groupedByTeacher[name].teacherInfo.MaPhongBan
        }));

        // sort theo số tiết
        teachersWithTotals.sort((a, b) => {
            if (a.maPhongBan !== b.maPhongBan) {
                return (a.maPhongBan || '').localeCompare(b.maPhongBan || '', 'vi');
            }
            if (b.totalSoTiet !== a.totalSoTiet) return b.totalSoTiet - a.totalSoTiet;
            return a.teacherName.localeCompare(b.teacherName, 'vi');
        });

        // sau khi sort, chuyển lại từ mảng sang obj
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
         *  4. SỐ TIẾT ĐỊNH MỨC 2 ĐỐI TƯỢNG NGHỈ HƯU VÀ CHƯA NGHỈ HƯU
         *  ------------------------------------------------------------------ */
        const [sotietResult] = await connection.query(
            `SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`
        );
        const SoTietDinhMuc = sotietResult[0]?.GiangDay;
        const SoTietDinhMucChuaNghiHuu = sotietResult[0]?.GiangDayChuaNghiHuu;
        const SoTietDinhMucDaNghiHuu = sotietResult[0]?.GiangDayDaNghiHuu;

        // TÍNH TỔNG TIỀN
        let totalQC = 0, totalThanhTienAll = 0, totalThueAll = 0, totalThucNhanAll = 0;
        Object.values(groupedByTeacher).forEach(t => {
            totalQC += t.totalFinancials.totalSoTiet;
            totalThanhTienAll += t.totalFinancials.totalThanhTien;
            totalThueAll += t.totalFinancials.totalThue;
            totalThucNhanAll += t.totalFinancials.totalThucNhan;
        });

        // gom thành json 
        res.json({
            groupedByTeacher: simplifiedGroupedByTeacher,
            enhancedGroupedByTeacher: groupedByTeacher,    // full detail
            SoTietDinhMuc,
            SoTietDinhMucChuaNghiHuu,
            SoTietDinhMucDaNghiHuu,
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

        // Lấy thông tin session để ghi log
        const userId = req.session.userId;
        const tenNhanVien = req.session.TenNhanVien || '';
        const khoa = req.session.MaPhongBan || '';

        // Mảng chứa tất cả log entries
        const logEntries = [];

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
                        UPDATE quychuan qc
                        JOIN gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
                        SET qc.TaiChinhDuyet = 1 
                        WHERE qc.Khoa = ? AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? 
                          AND qc.DaoTaoDuyet = 1 AND qc.TaiChinhDuyet != 1 AND qc.DaLuu = 0
                          AND gv.isQuanDoi = 0
                    `, [faculty.MaPhongBan, dot, ki, namHoc]);

                    affectedRows += updateResult.affectedRows;

                    // Ghi log cho từng khoa được cập nhật
                    if (updateResult.affectedRows > 0) {
                        const noiDungThayDoi = `Duyệt tài chính ${updateResult.affectedRows} hợp đồng mời giảng - Khoa: ${faculty.MaPhongBan}, Đợt: ${dot}, Kì: ${ki}, Năm: ${namHoc}`;
                        logEntries.push([
                            userId,
                            tenNhanVien,
                            khoa,
                            'Duyệt hợp đồng mời giảng',
                            noiDungThayDoi,
                            new Date()
                        ]);
                    }
                }
            }
        }

        // Ghi tất cả log entries vào database một lần
        if (logEntries.length > 0) {
            await connection.query(
                `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES ?`,
                [logEntries]
            );
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

        // Lấy thông tin session để ghi log
        const userId = req.session.userId;
        const tenNhanVien = req.session.TenNhanVien || '';
        const khoa = req.session.MaPhongBan || '';

        // Mảng chứa tất cả log entries
        const logEntries = [];

        // For mời giảng, update all faculties if no specific faculty selected
        if (!maPhongBan || maPhongBan === '' || maPhongBan === 'ALL') {
            // Get all faculties and update each that has TaiChinhDuyet = 1
            const [faculties] = await connection.query(`SELECT MaPhongBan FROM phongban`);

            for (const faculty of faculties) {
                const [updateResult] = await connection.query(`
                    UPDATE quychuan qc
                    JOIN gvmoi gv ON SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1) = gv.HoTen
                    SET qc.TaiChinhDuyet = 0 
                    WHERE qc.Khoa = ? AND qc.Dot = ? AND qc.KiHoc = ? AND qc.NamHoc = ? AND qc.DaLuu = 0
                      AND qc.TaiChinhDuyet = 1
                      AND gv.isQuanDoi = 0
                `, [faculty.MaPhongBan, dot, ki, namHoc]);

                affectedRows += updateResult.affectedRows;

                // Ghi log cho từng khoa được cập nhật
                if (updateResult.affectedRows > 0) {
                    const noiDungThayDoi = `Bỏ duyệt tài chính ${updateResult.affectedRows} hợp đồng mời giảng - Khoa: ${faculty.MaPhongBan}, Đợt: ${dot}, Kì: ${ki}, Năm: ${namHoc}`;
                    logEntries.push([
                        userId,
                        tenNhanVien,
                        khoa,
                        'Bỏ duyệt hợp đồng mời giảng',
                        noiDungThayDoi,
                        new Date()
                    ]);
                }
            }
        }

        // Ghi tất cả log entries vào database một lần
        if (logEntries.length > 0) {
            await connection.query(
                `INSERT INTO lichsunhaplieu (id_User, TenNhanVien, Khoa, LoaiThongTin, NoiDungThayDoi, ThoiGianThayDoi) VALUES ?`,
                [logEntries]
            );
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
                qc.he_dao_tao AS id,
                hdt.he_dao_tao AS tenHe,
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

            -- JOIN với bảng he_dao_tao để lấy tên hệ đào tạo
            JOIN he_dao_tao hdt
                ON qc.he_dao_tao = hdt.id

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
                AND gv.isQuanDoi = 0
        `;
        const params = [namHoc, dot, ki];

        if (maPhongBan && maPhongBan !== "ALL") {
            query += " AND qc.Khoa = ?";
            params.push(maPhongBan);
        }

        query += `
            GROUP BY
                qc.he_dao_tao, hdt.he_dao_tao, qc.NamHoc, qc.KiHoc, qc.Dot
            ORDER BY SoTiet DESC, hdt.he_dao_tao
        `;

        const [results] = await connection.query(query, params);

        // Get detailed teacher information for each training program
        const enhancedResults = [];
        for (const heDaoTao of results) {
            // Query to get detailed teacher info for this training program
            // Sử dụng DON_GIA_EXPR thay vì LEFT JOIN tienluong để tránh duplicate rows
            let teacherQuery = `
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
        gv.NgayCapCCCD,
        gv.DiaChi,
        gv.BangTotNghiep,
        gv.NoiCongTac,
        gv.BangTotNghiepLoai,
        gv.MonGiangDayChinh,
        gv.isNghiHuu,
        pb.TenPhongBan,
        
        SUM(
            IF(
                INSTR(qc.GiaoVienGiangDay, ',') > 0,
                0.7 * qc.QuyChuan,
                qc.QuyChuan
            )
        ) AS SoTiet,
        
        ${DON_GIA_EXPR('qc', 'Khoa')} AS TienMoiGiang,
        
        ${DON_GIA_EXPR('qc', 'Khoa')} * SUM(
            IF(
                INSTR(qc.GiaoVienGiangDay, ',') > 0,
                0.7 * qc.QuyChuan,
                qc.QuyChuan
            )
        ) AS ThanhTien,
        
        ${DON_GIA_EXPR('qc', 'Khoa')} * SUM(
            IF(
                INSTR(qc.GiaoVienGiangDay, ',') > 0,
                0.7 * qc.QuyChuan,
                qc.QuyChuan
            )
        ) * 0.1 AS Thue,
        
        ${DON_GIA_EXPR('qc', 'Khoa')} * SUM(
            IF(
                INSTR(qc.GiaoVienGiangDay, ',') > 0,
                0.7 * qc.QuyChuan,
                qc.QuyChuan
            )
        ) * 0.9 AS ThucNhan,
        
        MAX(qc.DaoTaoDuyet) AS DaoTaoDuyet,
        MAX(qc.TaiChinhDuyet) AS TaiChinhDuyet

    FROM 
        quychuan qc
    JOIN he_dao_tao hdt
        ON qc.he_dao_tao = hdt.id
    JOIN gvmoi gv 
        ON 
            IF(
                INSTR(qc.GiaoVienGiangDay, ',') > 0,
                TRIM(REPLACE(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ',', -1), ' (GVM)', '')),
                TRIM(REPLACE(qc.GiaoVienGiangDay, ' (GVM)', ''))
            ) = gv.HoTen
    LEFT JOIN phongban pb 
        ON gv.MaPhongBan = pb.MaPhongBan
    WHERE
        qc.MoiGiang = 1 
        AND qc.NamHoc = ?
        AND qc.Dot = ?
        AND qc.KiHoc = ?
        AND qc.he_dao_tao = ?
        AND gv.isQuanDoi = 0
`;
            const teacherParams = [namHoc, dot, ki, heDaoTao.id];

            if (maPhongBan && maPhongBan !== "ALL") {
                teacherQuery += " AND qc.Khoa = ?";
                teacherParams.push(maPhongBan);
            }

            teacherQuery += `
              GROUP BY
        gv.id_Gvm, gv.HoTen, gv.GioiTinh, gv.NgaySinh, gv.CCCD, gv.NoiCapCCCD, 
        gv.Email, gv.MaSoThue, gv.HocVi, gv.ChucVu, gv.HSL, gv.DienThoai, 
        gv.STK, gv.NganHang, gv.MaPhongBan, gv.NgayCapCCCD, gv.DiaChi, 
        gv.BangTotNghiep, gv.NoiCongTac, gv.BangTotNghiepLoai, gv.MonGiangDayChinh, gv.isNghiHuu,
        pb.TenPhongBan
    ORDER BY SoTiet DESC, gv.HoTen
            `;

            const [teacherDetails] = await connection.query(teacherQuery, teacherParams);

            // Add teacher details to the training program data
            enhancedResults.push({
                ...heDaoTao,
                chiTietGiangVien: teacherDetails
            });
        }        // Get SoTietDinhMuc
        const sotietQuery = `SELECT GiangDay, GiangDayChuaNghiHuu, GiangDayDaNghiHuu FROM sotietdinhmuc LIMIT 1`;
        const [sotietResult] = await connection.query(sotietQuery);
        const SoTietDinhMuc = sotietResult[0]?.GiangDay || 0;
        const SoTietDinhMucChuaNghiHuu = sotietResult[0]?.GiangDayChuaNghiHuu || SoTietDinhMuc || 280;
        const SoTietDinhMucDaNghiHuu = sotietResult[0]?.GiangDayDaNghiHuu || 560;

        // Calculate totals for training program view - Tách riêng ĐTPH và khác
        let totalDTPH = {
            totalSoTietHeDaoTao: 0,
            totalThanhTienHeDaoTao: 0,
            totalThueHeDaoTao: 0,
            totalThucNhanHeDaoTao: 0
        };

        let totalMienBac = {
            totalSoTietHeDaoTao: 0,
            totalThanhTienHeDaoTao: 0,
            totalThueHeDaoTao: 0,
            totalThucNhanHeDaoTao: 0
        };

        // Lấy dữ liệu chi tiết để phân loại theo khoa
        for (const heDaoTao of enhancedResults) {
            // Duyệt qua từng giảng viên trong hệ đào tạo để phân loại theo khoa
            heDaoTao.chiTietGiangVien.forEach(giangVien => {
                const soTiet = parseFloat(giangVien.SoTiet) || 0;
                const thanhTien = parseFloat(giangVien.ThanhTien) || 0;
                const thue = parseFloat(giangVien.Thue) || 0;
                const thucNhan = parseFloat(giangVien.ThucNhan) || 0;

                if (giangVien.MaPhongBan === 'ĐTPH') {
                    totalDTPH.totalSoTietHeDaoTao += soTiet;
                    totalDTPH.totalThanhTienHeDaoTao += thanhTien;
                    totalDTPH.totalThueHeDaoTao += thue;
                    totalDTPH.totalThucNhanHeDaoTao += thucNhan;
                } else {
                    totalMienBac.totalSoTietHeDaoTao += soTiet;
                    totalMienBac.totalThanhTienHeDaoTao += thanhTien;
                    totalMienBac.totalThueHeDaoTao += thue;
                    totalMienBac.totalThucNhanHeDaoTao += thucNhan;
                }
            });
        }

        // Debug log to verify structure
        console.log('Enhanced Results Sample:', enhancedResults.length > 0 ? {
            firstItem: {
                id: enhancedResults[0].id,
                tenHe: enhancedResults[0].tenHe,
                hasId: !!enhancedResults[0].id,
                hasTenHe: !!enhancedResults[0].tenHe,
                keys: Object.keys(enhancedResults[0])
            }
        } : 'No data');

        res.json({
            success: true,
            data: results,
            enhancedData: enhancedResults,  // Include detailed data with teacher information
            SoTietDinhMuc: SoTietDinhMuc,
            SoTietDinhMucChuaNghiHuu: SoTietDinhMucChuaNghiHuu,
            SoTietDinhMucDaNghiHuu: SoTietDinhMucDaNghiHuu,
            message: `Tải dữ liệu thành công`,
            // Include calculated totals for training program view - Tách riêng ĐTPH và Miền Bắc
            totalsByHeDaoTao: {
                DTPH: totalDTPH,
                MIEN_BAC: totalMienBac,
                // Giữ lại tổng chung nếu cần
                TONG_CHUNG: {
                    totalSoTietHeDaoTao: totalDTPH.totalSoTietHeDaoTao + totalMienBac.totalSoTietHeDaoTao,
                    totalThanhTienHeDaoTao: totalDTPH.totalThanhTienHeDaoTao + totalMienBac.totalThanhTienHeDaoTao,
                    totalThueHeDaoTao: totalDTPH.totalThueHeDaoTao + totalMienBac.totalThueHeDaoTao,
                    totalThucNhanHeDaoTao: totalDTPH.totalThucNhanHeDaoTao + totalMienBac.totalThucNhanHeDaoTao
                }
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