/**
 * NCKH V2 Controllers - Base & Entry Point
 * Entry point cho tất cả NCKH V2 controllers + các functions cơ bản
 * Date: 2026-01-24 (Merged from index.js)
 */

const createPoolConnection = require("../../config/databasePool");
const unifiedController = require('./unified.controller');
const tongHopController = require('./tongHop.controller');

// =====================================================
// RENDER VIEWS
// =====================================================

const getDanhSachNCKHV2 = (req, res) => {
    res.render("nckh.danhSachNCKH.ejs");
};

const getThemMoiNCKHV2 = (req, res) => {
    res.render("nckh.themMoiNCKH.ejs");
};

// =====================================================
// API CHUNG
// =====================================================

/**
 * Lấy danh sách giảng viên cơ hữu
 */
const getTeacherV2 = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const [results] = await connection.execute(
            `SELECT TenNhanVien AS HoTen, MonGiangDayChinh FROM nhanvien`
        );
        res.json(results);
    } catch (error) {
        console.error("Error fetching teachers V2:", error);
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu giảng viên" });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EXPORTS (Entry Point)
// =====================================================

module.exports = {
    // Base controller
    getDanhSachNCKHV2,
    getThemMoiNCKHV2,
    getTeacherV2,

    // Tổng hợp số tiết
    ...tongHopController,

    // Unified API
    ...unifiedController,

    // Shortcuts cho từng loại NCKH (dùng unified)
    controllers: unifiedController.controllers
};
