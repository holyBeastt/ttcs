const express = require("express");
const router = express.Router();
const qcdk = require("../controllers/moiGiangQCDKController"); // Import hàm xử lý từ controller


// render site theo khoa đợt kì năm
router.post("/get-table-tam", (req, res) => qcdk.getTableTam(req, res));

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

module.exports = router;
