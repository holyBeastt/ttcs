const express = require('express');
const router = express.Router();
const {addClass, getLopMoi, SaveNote, DoneNote, updateLopThiGk, getLopGK, updateKhoaDuyet, deleteLopGK, getLopNgoaiQuyChuan, updateDuyet, getLopGiuaKi, deletelopngoaiquychuan, updatelopngoaiquychuan, getLopGiangDay, SaveNoteAddClass, DoneNoteAddClass, SaveNoteDuyet, DoneNoteDuyet} = require('../controllers/vuotGioAddClassController');
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
router.get("/getLopGiuaKi/:maPhongBan/:Dot/:Ki/:Nam", getLopGiuaKi);

//ghinote
router.post("/savenotegk", SaveNote);
router.post("/donenotegk", DoneNote);
router.post("/savenoteaddclass", SaveNoteAddClass);
router.post("/donenoteaddclass", DoneNoteAddClass);
router.post("/savenoteduyet", SaveNoteDuyet);
router.post("/donenoteduyet", DoneNoteDuyet);

//update lớp thi giữa kì
router.post("/updatelopthigk", updateLopThiGk);

//duyệt giữa kỳ
router.get("/duyetgk", (req, res) => {
  res.render("vuotGioDuyet");
} );
router.get("/getLopGK/:maPhongBan/:Ki/:Nam", getLopGK);
router.post("/updateKhoaDuyet", updateKhoaDuyet);
router.post("/deleteLopGK", deleteLopGK);
router.get("/getLopNgoaiQuyChuan/:MaPhongBan/:Nam", getLopNgoaiQuyChuan);
router.post("/updateDuyet", updateDuyet);
router.post("/deletelopngoaiquychuan", deletelopngoaiquychuan);
router.post("/updatelopngoaiquychuan", updatelopngoaiquychuan);

//thông tin các lớp vượt giờ
router.get("/infoclassvuotgio", (req, res) => {
  res.render("vuotGioTTLop");
} );
router.get("/infovuotgio", (req, res) => {
  res.render("vuotGioTTVuotGio");
} );
router.get("/xemlopgiangday/:MaPhongBan/:Nam/:TenNhanVien", getLopGiangDay);
module.exports = router;