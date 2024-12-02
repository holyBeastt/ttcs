const express = require("express");
const router = express.Router();
const getViewThayDoiTTGiamDoc = require("../controllers/thayDoiTTGiamDocTrongHDController"); // Giả sử bạn đã có authController

// Trang đăng nhập (GET)
router.get(
  "/viewThayDoiTTGiamDoc",
  getViewThayDoiTTGiamDoc.getViewThayDoiTTGiamDoc
);

// Xử lý đăng nhập (POST)
router.post("/updateTTGiamDoc", getViewThayDoiTTGiamDoc.postUpdateTTGiamDoc);

module.exports = router;
