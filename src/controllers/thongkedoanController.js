const createConnection = require("../config/databasePool");

const thongkedoanController = {

  getData: async (req, res) => {
    let connection;
    const {namhoc, khoa } = req.query;
    let query;
    const params = [];

    try {
      connection = await createConnection();
      if (khoa === 'ALL') {
         query = `
          SELECT GiangVien, COUNT(ID) AS soDoAn
          FROM exportdoantotnghiep
          WHERE 1=1
        `;
      }
      else{
         query = `
        SELECT GiangVien, COUNT(ID) AS soDoAn
          FROM exportdoantotnghiep
          WHERE MaPhongBan = ?
        `;
        params.push(khoa);
      }
      if (namhoc && namhoc !== 'ALL') {
        query += ` AND NamHoc = ?`;
        params.push(namhoc);
    };

    if (khoa === 'ALL') {
      query += ` GROUP BY GiangVien ORDER BY soDoAn DESC`;
  } else {
      query += ` GROUP BY GiangVien ORDER BY soDoAn DESC`;
  };
      const [result] = await connection.query(query, params);

      // Định dạng dữ liệu trả về dưới dạng JSON
      res.json({ success: true, data: result });
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    } finally {
      if (connection) connection.release();
    }
  },
  getFilterOptions: async (req, res) => {
    let connection;
    try {
        connection = await createConnection();
        const query = `
            SELECT DISTINCT namhoc 
            FROM exportdoantotnghiep 
            ORDER BY namhoc DESC;
        `;
        const [result] = await connection.query(query);
        res.json(result);
    } catch (err) {
        console.error("Lỗi khi lấy dữ liệu filter:", err);
        res.status(500).send("Lỗi máy chủ");
    } finally {
        if (connection) connection.release();
    }
},
};

module.exports = thongkedoanController;
