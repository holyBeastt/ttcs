const express = require("express");
const router = express.Router();
const phongHocController = require("../controllers/phongHocController");

router.get("/phonghoc", phongHocController.showPhongHoc);
router.get("/getPhongTrong", phongHocController.getPhongTrong);

module.exports = router;
