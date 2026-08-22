const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  connectionLimit: 100, // Giới hạn số kết nối tối đa trong pool
  connectTimeout: 10000, // 10 giây
  queueLimit: 0, // Không giới hạn hàng đợi (hoặc có thể đặt giới hạn cụ thể)
  enableKeepAlive: true, // Tự động gửi gói tin TCP Keep-Alive để giữ kết nối không bị ngắt ngầm
  keepAliveInitialDelay: 10000, // Bắt đầu gửi keepalive sau 10 giây nhàn rỗi
});

async function createConnection() {
  const connection = await pool.getConnection();
  return connection;
}

module.exports = createConnection;
