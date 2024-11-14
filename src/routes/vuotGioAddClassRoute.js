const express = require('express');
const router = express.Router();
const {addClass, getLopMoi, SaveNote, DoneNote, updateLopThiGk, getLopGK, updateKhoaDuyet, deleteLopGK, getLopNgoaiQuyChuan} = require('../controllers/vuotGioAddClassController');
// const {
//   getClassInfoGvm,
// } = require("../controllers/xemCacLopGvmController");

router.get("/addclass", (req, res) => {
    res.render("vuotGioAddClass");
  });
router.post("/addclass/:MaPhongBan", addClass);

//Thêm lớp kiểm tra giữa kì
router.get("/addclassgiuaky", (req, res) => {
  res.render("vuotGioChonLopThiGK")
});
//Lấy thông tin lớp mời
router.get("/getLopMoi/:maPhongBan/:Dot/:Ki/:Nam", getLopMoi);

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

module.exports = router;