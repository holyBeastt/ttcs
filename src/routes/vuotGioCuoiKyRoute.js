const express = require('express');
const multer = require('multer');
const router = express.Router();
const { readFileExcel, addWorkloadEntry, getWorkload, importWorkloadToDB,
  deleteWorkloadData, saveWorkloadData, checkDataExistence, getList,
  updateDuyet, insertMyData, getMyList, updateMyData, deleteMyData,
  getSuggestions
  } = require('../controllers/vuotGioCuoiKyController');

// Middleware xử lý upload file với multer
const upload = multer({ storage: multer.memoryStorage() }); // lưu file trên RAM

// Route POST để upload file Excel
router.get('/importkthp', (req, res) => {
  res.render('daotao_themFileCuoiKi'); // Render trang vuotGioCuoiKy
});

router.get('/importkthp/api', getWorkload);
router.post('/importkthp/upload', upload.single('file'), readFileExcel);
router.post('/importkthp/add', addWorkloadEntry);
router.post('/importkthp/import', importWorkloadToDB);
router.post('/importkthp/checkfile', checkDataExistence);
router.post('/importkthp/delete', deleteWorkloadData);
router.post('/importkthp/save', saveWorkloadData);
router.get('/importkthp/getSuggestions', getSuggestions);

router.get('/vuotGioDanhGiaCuoiKi', (req, res) => {
  res.render('vuotGioDanhGiaCuoiKi'); // Render trang danh sách vuotGioCuoiKy 
});

router.get('/vuotGioDanhSachCuoiKi/getDSCuoiKi/:MaPhongBan/:Ki/:Nam', getList); // API để lấy danh sách vuotGioCuoiKy
router.post('/vuotGioDanhSachCuoiKi/updateDuyet', updateDuyet); // API để duyệt vuotGioCuoiKy


router.get('/vuotGioCuoiKi', (req, res) => {
  res.render('vuotGioThongTinCuoiKiCuaToi'); // Render trang vuotGioCuoiKy
});
router.post('/vuotGioCuoiKi/addmydata', insertMyData); // API để lấy thông tin vuotGioCuoiKy của người dùng
router.get('/vuotGioDanhSachCuoiKi/getDataCuoiKi/:TenNhanVien/:Ki/:Nam', getMyList); // API để lấy danh sách vuotGioCuoiKy
router.post('/vuotGioCuoiKi/update', updateMyData); // API để lưu thông tin vuotGioCuoiKy
router.post('/vuotGioCuoiKi/delete', deleteMyData); // API để xóa thông tin vuotGioCuoiKy

module.exports = router;
