const createConnection = require("../config/databasePool");

const thongkedoanController = {
  getData: async (req, res) => {
    const { namhoc, khoa, dot } = req.query;
    let connection;
    let query;
    const params = [];
  
    try {
      connection = await createConnection();
  
      // Truy vấn dữ liệu cho cả cơ hữu và mời giảng với số đồ án (soDoAn) và số tiết (soTiet)
      query = `
        SELECT 
          GiangVien, 
          SUM(SoTiet) AS soTiet, 
          COUNT(ID) AS soDoAn, 
          MaPhongBan,
          isMoiGiang
        FROM exportdoantotnghiep
        WHERE 1=1
      `;
  
      if (khoa && khoa !== "ALL") {
        query += " AND MaPhongBan = ?";
        params.push(khoa);
      }
  
      if (namhoc && namhoc !== "ALL") {
        query += " AND NamHoc = ?";
        params.push(namhoc);
      }
  
      if (dot && dot !== "ALL") {
        query += " AND Dot = ?";
        params.push(dot);
      }
  
      query += `
        GROUP BY GiangVien, isMoiGiang, MaPhongBan
        ORDER BY soDoAn DESC
      `;
  
      const [result] = await connection.query(query, params);
  
      // Phân loại dữ liệu theo Cơ hữu và Mời giảng
      const coHuu = result.filter((item) => item.isMoiGiang === 0);
      const moiGiang = result.filter((item) => item.isMoiGiang === 1);
  
      res.json({ success: true, coHuu, moiGiang });
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
      const [namHoc] = await connection.query(`
        SELECT DISTINCT namhoc AS NamHoc 
        FROM exportdoantotnghiep 
        ORDER BY namhoc DESC
      `);
      res.json({
        success: true,
        NamHoc: [{ NamHoc: "ALL" }, ...namHoc],
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu filter:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    } finally {
      if (connection) connection.release();
    }
  },

  getPhongBanOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [phongBan] = await connection.query(`
        SELECT DISTINCT MaPhongBan 
        FROM exportdoantotnghiep 
        ORDER BY MaPhongBan
      `);

      const uniquePhongBan = Array.from(new Set(phongBan.map((item) => item.MaPhongBan)))
        .map((maPB) => ({ MaPhongBan: maPB }));

      res.json({ success: true, MaPhongBan: uniquePhongBan });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu phòng ban:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    } finally {
      if (connection) connection.release();
    }
  },

  getDotOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [dot] = await connection.query(`
        SELECT DISTINCT Dot 
        FROM exportdoantotnghiep 
        ORDER BY Dot
      `);

      res.json({
        success: true,
        Dot: dot,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu đợt:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    } finally {
      if (connection) connection.release();
    }
  },
};

module.exports = thongkedoanController;
