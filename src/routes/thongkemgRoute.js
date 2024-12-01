const express = require("express");
const thongkemgController = require("../controllers/thongkemgController");
const router = express.Router();
const { showThongkemgPage } = require("../controllers/thongkemgController");
// Route để hiển thị trang vẽ biểu đồ
router.get("/thongkemg", showThongkemgPage);

// Route để lấy dữ liệu biểu đồ dưới dạng JSON
router.get("/api/thongkemg-data", thongkemgController.getThongkemgData);

// Thêm route mới
router.get("/getNamHoc", async (req, res) => {
    try {
        const connection = await createConnection();
        
        // Lấy dữ liệu từ database
        const [namHoc] = await connection.query(
            "SELECT DISTINCT namhoc as NamHoc FROM hopdonggvmoi ORDER BY namhoc DESC"
        );
        const [ki] = await connection.query(
            "SELECT DISTINCT kihoc as Ki, kihoc as value FROM hopdonggvmoi ORDER BY kihoc"
        );
        const [dot] = await connection.query(
            "SELECT DISTINCT dot as Dot, dot as value FROM hopdonggvmoi ORDER BY dot"
        );
        const [khoa] = await connection.query(
            "SELECT DISTINCT MaPhongBan as value, MaPhongBan as Khoa FROM hopdonggvmoi ORDER BY MaPhongBan"
        );

        // Thêm option "Tất cả" vào đầu mỗi mảng
        const data = {
            success: true,
            NamHoc: [{ NamHoc: 'ALL', display: 'Tất cả năm' }, ...namHoc],
            Ki: [{ Ki: 'Tất cả kỳ', value: 'ALL' }, ...ki],
            Dot: [{ Dot: 'Tất cả đợt', value: 'ALL' }, ...dot],
            Khoa: [{ value: 'ALL', Khoa: 'Tất cả khoa' }, ...khoa]
        };

        connection.release();
        res.json(data);
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
});

// Thêm route mới để lấy danh sách phòng ban
router.get("/getPhongBan", async (req, res) => {
    try {
        const connection = await createConnection();
        const [phongBan] = await connection.query(
            "SELECT DISTINCT MaPhongBan FROM hopdonggvmoi ORDER BY MaPhongBan"
        );
        
        connection.release();
        res.json({
            success: true,
            MaPhongBan: phongBan
        });
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu phòng ban:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
});

module.exports = router;
