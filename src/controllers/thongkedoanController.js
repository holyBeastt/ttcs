const createConnection = require("../config/databasePool");

const thongkedoanController = {
  getData: async (req, res) => {
    const { namhoc, khoa, dot, ki } = req.query;
    let connection;
    let query;
    const params = [];

    try {
      connection = await createConnection();

      // Truy vấn dữ liệu cho cả cơ hữu và mời giảng
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

      if (ki && ki !== "ALL") {
        query += " AND ki = ?";
        params.push(ki);
      }

      query += `
            GROUP BY GiangVien, isMoiGiang, MaPhongBan
            ORDER BY soDoAn DESC
        `;

      const [result] = await connection.query(query, params);

      // Phân loại dữ liệu theo Cơ hữu và Mời giảng
      const coHuu = result.filter((item) => item.isMoiGiang === 0);
      const moiGiang = result.filter((item) => item.isMoiGiang === 1);

      // Tính tổng số tiết
      const totalCoHuu = coHuu.reduce(
        (sum, item) => sum + parseFloat(item.soTiet || 0),
        0
      );
      const totalMoiGiang = moiGiang.reduce(
        (sum, item) => sum + parseFloat(item.soTiet || 0),
        0
      );
      const totalSoTiet = totalCoHuu + totalMoiGiang;

      // Trả về dữ liệu
      res.json({
        success: true,
        coHuu,
        moiGiang,
        totalCoHuu,
        totalMoiGiang,
        totalSoTiet,
      });
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    } finally {
      if (connection) connection.release();
    }
  },

  getNamHocOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [namHoc] = await connection.query(`
            SELECT DISTINCT namhoc AS NamHoc 
            FROM exportdoantotnghiep 
            ORDER BY namhoc DESC
        `);

      const maxNamHoc = namHoc.length > 0 ? namHoc[0].NamHoc : "ALL"; // Lấy năm học lớn nhất

      // Chỉ thêm "Tất cả năm" một lần
      namHoc.unshift({ NamHoc: "ALL" });

      res.json({
        success: true,
        NamHoc: namHoc,
        MaxNamHoc: maxNamHoc,
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

      const uniquePhongBan = Array.from(
        new Set(phongBan.map((item) => item.MaPhongBan))
      ).map((maPB) => ({ MaPhongBan: maPB }));

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

  getKiOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [ki] = await connection.query(`
            SELECT DISTINCT Ki 
            FROM exportdoantotnghiep 
            WHERE Ki IS NOT NULL
            ORDER BY Ki
        `);

      res.json({
        success: true,
        Ki: ki,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu Kì:", error);
      res.status(500).json({ success: false, message: "Lỗi server" });
    } finally {
      if (connection) connection.release();
    }
  },
};

module.exports = thongkedoanController;
