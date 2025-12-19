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

// Routes cho Tải ủy nhiệm chi (UNC hệ thống - UNC mời giảng)
router.get('/tai-uy-nhiem-chi', taiUyNhiemChiController.getTaiUyNhiemChiPage);
router.post('/api/download', taiUyNhiemChiController.downloadUyNhiemChi);
router.post('/api/preview', taiUyNhiemChiController.previewUyNhiemChi);
router.post('/api/setup', taiUyNhiemChiController.setupUyNhiemChi);
router.get('/api/load-options', taiUyNhiemChiController.loadOptions);

// Routes cho UNC ĐATN (hệ thống)
router.get('/unc-datn', taiUyNhiemChiController.getUNCDoAnPage);

// Routes cho UNC ngoài
router.get('/unc-ngoai/nhap-du-lieu/import-file', taiUyNhiemChiController.getUNCNgoaiImportFilePage);
router.get('/unc-ngoai/nhap-du-lieu/giao-dien', taiUyNhiemChiController.getUNCNgoaiGiaoDienPage);
router.get('/unc-ngoai/xem-du-lieu', taiUyNhiemChiController.getUNCNgoaiXemDuLieuPage);
router.post('/unc-ngoai/nhap-du-lieu/giao-dien/api/create', taiUyNhiemChiController.createUNCNgoaiRecord);
router.get('/unc-ngoai/nhap-du-lieu/giao-dien/api/list', taiUyNhiemChiController.getUNCNgoaiList);
router.post('/unc-ngoai/nhap-du-lieu/giao-dien/api/update', taiUyNhiemChiController.updateUNCNgoaiRecord);
router.post('/unc-ngoai/nhap-du-lieu/giao-dien/api/delete', taiUyNhiemChiController.deleteUNCNgoaiRecord);

// Routes cho Sửa mẫu ủy nhiệm (Mẫu đóng HP)
router.get('/sua-mau-uy-nhiem', suaMauUyNhiemController.getSuaMauUyNhiemPage);
router.get('/api/download-mau-uy-nhiem/:fileName?', suaMauUyNhiemController.downloadMauUyNhiem);

// Route trang Mẫu mật mã
router.get('/mau-mat-ma', suaMauUyNhiemController.getMauMatMaPage);
router.get('/api/download-mau-uy-nhiem-mat-ma/:fileName?', suaMauUyNhiemController.downloadMauMatMa);

// Route upload với xử lý lỗi multer (Mẫu đóng HP)
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

// Route upload với xử lý lỗi multer (Mẫu mật mã)
router.post('/api/upload-mau-uy-nhiem-mat-ma', (req, res, next) => {
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
}, suaMauUyNhiemController.uploadMauMatMa);

module.exports = router;
