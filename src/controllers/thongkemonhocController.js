const createConnection = require("../config/databasePool");
const pool = require("../config/Pool");

const thongkemonhocController = {
  showThongkemonhocPage: (req, res) => {
    res.render("thongkeMonHoc");
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
      res.status(500).json({
        success: false,
        message: "Lỗi máy chủ",
        error: err.message,
      });
    } finally {
      if (connection) connection.release();
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

      const maxNamHoc = namHoc.length > 0 ? namHoc[0].NamHoc : "ALL";

      // Thêm "Tất cả năm" và "Cả năm" vào đầu danh sách
      namHoc.unshift({ NamHoc: "ALL" });
      hocKy.unshift({ Ki: "ALL" });

      res.json({
        success: true,
        NamHoc: namHoc,
        Ki: hocKy,
        MaxNamHoc: maxNamHoc,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu năm học:", error);
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    } finally {
      if (connection) connection.release();
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
      res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    } finally {
      if (connection) connection.release();
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
      res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    } finally {
      if (connection) connection.release();
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
      res.json({ success: false });
    } finally {
      if (connection) connection.release();
    }
  },
};

module.exports = thongkemonhocController;
