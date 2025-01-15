const path = require("path");
const express = require("express");

const configViewEngine = (app) => {
  app.set("views", path.join("./src", "views"));
  app.set("view engine", "ejs");

  // config static file
  app.use(express.static(path.join("./src", "public")));

  // Lấy ảnh CCCD của giảng viên mời
  // Đi lên 2 cấp từ src/config về thư mục Giang_Vien_Moi
  const targetPath = path.join(__dirname, "..", "..", "Giang_Vien_Moi");
  app.use(express.static(targetPath));
};

module.exports = configViewEngine;
