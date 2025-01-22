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
  },

  // Phương thức để lấy dữ liệu năm học
  getNamHocData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT * FROM namhoc"; // Giả sử bảng là namhoc
      const [result] = await connection.query(query);
      res.json(result);
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).send("Lỗi máy chủ");
    } finally {
      if (connection) connection.release();
    }
  },

  // Phương thức để lấy dữ liệu khoa từ bảng phongban
  getKhoaData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT MaPhongBan FROM phongban"; // Truy vấn từ bảng phongban
      const [result] = await connection.query(query);
      
      // Sử dụng Set để loại bỏ các giá trị trùng lặp
      const uniqueDepartments = new Set();
      result.forEach(item => {
        uniqueDepartments.add(item.MaPhongBan); // Thêm MaPhongBan vào Set
      });

      // Chuyển Set thành mảng để trả về
      const uniqueDepartmentsArray = Array.from(uniqueDepartments).map(department => {
        return { MaPhongBan: department }; // Định dạng lại nếu cần
      });

      res.json(uniqueDepartmentsArray);
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).send("Lỗi máy chủ");
    } finally {
      if (connection) connection.release();
    }
  },

  // Phương thức để lấy dữ liệu nhân viên
  getNhanVienData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const query = "SELECT id_User, MaPhongBan FROM nhanvien"; // Truy vấn từ bảng nhanvien
      const [result] = await connection.query(query);
      res.json(result);
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).send("Lỗi máy chủ");
    } finally {
      if (connection) connection.release();
    }
  }
};

module.exports = logController;
