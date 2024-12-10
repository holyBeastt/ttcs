const express = require("express");
const router = express.Router();
const suaHDController = require("../controllers/suaHDController");
const multer = require('multer');

// Trang đăng nhập (GET)
router.get("/suaHD", (req, res) => {
  res.render("suaHD", { content: null }); // Pass content as null or any default value
});



// Cấu hình thư mục lưu trữ tệp upload
const upload = multer({ dest: 'src/templates/' }); // Lưu tệp trực tiếp vào thư mục templates

// Cấu hình các route
router.get('/download/:fileName', suaHDController.downloadFile); // Route tải tệp
router.post('/upload', upload.single('file'), suaHDController.uploadFile); // Route upload và ghi đè tệp



module.exports = router;