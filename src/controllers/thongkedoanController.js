const createConnection = require("../config/databasePool");

const thongkedoanController = {
  getData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const query = `
        SELECT GiangVien, COUNT(ID) AS soDoAn
        FROM exportdoantotnghiep
        WHERE GiangVien IS NOT NULL
        GROUP BY GiangVien
        ORDER BY soDoAn DESC
      `;
      const [result] = await connection.query(query);

      // Định dạng dữ liệu trả về dưới dạng JSON
      res.json({ success: true, data: result });
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    } finally {
      if (connection) connection.release();
    }
  }
};

module.exports = thongkedoanController;
