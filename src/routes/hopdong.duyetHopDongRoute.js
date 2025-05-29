const express = require('express');
const router = express.Router();
const duyetHopDongController = require('../controllers/hopdong.duyetHopDongController');

// Route to display contract approval page
router.get('/duyet-hop-dong', duyetHopDongController.getDuyetHopDongPage);

// API route for contract approval data
router.post('/api/duyet-hop-dong', duyetHopDongController.getDuyetHopDongData);

// API route for exporting contract approval data
router.get('/api/export-duyet-hop-dong', duyetHopDongController.exportDuyetHopDongData);

module.exports = router;