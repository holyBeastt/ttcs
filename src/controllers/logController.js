const createConnection = require("../config/databasePool");

// src/controllers/logController.js
const logController = {
  // Phương thức để hiển thị trang log
  showLogTable: (req, res) => {
    res.render("log"); // Render trang log.ejs
  },

  // Phương thức để lấy dữ liệu log
  getLogData: async (req, res) => {
    let connection;

    try {
      connection = await createConnection();
      const query = "SELECT * FROM lichsunhaplieu ORDER BY MaLichSuNhap DESC";
      const [result] = await connection.query(query);
      const lichsunhaplieu = result;

      // Trả về dữ liệu dưới dạng JSON
      res.json(lichsunhaplieu);
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).send("Lỗi máy chủ");
    } finally {
      if (connection) connection.release(); // Giải phóng kết nối
    }
  }
};

module.exports = logController;
