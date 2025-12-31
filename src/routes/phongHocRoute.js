const express = require("express");
const router = express.Router();
const phongHocController = require("../controllers/phongHocController");

router.get("/phonghoc", phongHocController.showPhongHoc);
router.get("/getPhongTrong", phongHocController.getPhongTrong);
router.post("/muonPhong", phongHocController.muonPhong);
router.post("/huyMuon", phongHocController.huyMuon);

module.exports = router;
