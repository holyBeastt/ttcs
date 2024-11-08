const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  connectionLimit: 150, // Giới hạn số kết nối tối đa trong pool
  connectTimeout: 10000, // 10 giây
  queueLimit: 0, // Không giới hạn hàng đợi (hoặc có thể đặt giới hạn cụ thể)
});

async function createConnection() {
  const connection = await pool.getConnection();
  return connection;
}

module.exports = createConnection;
