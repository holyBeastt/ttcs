const express = require("express");
const path = require("path");
// import path from "path";
var appRoot = require("app-root-path");
const router = express.Router();

const doAnChinhThuc = require("../controllers/doAnChinhThucController");

// Lấy site đồ án chính thức
router.get("/doAnChinhThuc", doAnChinhThuc.getDoAnChinhThuc);

// Lấy thông tin bảng đồ án chính thức để hiển thị
router.post("/getInfoDoAn", doAnChinhThuc.getInfoDoAn);

// Lấy thông tin giảng viên cơ hữu và giảng viên mời
router.get("/getInfoGiangVien", doAnChinhThuc.getInfoGiangVien);

// Lấy thông tin check all của đồ án tốt nghiệp
router.post(
  "/getCheckAllDoantotnghiep",
  doAnChinhThuc.getCheckAllDoantotnghiep
);

// Cập nhật table đồ án tốt nghiệp
router.post("/updateDoAn", doAnChinhThuc.updateDoAn);

// Lưu dữ liệu vào table export đồ án tốt nghiệp
router.post("/saveToExportDoAn", doAnChinhThuc.saveToExportDoAn);

// Chèn ngày all
router.post("/updateDoAnDateAll", doAnChinhThuc.updateDoAnDateAll);

// Save note
router.post("/saveNoteDoAn", doAnChinhThuc.SaveNote);

// Done note
router.post("/doneNoteDoAn", doAnChinhThuc.DoneNote);

module.exports = router;
