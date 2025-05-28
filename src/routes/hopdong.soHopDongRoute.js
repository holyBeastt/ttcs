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

module.exports = router;
