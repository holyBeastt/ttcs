const nckhService = require("../../services/vuotgioDuKien/nckh.service");

const getNCKHDuKien = async (req, res) => {
    try {
        const namHoc = req.query.NamHoc || req.query.namHoc;
        const khoaId = req.query.Khoa || req.query.khoaId;
        const keyword = req.query.keyword;
        const data = await nckhService.getNCKHDuKien(namHoc, khoaId, keyword);
        res.json(data);
    } catch (error) {
        console.error("Lỗi getNCKHDuKien:", error);
        res.status(500).json({ error: "Có lỗi xảy ra" });
    }
};

const getNCKHChiTiet = async (req, res) => {
    try {
        const { lecturerId, namHoc } = req.query;
        const data = await nckhService.getNCKHChiTiet(lecturerId, namHoc);
        res.json(data);
    } catch (error) {
        console.error("Lỗi getNCKHChiTiet:", error);
        res.status(500).json({ error: "Có lỗi xảy ra" });
    }
};

module.exports = {
    getNCKHDuKien,
    getNCKHChiTiet
};
