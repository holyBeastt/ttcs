const express = require("express");
const multer = require("multer");
const connection = require("../config/database");

const router = express.Router();
const createConnection = require("../config/databaseAsync");

const getGvmLists = async (req, res) => {
  try {
    const connection2 = await createConnection();
    const query = "SELECT * FROM `nhanvien`";
    const [results] = await connection2.query(query);

    // Gửi danh sách giảng viên dưới dạng mảng
    return results; // Chỉ gửi kết quả mảng
  } catch (error) {
    console.error("Error fetching GVM lists: ", error);
    return res.status(500).send("Internal server error"); // Trả về chuỗi thông báo lỗi
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getGvmLists,
};

// có thể bỏ, nằm trong import controller
