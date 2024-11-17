const express = require("express");
const router = express.Router();

router.get("/vuotGioExport", (req, res) => {
    res.render("vuotGioExport"); // Hiển thị trang thông tin hợp đồng giảng viên mời
  });
  
  module.exports = router;
