const express = require("express");
const router = express.Router();
const tongHopGvmExportController = require("../controllers/tongHopGvmExportController");

// Route để hiển thị trang exportHD
router.get("/tongHopGvmExport", tongHopGvmExportController.gettongHopGvmExportSite);

// Route để xuất hợp đồng và phụ lục
router.get(
  "/exportTongHopGvm/downloadAll",
  tongHopGvmExportController.exportAllContractsAndAppendices // Ensure this function is correctly referenced
);

module.exports = router;
