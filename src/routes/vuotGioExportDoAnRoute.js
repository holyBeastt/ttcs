const express = require("express");
const router = express.Router();
const exportDoAn = require("../controllers/vuotGioExportDoAnController");

// Route để render trang phuLucHD.ejs
router.get("/exportDoAn", exportDoAn.getExportDoAnSite);

router.get("/api/export-hop-dong-do-an-gvm", exportDoAn.exportHopDongDoAnGvm);

module.exports = router;
