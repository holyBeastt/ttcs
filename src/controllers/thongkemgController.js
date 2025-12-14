const createConnection = require("../config/databasePool");

const thongkemgController = {
  showThongkemgPage: (req, res) => {
    res.render("thongkemg");
  },

  getThongkemgData: async (req, res) => {
    let connection;
    const { kihoc, namhoc, khoa, hedaotao, type, isQuanDoi } = req.query; // Thêm isQuanDoi
    const thongkeType = type || "khoa"; // mặc định là theo khoa

    try {
      connection = await createConnection();
      let query;
      const params = [];

      if (thongkeType === "hedaotao") {
        if (!hedaotao || hedaotao === "ALL") {
          // Query khi chọn tất cả hệ đào tạo
          query = `
            SELECT 
                gd.he_dao_tao as hedaotao,
                COUNT(DISTINCT gd.GiangVien) as sogiangvien,
                SUM(gd.quychuan) as tongsotiet,
                SUM(gd.quychuan * IFNULL(tl.SoTien, 0)) as tongtien,
                gm.isQuanDoi as isQuanDoi
            FROM giangday gd
            LEFT JOIN gvmoi gm ON gd.id_Gvm = gm.id_Gvm
            LEFT JOIN tienluong tl ON gd.he_dao_tao = tl.he_dao_tao AND gm.HocVi = tl.HocVi
            WHERE gd.id_Gvm != 1
          `;
        } else {
          // Query cho hệ đào tạo cụ thể
          query = `
            SELECT 
                gd.GiangVien as hoten,
                gd.he_dao_tao as hedaotao,
                gm.HocVi as hocvi,
                SUM(gd.quychuan) as tongsotiet,
                SUM(gd.quychuan * IFNULL(tl.SoTien, 0)) as tongtien,
                gm.isQuanDoi as isQuanDoi
            FROM giangday gd
            LEFT JOIN gvmoi gm ON gd.id_Gvm = gm.id_Gvm
            LEFT JOIN tienluong tl ON gd.he_dao_tao = tl.he_dao_tao AND gm.HocVi = tl.HocVi
            WHERE gd.he_dao_tao = ? AND gd.id_Gvm != 1
          `;
          params.push(hedaotao);
        }
        // Thêm điều kiện lọc
        if (kihoc && kihoc !== "ALL") {
          query += ` AND gd.HocKy = ?`;
          params.push(kihoc);
        }
        if (namhoc && namhoc !== "ALL") {
          query += ` AND gd.NamHoc = ?`;
          params.push(namhoc);
        }
        // Thêm điều kiện lọc isQuanDoi
        if (isQuanDoi === "1") {
          query += ` AND gm.isQuanDoi = 1`;
        }
        // GROUP BY
        if (!hedaotao || hedaotao === "ALL") {
          query += ` GROUP BY gd.he_dao_tao ORDER BY tongsotiet DESC`;
        } else {
          query += ` GROUP BY hoten, hedaotao, hocvi ORDER BY tongsotiet DESC`;
        }
      } else {
        if (khoa === "ALL") {
          // Query khi chọn tất cả khoa
          query = `
            SELECT 
                gd.Khoa as khoa,
                COUNT(DISTINCT gd.GiangVien) as sogiangvien,
                SUM(gd.quychuan) as tongsotiet,
                gm.isQuanDoi as isQuanDoi
            FROM giangday gd
            LEFT JOIN gvmoi gm ON gd.id_Gvm = gm.id_Gvm
            WHERE gd.id_Gvm != 1
          `;
        } else {
          // Query cho khoa cụ thể
          query = `
            SELECT gd.GiangVien as hoten, 
                   SUM(gd.quychuan) as tongsotiet,
                   gd.he_dao_tao as hedaotao,
                   gm.isQuanDoi as isQuanDoi
            FROM giangday gd
            LEFT JOIN gvmoi gm ON gd.id_Gvm = gm.id_Gvm
            WHERE gd.Khoa = ? AND gd.id_Gvm != 1
          `;
          params.push(khoa);
        }
        // Thêm các điều kiện lọc khác
        if (kihoc && kihoc !== "ALL") {
          query += ` AND gd.HocKy = ?`;
          params.push(kihoc);
        }
        if (namhoc && namhoc !== "ALL") {
          query += ` AND gd.NamHoc = ?`;
          params.push(namhoc);
        }
        // Thêm điều kiện lọc isQuanDoi
        if (isQuanDoi === "1") {
          query += ` AND gm.isQuanDoi = 1`;
        }

        // Thêm GROUP BY
        if (khoa === "ALL") {
          query += ` GROUP BY gd.Khoa ORDER BY tongsotiet DESC`;
        } else {
          query += ` GROUP BY hoten, he_dao_tao ORDER BY tongsotiet DESC`;
        }
      }

      const [result] = await connection.query(query, params);
      res.json(result);
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res.status(500).send("Lỗi máy chủ");
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
        "SELECT DISTINCT HocKy as Ki FROM giangday ORDER BY HocKy"
      );

      const maxNamHoc = namHoc.length > 0 ? namHoc[0].NamHoc : "ALL"; // Lấy năm học lớn nhất

      // Thêm "Tất cả năm" và "Cả năm" vào đầu danh sách
      namHoc.unshift({ NamHoc: "ALL" });
      hocKy.unshift({ Ki: "ALL" });

      res.json({
        success: true,
        NamHoc: namHoc,
        Ki: hocKy,
        MaxNamHoc: maxNamHoc, // Trả về năm học lớn nhất
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu năm học:", error);
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    } finally {
      if (connection) connection.release();
    }
  },

  getPhongBanMG: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      // Thêm DISTINCT để loại bỏ các giá trị trùng lặp
      const [phongBan] = await connection.query(
        "SELECT DISTINCT Khoa as MaPhongBan FROM giangday ORDER BY Khoa"
      );

      // Tạo mảng mới không có giá trị trùng lặp
      const uniquePhongBan = Array.from(
        new Set(phongBan.map((item) => item.MaPhongBan))
      ).map((maPB) => ({ MaPhongBan: maPB }));

      connection.release();
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

  getHeDaoTaoMG: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [hedaotao] = await connection.query(
        "SELECT DISTINCT he_dao_tao as HeDaoTao FROM giangday ORDER BY he_dao_tao"
      );
      res.json({
        success: true,
        HeDaoTao: hedaotao,
      });
    } catch (error) {
      res.json({ success: false });
    } finally {
      if (connection) connection.release();
    }
  },
};

module.exports = thongkemgController;
