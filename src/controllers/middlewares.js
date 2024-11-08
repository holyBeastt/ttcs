const XLSX = require("xlsx");
const fs = require("fs");
require("dotenv").config();
const path = require("path");
const connection = require("./connectDB");
const { json } = require("express");
const roleDaoTaoALL = process.env.DAOTAO_ALL;


// Middleware kiểm tra người dùng đã đăng nhập và có quyền "daotao"
const checkDaotaoRoleThiHanh = (req, res, next) => {
  // Kiểm tra nếu userId tồn tại trong session (nghĩa là đã đăng nhập)
  if (!req.session.userId) {
    return res.status(401).json({ message: "Vui lòng đăng nhập." });
  }

  // Kiểm tra nếu quyền của người dùng là "daotao"
  if (req.session.role != roleDaoTaoALL) {
    return res
      .status(403)
      .json({ message: "Bạn không có quyền truy cập chức năng này." });
  }

  // Nếu đã đăng nhập và có quyền "daotao", cho phép tiếp tục
  next();
};

module.exports = { checkDaotaoRoleThiHanh };
