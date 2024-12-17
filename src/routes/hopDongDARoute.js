const express = require("express");
const router = express.Router();
const hopDongDAController = require("../controllers/hopDongDAController");

// Route để hiển thị trang hopDongDA
router.get("/hopDongDA", hopDongDAController.gethopDongDASite);

// Route để xuất hợp đồng cho nhiều giảng viên
router.get("/exportHDDA/Dowload", hopDongDAController.exportMultipleContracts);


module.exports = router;
