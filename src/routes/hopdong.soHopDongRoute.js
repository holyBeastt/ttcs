const express = require('express');
const router = express.Router();
const soHopDongController = require('../controllers/hopdong.soHopDongController');

// Route to display contract numbers page
router.get('/sohopdong', soHopDongController.getSoHopDongPage);

// API routes for contract number management
router.get('/api/hopdong-list', soHopDongController.getHopDongList);
router.post('/api/setup-so-hopdong-toan-bo', soHopDongController.setupSoHopDongToanBo);
router.get('/api/contract-summary', soHopDongController.getContractSummary);
router.post('/api/preview-setup', soHopDongController.previewSetup);

// API routes for contract termination number management
router.post('/api/setup-so-thanhly-toan-bo', soHopDongController.setupSoThanhLyToanBo);
router.get('/api/termination-summary', soHopDongController.getTerminationSummary);
router.post('/api/preview-termination-setup', soHopDongController.previewTerminationSetup);

// API routes for synchronized contract and termination number management
router.post('/api/preview-synchronized-setup', soHopDongController.previewSynchronizedSetup);
router.post('/api/setup-synchronized-numbers', soHopDongController.setupSynchronizedNumbers);
router.get('/api/unified-summary', soHopDongController.getUnifiedSummary);

// ===== THESIS PROJECT (ĐỒ ÁN) ROUTES =====

// Route to display thesis project numbers page
router.get('/sodoan', soHopDongController.getDoAnPage);

// API routes for thesis project number management
router.get('/api/doan-list', soHopDongController.getDoAnList);
router.post('/api/setup-so-qd-doan-toan-bo', soHopDongController.setupSoQDDoAnToanBo);
router.get('/api/doan-summary', soHopDongController.getDoAnSummary);
router.post('/api/preview-doan-setup', soHopDongController.previewDoAnSetup);

// API routes for synchronized thesis project number management
router.post('/api/preview-doan-synchronized-setup', soHopDongController.previewDoAnSynchronizedSetup);
router.post('/api/setup-doan-synchronized-numbers', soHopDongController.setupDoAnSynchronizedNumbers);
router.get('/api/doan-unified-summary', soHopDongController.getDoAnUnifiedSummary);

module.exports = router;
