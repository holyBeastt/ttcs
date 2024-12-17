const express = require("express");
const router = express.Router();
const exportPhuLucDAController = require("../controllers/exportPhuLucDAController");

// Route để render trang exportPhuLucDA.ejs
router.get("/exportPhuLucDA", exportPhuLucDAController.getPhuLucDASite);

router.get(
  "/api/export-phu-luc-DA",
  exportPhuLucDAController.exportPhuLucDA
);

module.exports = router;
