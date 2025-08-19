const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { taiUyNhiemChiController, suaMauUyNhiemController } = require('../controllers/uyNhiemChiController');

// Cấu hình multer cho upload file
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../templates/uy-nhiem-chi/'));
  },
  filename: function (req, file, cb) {
    // Giữ nguyên tên file gốc
    cb(null, file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // Chỉ chấp nhận file Excel
  if (file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.xlsx') ||
      file.originalname.toLowerCase().endsWith('.xls')) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file Excel (.xlsx, .xls)'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // Giới hạn 10MB
  }
});

// Routes cho Tải ủy nhiệm chi
router.get('/tai-uy-nhiem-chi', taiUyNhiemChiController.getTaiUyNhiemChiPage);
router.post('/api/download', taiUyNhiemChiController.downloadUyNhiemChi);
router.post('/api/preview', taiUyNhiemChiController.previewUyNhiemChi);
router.post('/api/setup', taiUyNhiemChiController.setupUyNhiemChi);

// Routes cho Sửa mẫu ủy nhiệm
router.get('/sua-mau-uy-nhiem', suaMauUyNhiemController.getSuaMauUyNhiemPage);
router.get('/api/download-mau-uy-nhiem/:fileName?', suaMauUyNhiemController.downloadMauUyNhiem);

// Route upload với xử lý lỗi multer
router.post('/api/upload-mau-uy-nhiem', (req, res, next) => {
  upload.single('template')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File quá lớn. Kích thước tối đa là 10MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Lỗi upload file: ' + err.message
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, suaMauUyNhiemController.uploadMauUyNhiem);

module.exports = router;
