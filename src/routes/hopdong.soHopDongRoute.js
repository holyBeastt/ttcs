const express = require('express');
const router = express.Router();
const soHopDongController = require('../controllers/hopdong.soHopDongController');

// Route to display contract numbers page
router.get('/sohopdong', soHopDongController.getSoHopDongPage);

// Route to display contract numbers page for đồ án
router.get('/sohopdong-doan', soHopDongController.getSoHopDongDoAnPage);

// lấy data của số hợp đồng mời giảng
router.get('/api/hopdong-list', soHopDongController.getHopDongList);

// lấy data của số hợp đồng đồ án
router.get('/api/hopdong-doan-list', soHopDongController.getHopDongDoAnList);

// Setup số hợp đồng mời giảng
router.post('/api/setup-so-hopdong-toan-bo', soHopDongController.setupSoHopDongToanBo);

// Setup số hợp đồng đồ án
router.post('/api/setup-so-hopdong-do-an', soHopDongController.setupSoHopDongDoAn);

// xem trước khi tạo số hợp đồng mời giảng
router.post('/api/preview-so-hop-dong-moi-giang', soHopDongController.previewSoHopDongMoiGiang);

// xem trước khi tạo số hợp đồng đồ án
router.post('/api/preview-so-hop-dong-do-an', soHopDongController.previewSoHopDongDoAn);

module.exports = router;
