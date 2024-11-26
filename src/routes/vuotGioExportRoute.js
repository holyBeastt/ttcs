const express = require("express");
const router = express.Router();
const vuotGioExportController = require("../controllers/vuotGioExportController");


router.get("/vuotGioExport", vuotGioExportController.getvuotGioExportSite);

  router.get(
    "/api/export-vuot-gio",
    vuotGioExportController.exportVuotGio
  );
  
  
  module.exports = router;
