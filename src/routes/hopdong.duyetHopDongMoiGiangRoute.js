const express = require('express');
const router = express.Router();
const duyetHopDongController = require('../controllers/hopdong.duyetHopDongMoiGiangController');
const previewController = require('../controllers/hopdong.previewController');

// Route to display contract approval page
router.get('/duyet-hop-dong', duyetHopDongController.getDuyetHopDongPage);

// API route for contract approval data
router.post('/api/duyet-hop-dong', duyetHopDongController.getDuyetHopDongData);

// API route for contract approval data grouped by training program
router.post('/api/duyet-hop-dong-theo-he-dao-tao', duyetHopDongController.getDuyetHopDongTheoHeDaoTao);

// API route for contract preview
router.post('/api/preview-page', previewController.showPreviewPageAPI);

// API route for approving contracts
router.post('/api/approve-contracts', duyetHopDongController.approveContracts);

// API route for checking contract save status
router.post('/api/check-contract-save-status', duyetHopDongController.checkContractSaveStatus);

module.exports = router;