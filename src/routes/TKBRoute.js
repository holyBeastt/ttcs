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

// Lưu từ TKB sang quy chuẩn dự kiến
router.post("/save-data-tkb-to-qcdk", TKBController.themTKBVaoQCDK);

// Thêm dòng vào TKB
router.post("/api/addRowTKB", TKBController.addNewRowTKB);

// Xóa bảng thời khóa biểu
router.post("/api/delete-data-TKB", TKBController.deleteTKB);

router.post(
  "/api/export-multiple-worksheet-TKB",
  TKBController.exportMultipleWorksheets
);

router.post(
  "/api/export-single-worksheet-TKB",
  TKBController.exportSingleWorksheets
);

// Làm lại dữ liệu TKB
router.post("/api/insert-data-TKB-again", TKBController.insertDataAgain);

// Check dữ liệu bảng TKB
router.post("/api/check-data-TKB-exist", TKBController.checkDataTKBExist);

module.exports = router;
