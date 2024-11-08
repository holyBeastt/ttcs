const express = require("express");
const router = express.Router();
const login = require("../controllers/loginController"); // Giả sử bạn đã có authController

// Trang đăng nhập (GET)
router.get("/", (req, res) => {
  res.render("login.ejs"); // Render file 'login.ejs' trong thư mục 'views'
});

// Xử lý đăng nhập (POST)
router.post("/login", login); // Gọi phương thức login từ controller

module.exports = router;
