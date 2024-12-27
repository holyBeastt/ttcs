require("dotenv").config();
const mysql = require("mysql2");

// Tạo kết nối tới MySQL trên XAMPP
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || "", // Mặc định là không có mật khẩu trên XAMPP
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306, // Port mặc định cho MySQL
});

// Kết nối tới cơ sở dữ liệu
connection.connect((err) => {
  if (err) {
    console.error("Cannot connect database!: " + err.stack);
    return;
  }
  console.log("Connected with ID : " + connection.threadId);
});

module.exports = connection;
