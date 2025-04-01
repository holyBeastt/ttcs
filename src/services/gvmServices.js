// const express = require("express");
// const multer = require("multer");
// const connection = require("../config/database");

// const router = express.Router();
// const createConnection = require("../config/databaseAsync");

// const getGvmLists = async (req, res) => {
//   try {
//     const connection2 = await createConnection();
//     const query = "SELECT * FROM `gvmoi`";
//     const [results] = await connection2.query(query);

//     // Gửi danh sách giảng viên dưới dạng mảng
//     return results; // Chỉ gửi kết quả mảng
//   } catch (error) {
//     console.error("Error fetching GVM lists: ", error);
//     return res.status(500).send("Internal server error"); // Trả về chuỗi thông báo lỗi
//   }
// };

// // Xuất các hàm để sử dụng trong router
// module.exports = {
//   getGvmLists,
// };

const express = require("express");
const multer = require("multer");

const router = express.Router();
const createPoolConnection = require("../config/databasePool");

const getGvmLists = async (req, res) => {
  let connection;
  try {
    connection = await createPoolConnection();
    const query = "SELECT * FROM `gvmoi`";
    const [results] = await connection.query(query);

    // Gửi danh sách giảng viên dưới dạng mảng
    return results; // Chỉ gửi kết quả mảng
  } catch (error) {
    console.error("Error fetching GVM lists: ", error);
    return res.status(500).send("Internal server error"); // Trả về chuỗi thông báo lỗi
  } finally {
    if (connection) connection.release(); // Đóng kết nối sau khi truy vấn
  }
};

// Xuất các hàm để sử dụng trong router
module.exports = {
  getGvmLists,
};

// Không được bỏ
