const express = require("express");
const path = require("path");
// import path from "path";
var appRoot = require("app-root-path");
const router = express.Router();

const doAnHopDongDuKien = require("../controllers/doAnHopDongDuKienController");

// Lấy site đồ án chính thức
router.get(
  "/doAnHopDongDuKienSite",
  doAnHopDongDuKien.getDoAnHopDongDuKienSite
);

router.post(
  "/getInfoDoAnHopDongDuKien",
  doAnHopDongDuKien.getInfoDoAnHopDongDuKien
);

module.exports = router;
