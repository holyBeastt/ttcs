// Xem thông tin các lớp giảng viên mời
const express = require("express");
const router = express.Router();

const {
  getClassInfoGvm,
  getGvm,
  getClassInfoGvmData,
} = require("../controllers/classInfoGvmController");

router.get("/classInfoGvm", getClassInfoGvm);

router.get("/api/classInfoGvm", getGvm);

router.post("/api/getClassInfoGvmData", getClassInfoGvmData);

module.exports = router;
