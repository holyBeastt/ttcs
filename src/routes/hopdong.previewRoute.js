const express = require('express');
const router = express.Router();
const previewController = require('../controllers/hopdong.previewController');

// Route cho trang preview hợp nhất (hỗ trợ cả GET và POST)
router.get('/preview/:teacherId', previewController.showUnifiedPreviewPage);
router.post('/preview-unified', previewController.showUnifiedPreviewPage);

// Backward compatibility routes
router.get('/preview-contract/:teacherId', previewController.showPreviewPage);
router.post('/preview-contract-api', previewController.showPreviewPageAPI);

// API routes
router.post('/api/preview-contract', previewController.previewContract);

module.exports = router;
