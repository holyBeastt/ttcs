const express = require("express");
const router = express.Router();
const TKBController = require("../controllers/TKBController"); // Định nghĩa biến infoHDGvmController

router.get("/getImportTKBSite", TKBController.getImportTKBSite);

router.get("/getTKBChinhThucSite", TKBController.getTKBChinhThucSite);

module.exports = router;
