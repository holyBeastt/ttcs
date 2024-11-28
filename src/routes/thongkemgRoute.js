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
        const [namHoc] = await connection.query(
            "SELECT DISTINCT namhoc as NamHoc FROM hopdonggvmoi ORDER BY namhoc DESC"
        );
        const [ki] = await connection.query(
            "SELECT DISTINCT kihoc as Ki, kihoc as value FROM hopdonggvmoi ORDER BY kihoc"
        );
        const [dot] = await connection.query(
            "SELECT DISTINCT dot as Dot, dot as value FROM hopdonggvmoi ORDER BY dot"
        );

        connection.release();
        res.json({
            success: true,
            NamHoc: namHoc,
            Ki: ki,
            Dot: dot
        });
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu:", error);
        res.status(500).json({
            success: false,
            message: "Lỗi server"
        });
    }
});

module.exports = router;
