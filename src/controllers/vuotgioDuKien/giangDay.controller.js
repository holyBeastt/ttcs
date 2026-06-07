const giangDayService = require("../../services/vuotgioDuKien/giangDay.service");

const getGiangDayQuyChuan = async (req, res) => {
    try {
        const { Khoa, Dot, KiHoc } = req.query;
        let { NamHoc } = req.query;

        if (!NamHoc) {
            return res.json([]);
        }

        const data = await giangDayService.getGiangDayQuyChuan(NamHoc, Khoa, Dot, KiHoc);
        res.json(data);
    } catch (error) {
        console.error("Lỗi lấy dữ liệu giảng dạy quy chuẩn (dự kiến):", error);
        res.status(500).json({ error: "Có lỗi xảy ra" });
    }
};

module.exports = {
    getGiangDayQuyChuan
};
