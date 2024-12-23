const express = require("express");
const thongkevuotgioController = require("../controllers/thongkevuotgioController");
const router = express.Router();
const { showThongkevuotgioPage } = require("../controllers/thongkevuotgioController");
// Route để hiển thị trang vẽ biểu đồ
router.get("/thongkevuotgio", showThongkevuotgioPage);

// Route để lấy dữ liệu biểu đồ dưới dạng JSON
router.get("/api/thongkevuotgio-data", thongkevuotgioController.getThongkevuotgioData);

// Route để lấy dữ liệu cho biểu đồ giảng dạy
router.get("/api/thongke-giangday-data", thongkevuotgioController.getThongkeGiangDayData);

// Thêm route mới
router.get("/getNamHoc", async (req, res) => {
    try {
        const connection = await createConnection();
        
        // Lấy dữ liệu từ database
        const [namHoc] = await connection.query(
            "SELECT DISTINCT namhoc as NamHoc FROM namhoc ORDER BY namhoc DESC"
        );
        const [hocky] = await connection.query(
            "SELECT DISTINCT HocKy as value, HocKy as HocKy FROM giangday ORDER BY HocKy"
        );

        const allNamHoc = [{ NamHoc: 'ALL' }, ...namHoc];
        const allHocKy = [{ HocKy: 'Tất cả kỳ', value: 'ALL' }, ...hocky];

        const data = {
            success: true,
            NamHoc: allNamHoc,
            HocKy: allHocKy // Thêm dữ liệu kỳ học vào response
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

// Thêm route mới để lấy dữ liệu phòng ban
router.get("/getPhongBan", async (req, res) => {
    try {
        const connection = await createConnection();
        // Lấy khoa từ các bảng giangday, giuaky
        const [phongBan] = await connection.query(`
            SELECT DISTINCT khoa as MaPhongBan 
            FROM (
                SELECT DISTINCT khoa FROM giangday
                UNION
                SELECT DISTINCT khoa FROM giuaky
            ) AS combined_tables 
            ORDER BY khoa
        `);
        
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
