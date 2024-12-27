const express = require('express');
const router = express.Router();
const thongkedoanController = require('../controllers/thongkedoanController');

// API lấy dữ liệu đồ án theo giảng viên
router.get('/data', thongkedoanController.getData);

router.get("/getNamHoc", async (req, res) => {
    try {
        const connection = await createConnection();
        
        // Lấy dữ liệu từ database
        const [namHoc] = await connection.query(
            "SELECT DISTINCT namhoc as NamHoc FROM exportdoantotnghiep ORDER BY namhoc DESC"
        );
        const [khoa] = await connection.query(
            "SELECT DISTINCT MaPhongBan as value, MaPhongBan as Khoa FROM exportdoantotnghiep ORDER BY MaPhongBan"
        );

        // Thêm option "Tất cả" vào đầu mỗi mảng
        const allNamHoc = [{ NamHoc: 'ALL' }, ...namHoc];
        const allKhoa = [{ value: 'ALL', Khoa: 'Tất cả khoa' }, ...khoa];

        const data = {
            success: true,
            NamHoc: allNamHoc,
            Khoa: allKhoa
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

router.get("/getPhongBan", async (req, res) => {
    try {
        const connection = await createConnection();
        // Thêm DISTINCT để loại bỏ các giá trị trùng lặp
        const [phongBan] = await connection.query(
            "SELECT DISTINCT MaPhongBan FROM exportdoantotnghiep ORDER BY MaPhongBan"
        );
        
        // Tạo mảng mới không có giá trị trùng lặp
        const uniquePhongBan = Array.from(new Set(phongBan.map(item => item.MaPhongBan)))
            .map(maPB => ({ MaPhongBan: maPB }));
        
        connection.release();
        res.json({
            success: true,
            MaPhongBan: uniquePhongBan
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
