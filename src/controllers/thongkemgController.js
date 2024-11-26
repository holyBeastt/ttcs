const createConnection = require("../config/databasePool");

const thongkemgController = {
    // Phương thức để hiển thị trang thongkemg
    showThongkemgPage: (req, res) => {
      res.render("thongkemg"); // Render trang thongkemg.ejs
    },
  
    // Phương thức để lấy dữ liệu số tiết mời giảng
    getThongkemgData: async (req, res) => {
      let connection;
  
      try {
        connection = await createConnection();
        const query = `
          SELECT hoten, SUM(sotiet) as tongsotiet 
          FROM hopdonggvmoi 
          GROUP BY hoten
          ORDER BY tongsotiet DESC;
        `;
        const [result] = await connection.query(query);
        res.json(result); // Trả về dữ liệu dưới dạng JSON
      } catch (err) {
        console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
        res.status(500).send("Lỗi máy chủ");
      } finally {
        if (connection) connection.release(); // Giải phóng kết nối
      }
    }
  };
  
  module.exports = thongkemgController;