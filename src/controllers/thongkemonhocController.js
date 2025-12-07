const createConnection = require("../config/databasePool");

const thongkemonhocController = {
  showThongkemonhocPage: (req, res) => {
    try {
      res.render("thongkeMonHoc");
    } catch (error) {
      console.error("Lỗi khi render trang thống kê môn học:", error);
      console.error("Stack trace:", error.stack);
      res.status(500).send("Lỗi khi tải trang: " + (error.message || error));
    }
  },

  getThongkemonhocData: async (req, res) => {
    let connection;
    // Lấy tham số và ép kiểu chuỗi để tránh lỗi undefined
    const { namhoc, khoa, hedaotao, kihoc } = req.query;

    try {
      connection = await createConnection();

      // Sử dụng alias (tên giả) cho bảng để query gọn hơn và dễ sửa tên bảng
      let query = `
        SELECT 
          BoMon,
          COUNT(*) AS TongSoLop,
          SUM(CASE WHEN id_User = 1 THEN 1 ELSE 0 END) AS SoLopMoi,
          SUM(CASE WHEN id_User != 1 OR id_User IS NULL THEN 1 ELSE 0 END) AS SoLopVuotGio
        FROM giangday
        WHERE BoMon IS NOT NULL AND BoMon != ''
      `;

      const params = [];

      // Kiểm tra kỹ điều kiện "ALL" và null/undefined
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
        ORDER BY BoMon ASC
      `;

      console.log("Executing Query:", query); // Log query ra server để debug nếu lỗi
      console.log("Params:", params);

      const [result] = await connection.query(query, params);

      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      console.error("Lỗi chi tiết tại getThongkemonhocData:", err); // Log đầy đủ lỗi
      res.status(500).json({
        success: false,
        message: "Lỗi truy vấn dữ liệu: " + err.message, // Trả về message lỗi để biết nguyên nhân
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

      // Sửa lại query để đảm bảo tên bảng đúng
      const [namHoc] = await connection.query(
        `SELECT DISTINCT NamHoc FROM giangday ORDER BY NamHoc DESC`
      );

      const [hocKy] = await connection.query(
        `SELECT DISTINCT HocKy as Ki FROM giangday WHERE HocKy IS NOT NULL ORDER BY HocKy`
      );

      // Xử lý an toàn khi mảng rỗng
      const maxNamHoc = namHoc.length > 0 ? namHoc[0].NamHoc : "ALL";

      // Spread operator để copy mảng an toàn hơn
      const listNamHoc = [{ NamHoc: "ALL" }, ...namHoc];
      const listHocKy = [{ Ki: "ALL" }, ...hocKy];

      res.json({
        success: true,
        NamHoc: listNamHoc,
        Ki: listHocKy,
        MaxNamHoc: maxNamHoc,
      });
    } catch (error) {
      console.error("Lỗi tại getNamHocData:", error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      if (connection) connection.release();
    }
  },

  getPhongBanOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [phongBan] = await connection.query(
        `SELECT DISTINCT Khoa as MaPhongBan FROM giangday WHERE Khoa IS NOT NULL ORDER BY Khoa`
      );

      // Cách lọc trùng lặp phía JS (nếu SQL DISTINCT không bắt hết do khoảng trắng)
      // Nhưng tốt nhất nên tin tưởng SQL DISTINCT
      res.json({
        success: true,
        MaPhongBan: phongBan, // Đã distinct ở SQL rồi thì dùng luôn cho nhanh
      });
    } catch (error) {
      console.error("Lỗi tại getPhongBanOptions:", error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      if (connection) connection.release();
    }
  },

  getKhoaData: async (req, res) => {
    // Hàm này logic y hệt getPhongBanOptions, nên gọi lại code tương tự
    let connection;
    try {
      connection = await createConnection();
      const [phongBan] = await connection.query(
        `SELECT DISTINCT Khoa as MaPhongBan FROM giangday WHERE Khoa IS NOT NULL ORDER BY Khoa`
      );

      res.json({
        success: true,
        MaPhongBan: phongBan,
      });
    } catch (error) {
      console.error("Lỗi tại getKhoaData:", error);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      if (connection) connection.release();
    }
  },

  getHeDaoTaoOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [hedaotao] = await connection.query(
        `SELECT DISTINCT he_dao_tao as HeDaoTao FROM giangday WHERE he_dao_tao IS NOT NULL ORDER BY he_dao_tao`
      );
      res.json({
        success: true,
        HeDaoTao: hedaotao,
      });
    } catch (error) {
      console.error("Lỗi tại getHeDaoTaoOptions:", error);
      res.json({ success: false, message: error.message });
    } finally {
      if (connection) connection.release();
    }
  },
};

module.exports = thongkemonhocController;