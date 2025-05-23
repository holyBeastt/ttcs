const createConnection = require("../config/databasePool");

const thongkemgController = {
  showThongkemgPage: (req, res) => {
    res.render("thongkemg");
  },

  getThongkemgData: async (req, res) => {
    let connection;
    const { kihoc, namhoc, khoa } = req.query;

    try {
      connection = await createConnection();
      let query;
      const params = [];

      if (khoa === "ALL") {
        // Query khi chọn tất cả khoa
        query = `
                    SELECT 
                        Khoa as khoa,
                        COUNT(DISTINCT GiangVien) as sogiangvien,
                        SUM(quychuan) as tongsotiet
                    FROM giangday 
                    WHERE id_Gvm != 1
                `;
      } else {
        // Query cho khoa cụ thể
        query = `
                    SELECT GiangVien as hoten, 
                    SUM(quychuan) as tongsotiet,
                    he_dao_tao as hedaotao
                    FROM giangday 
                    WHERE Khoa = ? AND id_Gvm != 1
                `;
        params.push(khoa);
      }

      // Thêm các điều kiện lọc khác
      if (kihoc && kihoc !== "ALL") {
        query += ` AND HocKy = ?`;
        params.push(kihoc);
      }
      if (namhoc && namhoc !== "ALL") {
        query += ` AND NamHoc = ?`;
        params.push(namhoc);
      }

      // Thêm GROUP BY
      if (khoa === "ALL") {
        query += ` GROUP BY Khoa ORDER BY tongsotiet DESC`;
      } else {
        query += ` GROUP BY hoten, he_dao_tao ORDER BY tongsotiet DESC`;
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
};

module.exports = thongkemgController;
