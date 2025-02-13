const express = require("express");
const router = express.Router();
const login = require("../controllers/loginController"); // Giả sử bạn đã có authController
const homeController = require("../controllers/homeController");

// Trang đăng nhập (GET)
router.get("/", (req, res) => {
  res.render("login.ejs"); // Render file 'login.ejs' trong thư mục 'views'
});

// Main admin
router.get("/admin", (req, res) => {
  res.render("admin");
});

// Main đào tạo, tài chính
router.get("/maindt", homeController.getHomeMainDaoTao);

// Main khoa
router.get("/mainkhoa", homeController.getMainKhoa);

// Xử lý đăng nhập (POST)
router.post("/login", login); // Gọi phương thức login từ controller

module.exports = router;
