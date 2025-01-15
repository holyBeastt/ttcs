const express = require("express");
const router = express.Router();
const TKBController = require("../controllers/TKBController"); // Định nghĩa biến infoHDGvmController

// Thêm file thời khóa biểu
router.get("/getImportTKBSite", TKBController.getImportTKBSite);

// Thời khóa biểu chính thức
router.get("/getTKBChinhThucSite", TKBController.getTKBChinhThucSite);

// Hiển thị ra bảng TKB chính thức
router.post("/getDataTKBChinhThuc", TKBController.getDataTKBChinhThuc);

// Cập nhật dữ liệu 1 dòng
router.put("/updateRowTKB/:id", TKBController.updateRowTKB);

module.exports = router;
