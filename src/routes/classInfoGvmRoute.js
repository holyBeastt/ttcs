// Xem thông tin các lớp giảng viên mời
const express = require("express");
const router = express.Router();

const {
  getClassInfoGvm,
  getGvm,
} = require("../controllers/classInfoGvmController");

router.get("/classInfoGvm", getClassInfoGvm);

router.get("/api/classInfoGvm", getGvm);

module.exports = router;
