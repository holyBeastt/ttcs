const express = require("express");
const router = express.Router();

const gvmListController = require("../controllers/gvmListController"); // Định nghĩa biến gvmListController

// Đào tạo
router.get("/gvmList", gvmListController.getGvmList);
router.get("/api/gvm", gvmListController.getGvm);
//router.get("/gvm/export-excel", gvmListController.exportGvmToExcel);// router.get("/khoaCNTT", getGvmListCNTT);
// router.get("/api/gvmKhoaCNTT", getGvmCNTT);

module.exports = router;
