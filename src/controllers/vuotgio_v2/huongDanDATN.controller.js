/**
 * VUOT GIO V2 - Hướng Dẫn Đồ Án Tốt Nghiệp Controller
 * Date: 2026-02-03
 */

const service = require("../../services/vuotgio_v2/datn.service");

/**
 * Lấy danh sách đồ án tốt nghiệp
 */
const getTable = async (req, res) => {
    try {
        const filters = {
            NamHoc: req.query.NamHoc,
            dot: req.query.Dot,
            ki: req.query.Ki,
            khoa: req.query.Khoa,
            heDaoTao: req.query.HeDaoTao
        };

        const result = await service.getTable(filters);
        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Error in getTable huongDanDATN:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lấy dữ liệu" });
    }
};

/**
 * Lấy chi tiết đồ án của một giảng viên
 */
const getChiTiet = async (req, res) => {
    try {
        const giangVien = decodeURIComponent(req.params.GiangVien);
        const params = {
            giangVien,
            namHoc: req.query.NamHoc,
            dot: req.query.Dot,
            ki: req.query.Ki,
            khoa: req.query.Khoa,
            heDaoTao: req.query.HeDaoTao
        };

        const result = await service.getChiTiet(params);
        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error("Error in getChiTiet huongDanDATN:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lấy chi tiết" });
    }
};

module.exports = {
    getTable,
    getChiTiet
};
