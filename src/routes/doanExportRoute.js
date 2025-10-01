const express = require('express');
const router = express.Router();
const { exportDoanToExcel } = require('../controllers/doanExportController');

// Route để xuất dữ liệu đồ án tốt nghiệp ra Excel
router.post('/doan-export-excel', exportDoanToExcel);

module.exports = router;
