/**
 * VUOT GIO V2 - Thống Kê Giảng Dạy (TKB) Controller
 * Date: 2026-04-28
 */

const service = require("../../services/vuotgio_v2/giangDay.service");

/**
 * Lấy bộ lọc cho trang thống kê
 */
const getFilters = async (req, res) => {
    try {
        const filters = await service.getFilters();
        res.json({ success: true, data: filters });
    } catch (error) {
        console.error("[thongKeGiangDay.getFilters] Error:", error);
        res.status(500).json({ success: false, message: "Không thể tải bộ lọc" });
    }
};

/**
 * Lấy dữ liệu thống kê giảng dạy
 */
const getData = async (req, res) => {
    try {
        const { dot, ki, namHoc, khoa, heDaoTao } = req.body || {};
        const filters = { dot, ki, namHoc, khoa, heDaoTao };

        const result = await service.getStatistics(filters);
        res.json({ success: true, ...result });
    } catch (error) {
        console.error("[thongKeGiangDay.getData] Error:", error);
        res.status(500).json({ success: false, message: "Không thể lấy dữ liệu thống kê" });
    }
};

module.exports = {
    getFilters,
    getData,
};
