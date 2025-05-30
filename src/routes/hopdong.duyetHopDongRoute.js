const express = require('express');
const router = express.Router();
const duyetHopDongController = require('../controllers/hopdong.duyetHopDongController');

// Route to display contract approval page
router.get('/duyet-hop-dong', duyetHopDongController.getDuyetHopDongPage);

// API route for contract approval data
router.post('/api/duyet-hop-dong', duyetHopDongController.getDuyetHopDongData);

// API route for contract approval data grouped by training program
router.post('/api/duyet-hop-dong-theo-he-dao-tao', duyetHopDongController.getDuyetHopDongTheoHeDaoTao);

// TODO: API route for exporting contract approval data - function not implemented yet
// router.get('/api/export-duyet-hop-dong', duyetHopDongController.exportDuyetHopDongData);

// API route for approving contracts
router.post('/api/approve-contracts', duyetHopDongController.approveContracts);

module.exports = router;