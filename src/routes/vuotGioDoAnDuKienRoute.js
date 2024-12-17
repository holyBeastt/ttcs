const express = require("express");
const router = express.Router();
const vuotGioDoAnDuKien = require("../controllers/vuotGioDoAnDuKienController");

//
router.get(
  "/getVuotGioDoAnDuKienSite",
  vuotGioDoAnDuKien.getVuotGioDoAnDuKienSite
);

router.post("/xoaDoAnDuKien", vuotGioDoAnDuKien.xoaDoAnDuKien);

router.post("/getDoAnDuKien", vuotGioDoAnDuKien.getDoAnDuKienData);

// Ban hành
router.post("/banHanhDoAn", vuotGioDoAnDuKien.banHanhDoAn);

module.exports = router;
