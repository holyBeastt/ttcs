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

// Add this new route
router.post("/request-quy-chuan-edit", chinhSuaQuyChuanController.requestQuyChuanEdit);

// Sửa route để xử lý POST request
router.post("/get-quy-chuan-edit-requests", chinhSuaQuyChuanController.getQuyChuanEditRequests);

// Add these new routes
router.post("/update-quy-chuan-approval", chinhSuaQuyChuanController.updateQuyChuanApproval);
router.post("/apply-quy-chuan-edit", chinhSuaQuyChuanController.applyQuyChuanEdit);

// Add this new route
router.post("/export-adjusted-quy-chuan", chinhSuaQuyChuanController.exportAdjustedQuyChuan);

// Cấu hình các route



module.exports = router;