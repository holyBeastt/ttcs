const express = require("express");
const router = express.Router();
const qcdk = require("../controllers/moiGiangQCDKController"); // Import hàm xử lý từ controller
const role = require("../controllers/middlewares"); // Check role

// render site quy chuẩn dự kiến
router.get('/tableTam', (req, res) => {
  res.render('quychuan.bangQuyChuanDuKien.ejs'); 
});

// render bảng theo khoa đợt kì năm
router.post("/qcdk", (req, res) => qcdk.getTableTam(req, res));

// xóa toàn bộ bảng theo khoa đợt kì năm
router.post("/xoa-qcdk", (req, res) => {
  qcdk.deleteTableTam(req, res)
});

// cập nhật lại toàn bộ bảng theo khoa đợt kì năm
router.post("/update-qcdk", (req, res) => {
  qcdk.updateTableTam(req, res)
});

// cập nhật 1 dòng
router.put("/update-row/:id", async (req, res) => {
  qcdk.updateRow(req, res)
});

// xóa 1 dòng
router.delete("/delete-row/:id", async (req, res) => {
  qcdk.deleteRow(req, res);
});

// thêm 1 dòng
router.post("/add-row", async (req, res) => {
  qcdk.addNewRow(req, res);
});

// xuất qcdk
router.post("/qcdk-export-word", async (req, res) => {
  qcdk.exportToWord(req, res);
});

router.post("/qcdk-export-excel", async (req, res) => {
  qcdk.exportToExcel(req, res);
});

router.post("/hddk-export-excel", async (req, res) => {
  qcdk.exportToExcel_HDDK(req, res);
});

// xuất file Excel quy chuẩn chính thức với 19 cột
router.post("/qcct-export-excel", async (req, res) => {
  qcdk.exportToExcelQC(req, res);
});

// sửa số sinh viênviên
router.post("/qcdk/edit-student-quanity", async (req, res) => {
  qcdk.editStudentQuanity(req, res);
});

module.exports = router;
