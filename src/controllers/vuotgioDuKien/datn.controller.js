const datnService = require("../../services/vuotgioDuKien/datn.service");

const getDoAnTotNghiepDuKien = async (req, res) => {
    try {
        const namHoc = req.query.NamHoc || req.query.namHoc;
        const khoa = req.query.Khoa || req.query.khoaId;
        const dot = req.query.Dot || req.query.dot;
        const kiHoc = req.query.KiHoc || req.query.kiHoc;

        const data = await datnService.getDoAnTotNghiepDuKien(namHoc, khoa, dot, kiHoc);
        res.json(data);
    } catch (error) {
        console.error("Lỗi getDoAnTotNghiepDuKien:", error);
        res.status(500).json({ error: "Có lỗi xảy ra" });
    }
};

module.exports = {
    getDoAnTotNghiepDuKien
};
