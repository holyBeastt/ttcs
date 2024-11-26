const express = require('express');
const router = express.Router();
const {addClass, getLopMoi, SaveNote, DoneNote, updateLopThiGk, getLopGK, updateKhoaDuyet, deleteLopGK, getLopNgoaiQuyChuan, updateDuyet, getLopGiuaKi, deletelopngoaiquychuan, updatelopngoaiquychuan} = require('../controllers/vuotGioAddClassController');
// const {
//   getClassInfoGvm,
// } = require("../controllers/xemCacLopGvmController");

router.get("/addclass/:MaPhongBan", (req, res) => {
    res.render("vuotGioAddClass");
  });
router.get("/addclass", (req, res) => {
    res.render("vuotGioAddClass");
  });
router.post("/addclass/:MaPhongBan", addClass);

//Thêm lớp kiểm tra giữa kì
router.get("/addclassgiuaky", (req, res) => {
  res.render("vuotGioChonLopThiGK")
});
//Lấy thông tin lớp mời
router.get("/getLopGiuaKi/:maPhongBan/:Dot/:Ki/:Nam/:MoiGiang", getLopGiuaKi);

//ghinote
router.post("/savenotegk", SaveNote);
router.post("/donenotegk", DoneNote);

//update lớp thi giữa kì
router.post("/updatelopthigk", updateLopThiGk);

//duyệt giữa kỳ
router.get("/duyetgk", (req, res) => {
  res.render("vuotGioDuyet");
} );
router.get("/getLopGK/:maPhongBan/:Ki/:Nam", getLopGK);
router.post("/updateKhoaDuyet", updateKhoaDuyet);
router.post("/deleteLopGK", deleteLopGK);
router.get("/getLopNgoaiQuyChuan/:MaPhongBan/:Ki/:Nam", getLopNgoaiQuyChuan);
router.post("/updateDuyet", updateDuyet);
router.post("/deletelopngoaiquychuan", deletelopngoaiquychuan);
router.post("/updatelopngoaiquychuan", updatelopngoaiquychuan);

module.exports = router;