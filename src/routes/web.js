const express = require("express");
const router = express.Router();

const {
  gethomePage,
  getLogin,
  getIndex,
  getImport,
  getDtaoduyet,
  getDtaoxemhd,
  getDtaonhap,
  getPhongVP,
  getHomeMainDaoTao,
  getTeachingInfo,
  getXemBangQC,
  // Khoa
  getMainKhoa,

  // Lấy role
  getRole,
  getlog,
  getthongkemg,
  getthongkenckh,
  getthongkedoan,
  getBoMonShared,
  getPhongBanInfoShared,
} = require("../controllers/homeController");
const { route } = require("./adminRoute");

// const { createGVM } = require("../controllers/DaoTaoController");

// const {
//   createGVM,
//   handleUploadFile,
// } = require("../controllers/createGvmController");

router.get("/homePage", gethomePage);
// router.get("/abc", getAbc);
// router.post("/abc/create", createUser);
/////////////////////////////////
router.get("/", getLogin);
router.get("/index", getIndex);
//router.get("/dtxemhd", getDtaoxemhd);
router.get("/daotaoduyet", getDtaoduyet);
router.get("/daotaoxemhd/daotaonhap", getDtaonhap);

//router.post("/daotaoxemhd/daotaonhap/createGVM", handleUploadFile);
// router.get("/index/import", getImport);
router.get("/index/import", getImport);
router.get("/PhongVP", getPhongVP);
//phong dao tao
// router.get("/maindt", getHomeMainDaoTao);
router.get("/teachingInfo", getTeachingInfo);
router.get("/maindt/tableQC", getXemBangQC);

// Khoa
// router.get("/mainkhoa", getMainKhoa);
router.get("/log", getlog);
router.get("/thongkemg", getthongkemg);
router.get("/thongkenckh", getthongkenckh);
router.get("/thongkedoan", getthongkedoan);

// router dùng chung

// Lấy danh sách all mã bộ môn (không có điều kiện)
router.get("/api/shared/bo-mon", getBoMonShared);

// Lấy danh sách tên, mã phòng ban
router.get("/api/shared/phong-ban-info", getPhongBanInfoShared);
module.exports = router;
