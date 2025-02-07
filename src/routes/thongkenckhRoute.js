const express = require('express');
const router = express.Router();
const thongkenckhController = require('../controllers/thongkenckhController');

// Định tuyến tới API thống kê
router.get('/statistics', thongkenckhController.getStatisticsData);
router.get('/', thongkenckhController.showThongkePage);
router.get('/detail-data', thongkenckhController.getDetail1Data);
router.get('/detail-data/baibaokhoahoc', thongkenckhController.getDetailDataBaiBao);
router.get('/detail-data/bangsangchevagiaithuong', thongkenckhController.getDetailDataBangsangche);
router.get('/detail-data/biensoan', thongkenckhController.getDetailDataBiensoan);
// router.get('/detail-data/nhiemvu', thongkenckhController.getDetailDatanhiemvu);
router.get('/detail-data/nckh', thongkenckhController.getDetailDatanckh);
router.get('/detail-data/xaydung', thongkenckhController.getDetailDataxaydung);
router.get('/detail-data/sachvagiaotrinh', thongkenckhController.getDetailDatasachvagiaotrinh);
module.exports = router;

