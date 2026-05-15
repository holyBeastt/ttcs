/**
 * VUOT GIO V2 - Hướng Dẫn Tham Quan Thực Tế Controller
 * Date: 2026-04-28
 */

const service = require("../../services/vuotgio_v2/huongDanThamQuan.service");

/**
 * Lấy danh sách bộ lọc cho trang
 */
const getFilters = async (req, res) => {
    try {
        const filters = await service.getFilters();
        res.json({ success: true, data: filters });
    } catch (error) {
        console.error("Error in getFilters huongDanThamQuan:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lấy bộ lọc" });
    }
};

/**
 * Lấy danh sách dữ liệu với bộ lọc
 */
const getTable = async (req, res) => {
    try {
        const filters = {
            NamHoc: req.query.NamHoc,
            Dot: req.query.Dot,
            KiHoc: req.query.KiHoc,
            Khoa: req.query.Khoa,
            HeDaoTao: req.query.HeDaoTao
        };

        const data = await service.getTable(filters);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Error in getTable huongDanThamQuan:", error);
        res.status(500).json({ success: false, message: "Lỗi khi lấy dữ liệu" });
    }
};

/**
 * Lưu bản ghi mới
 */
const save = async (req, res) => {
    const user = {
        id: req.session?.userId || 1,
        name: req.session?.TenNhanVien || 'ADMIN'
    };

    try {
        const insertId = await service.save(req.body, user);
        res.status(200).json({ success: true, message: "Thêm thành công!", id: insertId });
    } catch (error) {
        console.error("Error in save huongDanThamQuan:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Cập nhật bản ghi
 */
const edit = async (req, res) => {
    const user = {
        id: req.session?.userId || 1,
        name: req.session?.TenNhanVien || 'ADMIN'
    };
    const { id } = req.params;

    try {
        await service.edit(id, req.body, user);
        res.status(200).json({ success: true, message: "Cập nhật thành công!" });
    } catch (error) {
        console.error("Error in edit huongDanThamQuan:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Batch approve/unapprove
 */
const batchApprove = async (req, res) => {
    const user = {
        id: req.session?.userId || 1,
        name: req.session?.TenNhanVien || 'ADMIN'
    };
    const records = req.body.updates || req.body;

    if (!records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: "Thiếu dữ liệu cần cập nhật." });
    }

    try {
        const count = await service.batchApprove(records, user);
        res.status(200).json({ success: true, message: `Đã cập nhật ${count} bản ghi!` });
    } catch (error) {
        console.error("Error in batchApprove huongDanThamQuan:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Xóa bản ghi
 */
const deleteRecord = async (req, res) => {
    const user = {
        id: req.session?.userId || 1,
        name: req.session?.TenNhanVien || 'ADMIN'
    };
    const { id } = req.params;

    try {
        await service.delete(id, user);
        res.status(200).json({ success: true, message: "Xóa thành công!" });
    } catch (error) {
        console.error("Error in delete huongDanThamQuan:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getFilters,
    getTable,
    save,
    edit,
    batchApprove,
    delete: deleteRecord
};
