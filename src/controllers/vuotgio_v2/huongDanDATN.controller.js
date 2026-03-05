/**
 * VUOT GIO V2 - Hướng Dẫn Đồ Án Tốt Nghiệp Controller
 * Hiển thị dữ liệu từ exportdoantotnghiep (isMoiGiang = 0)
 * Nhóm theo giảng viên với tổng số tiết
 * Date: 2026-02-03
 */

const createPoolConnection = require("../../config/databasePool");

// =====================================================
// GET TABLE - Lấy danh sách nhóm theo giảng viên
// =====================================================

const getTable = async (req, res) => {
    let connection;
    try {
        const { NamHoc, Dot, Ki, Khoa, HeDaoTao } = req.query;

        connection = await createPoolConnection();

        // Query cơ bản với điều kiện isMoiGiang = 0
        let query = `
            SELECT 
                GiangVien,
                MaPhongBan AS Khoa,
                SUM(SoTiet) AS TongSoTiet,
                COUNT(*) AS SoLuongBanGhi
            FROM exportdoantotnghiep
            WHERE isMoiGiang = 0
        `;
        const values = [];

        // Thêm điều kiện filter
        if (NamHoc) {
            query += ` AND NamHoc = ?`;
            values.push(NamHoc);
        }

        if (Dot && Dot !== '') {
            query += ` AND Dot = ?`;
            values.push(Dot);
        }

        if (Ki && Ki !== '') {
            query += ` AND Ki = ?`;
            values.push(Ki);
        }

        if (Khoa && Khoa !== 'ALL') {
            query += ` AND MaPhongBan = ?`;
            values.push(Khoa);
        }

        if (HeDaoTao && HeDaoTao !== '') {
            query += ` AND he_dao_tao = ?`;
            values.push(HeDaoTao);
        }

        // Group by giảng viên
        query += ` GROUP BY GiangVien, MaPhongBan ORDER BY GiangVien`;

        const [rows] = await connection.query(query, values);

        // Tính tổng số tiết
        const tongSoTiet = rows.reduce((sum, row) => sum + (parseFloat(row.TongSoTiet) || 0), 0);

        res.status(200).json({
            success: true,
            data: rows,
            tongSoTiet: tongSoTiet
        });

    } catch (error) {
        console.error("Error in getTable huongDanDATN:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy dữ liệu"
        });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// GET CHI TIET - Lấy chi tiết bản ghi theo giảng viên
// =====================================================

const getChiTiet = async (req, res) => {
    let connection;
    try {
        const giangVien = decodeURIComponent(req.params.GiangVien);
        const { NamHoc, Dot, Ki, Khoa, HeDaoTao } = req.query;

        connection = await createPoolConnection();

        let query = `
            SELECT 
                ID,
                SinhVien,
                MaSV,
                khoa_sinh_vien AS KhoaSV,
                nganh AS Nganh,
                TenDeTai,
                GiangVien,
                SoTiet,
                NgayBatDau,
                NgayKetThuc,
                MaPhongBan AS Khoa,
                SoQD,
                isHDChinh
            FROM exportdoantotnghiep
            WHERE isMoiGiang = 0 AND GiangVien = ?
        `;
        const values = [giangVien];

        // Thêm điều kiện filter
        if (NamHoc) {
            query += ` AND NamHoc = ?`;
            values.push(NamHoc);
        }

        if (Dot && Dot !== '') {
            query += ` AND Dot = ?`;
            values.push(Dot);
        }

        if (Ki && Ki !== '') {
            query += ` AND Ki = ?`;
            values.push(Ki);
        }

        if (Khoa && Khoa !== 'ALL') {
            query += ` AND MaPhongBan = ?`;
            values.push(Khoa);
        }

        if (HeDaoTao && HeDaoTao !== '') {
            query += ` AND he_dao_tao = ?`;
            values.push(HeDaoTao);
        }

        query += ` ORDER BY SinhVien`;

        const [rows] = await connection.query(query, values);

        // Tính tổng số tiết của giảng viên này
        const tongSoTiet = rows.reduce((sum, row) => sum + (parseFloat(row.SoTiet) || 0), 0);

        res.status(200).json({
            success: true,
            data: rows,
            giangVien: giangVien,
            tongSoTiet: tongSoTiet
        });

    } catch (error) {
        console.error("Error in getChiTiet huongDanDATN:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi khi lấy chi tiết"
        });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    getTable,
    getChiTiet
};
