const express = require("express");
const router = express.Router();
const TKBController = require("../controllers/TKBController"); // Định nghĩa biến infoHDGvmController
const { route } = require("./adminRoute");

// Thêm file thời khóa biểu
router.get("/getImportTKBSite", TKBController.getImportTKBSite);

// Thời khóa biểu chính thức
router.get("/getTKBChinhThucSite", TKBController.getTKBChinhThucSite);

// Hiển thị ra bảng TKB chính thức
router.post("/api/v1/tkb/data-tkb-to-render", TKBController.getDataTKBChinhThuc);

// Cập nhật dữ liệu 1 dòng
router.post("/api/v1/tkb/update-row", TKBController.updateRowTKB);

// xóa 1 dòng
router.delete("/TKB-delete-row", TKBController.deleteRow);

// Cập nhật số lượng sinh viên
router.post("/api/save-student-quantity", TKBController.updateStudentQuantity);

// Lưu từ TKB sang quy chuẩn dự kiến
router.post("/api/v1/tkb/save-data-to-qcdk", TKBController.themTKBVaoQCDK);

// Thêm dòng vào TKB
router.post("/api/v1/TKB/add-new_row", TKBController.addNewRowTKB);

// Xóa bảng thời khóa biểu
router.delete("/api/v1/tkb/all", TKBController.deleteTKB);

router.post(
  "/api/v1/tkb/export-multiple-worksheet",
  TKBController.exportMultipleWorksheets
);

router.get(
  "/api/v1/tkb/export-single-worksheet",
  TKBController.exportSingleWorksheets
);

// Làm lại dữ liệu TKB
// router.post("/api/insert-data-TKB-again", TKBController.insertDataAgain);

// Check dữ liệu bảng TKB
router.post("/api/check-data-TKB-exist", TKBController.checkDataTKBExist);

// Lấy danh sách khoa
router.get("/api/TKB/getKhoaList", TKBController.getKhoaList);

// Check dữ liệu có trong bảng TKB không -> check dữ liệu trong bảng tạm
router.get("/api/v1/tkb/check-data-qcdk-exist", TKBController.checkDataQCDK);

module.exports = router;
