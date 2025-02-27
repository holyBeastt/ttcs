// src/routes/logRoute.js
const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');

// Route để hiển thị trang log và bảng lichsunhaplieu
router.get('/log', logController.showLogTable);

// Route API để trả về dữ liệu JSON
router.get('/api/log', logController.getLogData);

// Route API để trả về dữ liệu năm học
router.get('/api/namhoc', logController.getNamHocData);

// Route API để trả về dữ liệu nhân viên
router.get('/api/nhanvien', logController.getNhanVienData);
router.get('/api/loaithongtin', logController.getLoaiThongTinData);

module.exports = router;
