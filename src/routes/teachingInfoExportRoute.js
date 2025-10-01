const express = require('express');
const router = express.Router();
const { exportTeachingInfoToExcel } = require('../controllers/teachingInfoExportController');

// Route để xuất dữ liệu thông tin giảng dạy ra Excel
router.post('/teaching-info-export-excel', exportTeachingInfoToExcel);

module.exports = router;
