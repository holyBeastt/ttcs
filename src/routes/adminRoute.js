const express = require('express');
const router = express.Router();
const { getBoMon, showThemNhanVien, showThemPhongBan, showThemTaiKhoan, themPhongBan, themNhanVien, getNhanVien,
        getListNhanVien, getPhongBan, getListPhongBan, getUpdateNV, getViewNV, getUpdateTK, getthemTaiKhoan, postthemTK,
        getTenNhanVien, getQuyenByPhongBan, themBoMon, getNamHoc, getBoMonList, suggest,
        infome,
        updateMe,
        getKyTuBD,
        deleteKyTuBD, postKyTuBD,
        updateKyTuBD
        } = require('../controllers/adminController');
const { getaccountList, getnhanvienList, getdepartmentList, getMaPhongBanList, getUpdatePhongBan, getupdateBoMon,
        getchangePassword, updatePassword, postNamHoc, deleteNamHoc, getNamHocList,
        addMessage,
        updateMessage,
        updateDoneMessage,
        getMessage,
        getshowMessage,
        deleteMessage
        } = require('../controllers/admin');
const { postUpdateNV, postUpdatePhongBan, postUpdateTK, postUpdateBoMon } = require('../controllers/adminUpdate');
router.get('/admin', (req, res) => {
    res.render('admin');
});

router.get('/thongTinTK', getaccountList);


router.get('/nhanVien', getnhanvienList);
router.get('/phongBan', getdepartmentList)
router.get('/themNhanVien', getMaPhongBanList);


// thao tác thêm
router.get('/themPhongBan', showThemPhongBan);
router.post('/themPhongBan',  themPhongBan);
// router.post('/themTK', );
router.get('/themNhanVien',  showThemNhanVien);
router.post('/themNhanVien',  themNhanVien);


// hiển thị danh sách
router.get('/nhanVien',  getNhanVien);
router.get('/api/nhanvien',  getListNhanVien);

router.get('/phongBan',  getPhongBan);
router.get('/api/phongban',  getListPhongBan);

//Nhân viên
router.get('/updateNV/:id', getUpdateNV );
router.post('/updateNV/:id',postUpdateNV);
router.get('/viewNV/:id', getViewNV );

//Phòng ban
router.get('/updatePhongBan/:MaPhongBan', getUpdatePhongBan);
router.post('/updatePhongBan/:MaPhongBan', postUpdatePhongBan);
//Tài khoản
router.get('/updateTK/:TenDangNhap',  getUpdateTK);
router.post('/updateTK/:TenDangNhap', postUpdateTK);
router.get('/themTK',  getthemTaiKhoan);
router.post('/themTK',  postthemTK);
router.get("/getTenNhanVien",  getTenNhanVien);
router.get("/getQuyenByPhongBan",  getQuyenByPhongBan);

//Bộ môn
router.get("/boMon", getBoMon);
router.get("/getPhongBan",  getPhongBan);
router.get('/themBoMon', (req, res) => {
    res.render('themBoMon');
});
router.post("/themBoMon",  themBoMon);
router.get('/updateBoMon/:id_BoMon', getupdateBoMon);
router.post('/updateBoMon/:id_BoMon',postUpdateBoMon );

//Đổi mật khẩu
router.get('/changePassword', getchangePassword);
router.post('/changePassword',  updatePassword);

//Năm học
router.get('/namHoc', getNamHocList);
router.post('/namHoc', postNamHoc);
router.delete('/namHoc/:NamHoc', deleteNamHoc);

//lấy dữ liệu hiển thị vào thẻ select
router.get('/getNamHoc',  getNamHoc);

router.get('/getMaBoMon/:maPhongBan',  getBoMonList);

router.get('/suggest/:query',  suggest);

//Nhân viên tự sửa thông tin
router.get('/infome/:id_User', infome);
router.post('/infome/:id_User', updateMe);

//Ký tự bắt đầu
router.get('/kytubatdau', getKyTuBD);
router.post('/kytubatdau', postKyTuBD);
router.delete('/kytubatdau/:LopViDu', deleteKyTuBD);
router.put('/kytubatdau/:LopViDu', updateKyTuBD); 

//Thêm thông báo 
router.get('/changeMessage/:MaPhongBan',
    (req, res) => res.render('changeMessage')
);
router.get('/getMessage', getMessage);
router.post('/changeMessage/:MaPhongBan', addMessage);
router.post('/updateMessage', updateMessage);
router.get('/getMessage/:MaPhongBan', getshowMessage);
router.post('/deleteMessage', deleteMessage);

module.exports = router;