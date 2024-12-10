const express = require('express');
const router = express.Router();
const thongkedoanController = require('../controllers/thongkedoanController');

// API lấy dữ liệu đồ án theo giảng viên
router.get('/data', thongkedoanController.getData);

module.exports = router;
