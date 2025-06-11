const express = require("express");
const router = express.Router();
const chinhSuaQuyChuanController = require("../controllers/chinhSuaQuyChuanController");
const multer = require('multer');

// Trang đăng nhập (GET)
router.get("/chinhSuaQuyChuan", (req, res) => {
  res.render("chinhSuaQuyChuan", { content: null }); // Pass content as null or any default value
});

// Route để cập nhật dữ liệu quy chuẩn
router.post("/update-quy-chuan", chinhSuaQuyChuanController.updateQuyChuan);

// Cấu hình các route



module.exports = router;