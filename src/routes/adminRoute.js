const express = require("express");
const router = express.Router();
const {
  getBoMon,
  showThemNhanVien,
  showThemPhongBan,
  showThemTaiKhoan,
  themPhongBan,
  themNhanVien,
  getNhanVien,
  getListNhanVien,
  getPhongBan,
  getListPhongBan,
  getUpdateNV,
  getViewNV,
  getUpdateTK,
  getthemTaiKhoan,
  postthemTK,
  getTenNhanVien,
  getQuyenByPhongBan,
  themBoMon,
  getNamHoc,
  getBoMonList,
  suggest,
  infome,
  updateMe,
  getKyTuBD,
  getKyTuBDKhoa,
  deleteKyTuBD,
  postKyTuBD,
  updateKyTuBD,
  checkKyTuBD,
  getTienLuong,
  postTienLuong,
  updateTienLuong,
  deleteTienLuong,
  suggestPb,
  checkExistence,
  themHocPhan,
  getPhanTramMienGiam,
  postPhanTramMienGiam,
  updatePhanTramMienGiam,
  deletePhanTramMienGiam,
  checkExistence2,
  getLyDoGiamTru,
  getPhanTram,
  getChuyenKhoaSite,
  transferFacultyData,
  mergeFacultyData,
} = require("../controllers/adminController");

const {
  getaccountList,
  getnhanvienList,
  getdepartmentList,
  getMaPhongBanList,
  getUpdatePhongBan,
  getupdateBoMon,
  getchangePassword,
  updatePassword,
  postNamHoc,
  deleteNamHoc,
  getNamHocList,
  addMessage,
  updateMessage,
  updateDoneMessage,
  getMessage,
  getshowMessage,
  deleteMessage,
  getDotDoAnList,
  postDotDoAn,
  deleteDotDoAn,
  getHocPhanList,
  updateHocPhan,
  deleteHocPhan,
  getHeSoLopDongSite,
  getHeSoLopDongData,
  updateBonusTimeRow,
  createBonusTimeRow,
  deleteBonusTimeRow,
} = require("../controllers/admin");

const {
  postUpdateNV,
  postUpdatePhongBan,
  postUpdateTK,
  postUpdateBoMon,
} = require("../controllers/adminUpdate");
// router.get("/admin", (req, res) => {
//   res.render("admin");
// });

router.get("/thongTinTK", getaccountList);

router.get("/nhanVien", getnhanvienList);
router.get("/phongBan", getdepartmentList);
router.get("/themNhanVienSite", getMaPhongBanList);

// thao tác thêm
router.get("/themPhongBan", showThemPhongBan);
router.post("/themPhongBan", themPhongBan);

// router.post('/themTK', );
router.get("/themNhanVienSite", showThemNhanVien);
router.post("/themNhanVien", themNhanVien);

// hiển thị danh sách
router.get("/nhanVien", getNhanVien);
router.get("/api/nhanvien", getListNhanVien);

router.get("/phongBan", getPhongBan);
router.get("/api/phongban", getListPhongBan);

//Nhân viên
router.get("/updateNV/:id", getUpdateNV);
router.post("/updateNV/:id", postUpdateNV);
router.get("/viewNV/:id", getViewNV);

//Phòng ban
router.get("/updatePhongBan/:MaPhongBan", getUpdatePhongBan);
router.post("/updatePhongBan/:MaPhongBan", postUpdatePhongBan);
//Tài khoản
router.get("/updateTK/:TenDangNhap", getUpdateTK);
router.post("/updateTK/:TenDangNhap", postUpdateTK);
router.get("/themTK", getthemTaiKhoan);
router.post("/themTK", postthemTK);
router.get("/getTenNhanVien", getTenNhanVien);
router.get("/getQuyenByPhongBan", getQuyenByPhongBan);

//Bộ môn
router.get("/boMon", getBoMon);
router.get("/getPhongBan", getPhongBan);
router.get("/themBoMon", (req, res) => {
  res.render("themBoMon");
});
router.post("/themBoMon", themBoMon);
router.get("/updateBoMon/:id_BoMon", getupdateBoMon);
router.post("/updateBoMon/:id_BoMon", postUpdateBoMon);

//Đổi mật khẩu
router.get("/changePassword", getchangePassword);
router.post("/changePassword", updatePassword);

//Năm học
router.get("/namHoc", getNamHocList);
router.post("/namHoc", postNamHoc);
router.delete("/namHoc/:NamHoc", deleteNamHoc);

//lấy dữ liệu hiển thị vào thẻ select
router.get("/getNamHoc", getNamHoc);

router.get("/getMaBoMon/:maPhongBan", getBoMonList);

router.get("/suggest/:query", suggest);
router.get("/suggestPb/:MaPhongBan/:query", suggestPb);

//Nhân viên tự sửa thông tin
router.get("/infome/:id_User", infome);
router.post("/infome/:id_User", updateMe);

//Ký tự bắt đầu hệ đào tạo
router.get("/kytubatdau", getKyTuBD);
router.post("/kytubatdau", postKyTuBD);
router.delete("/kytubatdau/:lop_vi_du", deleteKyTuBD);
router.put("/kytubatdau/:lop_vi_du", updateKyTuBD);
router.post("/kytubatdau/check", checkKyTuBD);

// Ký tự bắt đầu khoa
router.get("/api/v1/admin/kytu-bat-dau-khoa", getKyTuBDKhoa);

// Hệ số lớp đông
router.get("/api/v1/admin/he-so-lop-dong", getHeSoLopDongSite);
router.get("/api/v1/admin/he-so-lop-dong-data", getHeSoLopDongData);

//Tiền lương
router.get("/tienluong", getTienLuong);
router.post("/tienluong", postTienLuong);
router.delete("/tienluong/:STT", deleteTienLuong);
router.put("/tienluong/:STT", updateTienLuong);
router.post("/checkExistence", checkExistence);

//Thêm thông báo
router.get("/changeMessage/:MaPhongBan", (req, res) =>
  res.render("changeMessage")
);
router.get("/getMessage", getMessage);
router.post("/changeMessage/:MaPhongBan", addMessage);
router.post("/updateMessage", updateMessage);
router.get("/getMessage/:MaPhongBan", getshowMessage);
router.post("/deleteMessage", deleteMessage);

// Đợt đồ án
router.get("/dotDoAn", getDotDoAnList);
router.post("/dotDoAn", postDotDoAn);
router.delete("/dotDoAn/:dotdoan", deleteDotDoAn);

// Route cho thêm học phần
router.get("/hocphan", getHocPhanList);
router.put("/hocphan/:MaHocPhan", updateHocPhan);
router.delete("/hocphan/:MaHocPhan", deleteHocPhan);

router.get("/themHocPhan", (req, res) => {
  res.render("themHocPhan");
});
router.post("/themHocPhan", themHocPhan);
router.get("/phantrammiengiam", getPhanTramMienGiam);
router.post("/lyDoGiamTru", postPhanTramMienGiam);
router.post("/updatePhanTramMienGiam/:Id", updatePhanTramMienGiam);
router.delete("/deletePhanTramMienGiam/:Id", deletePhanTramMienGiam);
router.post("/checkExistence2", checkExistence2);
router.get("/getmiengiam", getLyDoGiamTru);
router.get("/getphantram/:LyDo", getPhanTram);

// Chuyển khoa
router.get("/api/admin/getChuyenKhoaSite", getChuyenKhoaSite);

// Cập nhật data chuyển khoa
router.post("/api/admin/department/transfer-faculty-data", transferFacultyData);

// Cập nhật data gộp khoa
router.post("/api/admin/department/merge-faculty-data", mergeFacultyData);

// Cập nhật hệ số ngoài giờ
router.put("/api/v1/admin/bonus-time-row", updateBonusTimeRow);

router.post("/api/v1/admin/bonus-time-row", createBonusTimeRow);

router.delete("/api/v1/admin/bonus-time-row/:id", deleteBonusTimeRow);

module.exports = router;
