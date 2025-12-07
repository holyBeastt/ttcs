const createConnection = require("../config/databasePool");

const thongkemonhocController = {
  showThongkemonhocPage: async (req, res) => {
    try {
      res.render("thongkemonhoc");
    } catch (error) {
      console.error("Lỗi khi render trang thống kê môn học:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).send("Lỗi khi tải trang thống kê môn học: " + (error.message || error));
    }
  },

  // Endpoint test để kiểm tra kết nối
  testConnection: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [result] = await connection.query("SELECT 1 as test");
      res.json({
        success: true,
        message: "Kết nối database thành công",
        data: result
      });
    } catch (error) {
      console.error("Lỗi test connection:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi kết nối database",
        error: error.message
      });
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (releaseErr) {
          console.error("Lỗi khi release connection:", releaseErr);
        }
      }
    }
  },

  getThongkemonhocData: async (req, res) => {
    let connection;
    const { namhoc, khoa, hedaotao, kihoc } = req.query;

    try {
      connection = await createConnection();

      let query = `
        SELECT 
          BoMon,
          COUNT(*) AS TongSoLop,
          SUM(CASE WHEN id_User = 1 THEN 1 ELSE 0 END) AS SoLopMoi,
          SUM(CASE WHEN id_User != 1 THEN 1 ELSE 0 END) AS SoLopVuotGio
        FROM giangday
        WHERE BoMon IS NOT NULL AND BoMon != ''
      `;

      const params = [];

      if (namhoc && namhoc !== "ALL") {
        query += " AND NamHoc = ?";
        params.push(namhoc);
      }

      if (khoa && khoa !== "ALL") {
        query += " AND Khoa = ?";
        params.push(khoa);
      }

      if (hedaotao && hedaotao !== "ALL") {
        query += " AND he_dao_tao = ?";
        params.push(hedaotao);
      }

      if (kihoc && kihoc !== "ALL") {
        query += " AND HocKy = ?";
        params.push(kihoc);
      }

      query += `
        GROUP BY BoMon
        ORDER BY BoMon
      `;

      const [result] = await connection.query(query, params);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      console.error("Stack trace:", err.stack);
      res.status(500).json({
        success: false,
        message: "Lỗi máy chủ",
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      });
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (releaseErr) {
          console.error("Lỗi khi release connection:", releaseErr);
        }
      }
    }
  },

  getNamHocData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();

      // Lấy danh sách năm học
      const [namHoc] = await connection.query(
        "SELECT DISTINCT NamHoc as NamHoc FROM giangday ORDER BY NamHoc DESC"
      );

      // Lấy danh sách kỳ học
      const [hocKy] = await connection.query(
        "SELECT DISTINCT HocKy as Ki FROM giangday WHERE HocKy IS NOT NULL ORDER BY HocKy"
      );

      const maxNamHoc = namHoc && namHoc.length > 0 ? namHoc[0].NamHoc : "ALL";

      // Thêm "Tất cả năm" và "Cả năm" vào đầu danh sách
      if (Array.isArray(namHoc)) {
        namHoc.unshift({ NamHoc: "ALL" });
      }
      if (Array.isArray(hocKy)) {
        hocKy.unshift({ Ki: "ALL" });
      }

      res.json({
        success: true,
        NamHoc: namHoc,
        Ki: hocKy,
        MaxNamHoc: maxNamHoc,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu năm học:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ 
        success: false, 
        message: "Lỗi máy chủ",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (releaseErr) {
          console.error("Lỗi khi release connection:", releaseErr);
        }
      }
    }
  },

  getPhongBanOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [phongBan] = await connection.query(
        "SELECT DISTINCT Khoa as MaPhongBan FROM giangday WHERE Khoa IS NOT NULL ORDER BY Khoa"
      );

      const uniquePhongBan = Array.from(
        new Set(phongBan.map((item) => item.MaPhongBan))
      ).map((maPB) => ({ MaPhongBan: maPB }));

      res.json({
        success: true,
        MaPhongBan: uniquePhongBan,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu phòng ban:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({
        success: false,
        message: "Lỗi server",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (releaseErr) {
          console.error("Lỗi khi release connection:", releaseErr);
        }
      }
    }
  },

  getKhoaData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [phongBan] = await connection.query(
        "SELECT DISTINCT Khoa as MaPhongBan FROM giangday WHERE Khoa IS NOT NULL ORDER BY Khoa"
      );

      const uniquePhongBan = Array.from(
        new Set(phongBan.map((item) => item.MaPhongBan))
      ).map((maPB) => ({ MaPhongBan: maPB }));

      res.json({
        success: true,
        MaPhongBan: uniquePhongBan,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu khoa:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({
        success: false,
        message: "Lỗi server",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (releaseErr) {
          console.error("Lỗi khi release connection:", releaseErr);
        }
      }
    }
  },

  getHeDaoTaoOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [hedaotao] = await connection.query(
        "SELECT DISTINCT he_dao_tao as HeDaoTao FROM giangday WHERE he_dao_tao IS NOT NULL ORDER BY he_dao_tao"
      );

      res.json({
        success: true,
        HeDaoTao: hedaotao,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu hệ đào tạo:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).json({ 
        success: false,
        message: "Lỗi server",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    } finally {
      if (connection) {
        try {
          connection.release();
        } catch (releaseErr) {
          console.error("Lỗi khi release connection:", releaseErr);
        }
      }
    }
  },
};

module.exports = thongkemonhocController;
