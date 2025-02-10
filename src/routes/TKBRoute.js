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
router.post("/api/update-row-TKB", TKBController.updateRowTKB);

// xóa 1 dòng
router.delete("/TKB-delete-row/:id", TKBController.deleteRow);

// Cập nhật số lượng sinh viên
router.post("/api/save-student-quantity", TKBController.updateStudentQuantity);

router.post("/save-data-tkb-to-qcdk", TKBController.themTKBVaoQCDK);

router.post("/api/addRowTKB", TKBController.addNewRowTKB);

router.post("/api/xoa-TKB", TKBController.deleteTKB);

router.post(
  "/api/export-multiple-worksheet-TKB",
  TKBController.exportMultipleWorksheets
);

router.post(
  "/api/export-single-worksheet-TKB",
  TKBController.exportSingleWorksheets
);

module.exports = router;
