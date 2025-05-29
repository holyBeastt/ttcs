const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');

// Các route hiện có
router.get('/log', logController.showLogTable);
router.get('/api/log', logController.getLogData);
router.get('/api/namhoc', logController.getNamHocData);
router.get('/api/nhanvien', logController.getNhanVienData);
router.get('/api/khoa', logController.getKhoaData);
router.get('/api/loaithongtin', logController.getLoaiThongTinData);

// Thêm route mới
router.get('/api/log/files', logController.getLogFiles);
router.get('/api/log/download/:filename', logController.downloadLogFile);

module.exports = router;