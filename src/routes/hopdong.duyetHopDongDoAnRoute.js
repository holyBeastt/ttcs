const express = require('express');
const router = express.Router();
const duyetHopDongController = require('../controllers/hopdong.duyetHopDongDoAnController');
const previewController = require('../controllers/hopdong.previewController');

// Route to display contract approval page
router.get('/duyet-hop-dong-do-an', duyetHopDongController.getDuyetHopDongPage);

// API route for contract approval data
router.post('/api/duyet-hop-dong-do-an', duyetHopDongController.getDuyetHopDongData);

// API route for contract approval data grouped by training program
router.post('/api/duyet-hop-dong-do-an-theo-he-dao-tao', duyetHopDongController.getDuyetHopDongTheoHeDaoTao);

// API route for contract preview
router.post('/api/preview-page-do-an', previewController.showPreviewPageAPI);

// API route for approving contracts
router.post('/api/approve-contracts-do-an', duyetHopDongController.approveContracts);

// API route for checking contract save status
router.post('/api/check-contract-save-status-do-an', duyetHopDongController.checkContractSaveStatus);

module.exports = router;