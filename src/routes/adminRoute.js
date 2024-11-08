const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const GetTable = require('../controllers/admin');
const { postUpdateGvm, postUpdateNV, postDeleteNV, postUpdatePhongBan, postUpdateTK, postUpdateBoMon } = require('../controllers/adminUpdate');

router.get('/admin', (req, res) => {
    res.render('admin');
});

router.get('/thongTinTK', GetTable.getaccountList);


router.get('/nhanVien', GetTable.getnhanvienList);
router.get('/phongBan', GetTable.getdepartmentList)
router.get('/themNhanVien', GetTable.getMaPhongBanList);


// thao tác thêm
router.get('/themPhongBan', AdminController.showThemPhongBan);
router.post('/themPhongBan', AdminController.themPhongBan);
// router.post('/themTK', );
router.get('/themNhanVien', AdminController.showThemNhanVien);
router.post('/themNhanVien', AdminController.themNhanVien);


// hiển thị danh sách
router.get('/nhanVien', AdminController.getNhanVien);
router.get('/api/nhanvien', AdminController.getListNhanVien);

router.get('/phongBan', AdminController.getPhongBan);
router.get('/api/phongban', AdminController.getListPhongBan);

//Nhân viên
router.get('/updateNV/:id',AdminController.getUpdateNV );
router.post('/updateNV/:id',postUpdateNV);
router.get('/viewNV/:id',AdminController.getViewNV );

//Phòng ban
router.get('/updatePhongBan/:MaPhongBan', GetTable.getUpdatePhongBan);
router.post('/updatePhongBan/:MaPhongBan', postUpdatePhongBan);
//Tài khoản
router.get('/updateTK/:TenDangNhap', AdminController.getUpdateTK);
router.post('/updateTK/:TenDangNhap', postUpdateTK);
router.get('/themTK', AdminController.getthemTaiKhoan);
router.post('/themTK', AdminController.postthemTK);
router.get("/getTenNhanVien", AdminController.getTenNhanVien);
router.get("/getQuyenByPhongBan", AdminController.getQuyenByPhongBan);

//Bộ môn
router.get("/boMon", AdminController.getBoMon);
// router.get("/themBoMon", AdminController.getPhongBan);
router.get("/getPhongBan", AdminController.getPhongBan);
router.get('/themBoMon', (req, res) => {
    res.render('themBoMon');
});
router.post("/themBoMon", AdminController.themBoMon);
router.get('/updateBoMon/:id_BoMon', GetTable.getupdateBoMon);
router.post('/updateBoMon/:id_BoMon',postUpdateBoMon );

//Đổi mật khẩu
router.get('/changePassword', GetTable.getchangePassword);
router.post('/changePassword', AdminController.updatePassword);

//Năm học
router.get('/namHoc', GetTable.getNamHoc);
router.post('/namHoc', GetTable.postNamHoc);
router.delete('/namHoc/:NamHoc', GetTable.deleteNamHoc);

//lấy dữ liệu hiển thị vào thẻ select
router.get('/getNamHoc', AdminController.getNamHoc);

router.get('/getMaBoMon/:maPhongBan', AdminController.getBoMonList);

router.get('/suggest/:query', AdminController.suggest);

module.exports = router;