require("dotenv").config();
const db = require("../controllers/connectDB"); // Import kết nối database
const createPoolConnection = require("../config/databasePool");
const path = require("path");
const XLSX = require("xlsx");
const fs = require("fs");

const deleteTableTam = async (req, res) => {
  const { Khoa, Dot, Ki, Nam } = req.body; // Lấy thông tin từ body
  console.log("Xóa thành công dữ liệu bảng tạm khoa, đợt, kì, năm:", Khoa, Dot, Ki, Nam);

  const tableTam = process.env.DB_TABLE_TAM; // Lấy tên bảng từ biến môi trường
  let query; // Khai báo biến cho câu truy vấn

  let connection; // Khai báo biến kết nối
  try {
    connection = await createPoolConnection(); // Lấy kết nối từ pool

    if (Khoa !== "ALL") {
      // Nếu Khoa khác "ALL"
      query = `DELETE FROM ?? WHERE Khoa = ? AND Dot = ? AND Ki = ? AND Nam = ?`;
      const [results] = await connection.query(query, [
        tableTam,
        Khoa,
        Dot,
        Ki,
        Nam,
      ]);

      // Kiểm tra xem có bản ghi nào bị xóa không
      if (results.affectedRows > 0) {
        return res.json({ message: "Xóa thành công dữ liệu." });
      } else {
        return res
          .status(404)
          .json({ message: "Không tìm thấy dữ liệu để xóa." });
      }
    } else {
      // Nếu Khoa là "ALL"
      query = `DELETE FROM ?? WHERE Dot = ? AND Ki = ? AND Nam = ?`;
      const [results] = await connection.query(query, [tableTam, Dot, Ki, Nam]);

      // Kiểm tra xem có bản ghi nào bị xóa không
      if (results.affectedRows > 0) {
        return res.json({ message: "Xóa thành công dữ liệu." });
      } else {
        return res
          .status(404)
          .json({ message: "Không tìm thấy dữ liệu để xóa." });
      }
    }
  } catch (error) {
    console.error("Lỗi khi xóa dữ liệu:", error);
    return res.status(500).json({ message: "Đã xảy ra lỗi khi xóa dữ liệu." });
  } finally {
    if (connection) connection.release(); // Giải phóng kết nối
  }
};

// Xuất các hàm để sử dụng
module.exports = {
  deleteTableTam,
};