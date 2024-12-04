const express = require('express');
const router = express.Router();
const { exportVuotGio, getGiangVienList } = require('../controllers/vuotGioExportController');

// Định nghĩa các route
router.get('/vuotGioExport', (req, res) => {
    res.render('vuotGioExport');
});
router.get('/api/giangvien', getGiangVienList);
router.get('/api/export-vuot-gio', exportVuotGio);

// Định nghĩa route cho API giảng viên
router.get('/api/giangvien', async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const query = 'SELECT GiangVien, Khoa FROM giangday';
        const [results] = await connection.query(query);
        res.json(results);
    } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).send("Internal Server Error");
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router; // Xuất router