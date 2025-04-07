const createConnection = require("../config/databasePool");

const thongketonghopController = {
  getChartData: async (req, res) => {
    let connection;
    const { namhoc, kihoc } = req.query; // Get filters from query parameters

    try {
      connection = await createConnection();

      // Base query
      let query = `
                SELECT 
                    MaPhongBan AS Khoa,
                    SUM(sotiet) AS TongSoTietMoiGiang
                FROM hopdonggvmoi
                WHERE 1=1
            `;
      const params = [];

      // Add filters based on the provided parameters
      if (namhoc && namhoc !== "ALL") {
        query += ` AND namhoc = ?`;
        params.push(namhoc);
      }
      if (kihoc && kihoc !== "ALL") {
        query += ` AND kihoc = ?`;
        params.push(kihoc);
      }

      query += ` GROUP BY MaPhongBan`;

      // Execute the query
      const [moiGiangData] = await connection.query(query, params);
      console.log("Dữ liệu mời giảng:", moiGiangData);

      // Similar query for vượt giờ
      let queryVuotGio = `
            WITH Final AS (
    SELECT 
        gd.Khoa,
        gd.GiangVien AS GiangVien,
        SUM(gd.QuyChuan) AS SoTietGiangDay,
        SUM(COALESCE(gk.TotalSoTietKT, 0)) AS SoTietKTGK, -- Sửa lại hàm SUM gọn hơn
        SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) AS TongSoTiet,
        nv.ChucVu AS ChucVu,
        COUNT(DISTINCT gd.id_User) AS SoLuongGiangVien,
        GREATEST(
            0, 
            SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) - 
            CASE 
                WHEN nv.ChucVu = 'Giám đốc học viện' THEN 300 * 0.15
                WHEN nv.ChucVu = 'Phó giám đốc học viện' THEN 300 * 0.20
                WHEN nv.ChucVu = 'Trưởng phòng' THEN 300 * 0.25
                WHEN nv.ChucVu = 'Phó phòng' THEN 300 * 0.30
                WHEN nv.ChucVu = 'Chủ nhiệm khoa' THEN 300 * 0.70
                WHEN nv.ChucVu = 'Phó Chủ nhiệm khoa' THEN 300 * 0.80
                WHEN nv.ChucVu = 'Chủ nhiệm bộ môn' THEN 300 * 0.80
                WHEN nv.ChucVu = 'Giáo vụ' THEN 300 * 0.70
                WHEN nv.ChucVu = 'Giảng viên' THEN 300
                ELSE 0
            END
        ) AS SoTietVuotGio
    FROM 
        giangday gd 
    LEFT JOIN 
        (
            SELECT 
                id_User, 
                SUM(COALESCE(SoTietKT, 0)) AS TotalSoTietKT
            FROM 
                giuaky
            WHERE 
                (? = 'ALL' OR NamHoc = ?) 
                AND (? = 'ALL' OR HocKy = ?)
            GROUP BY 
                id_User
        ) gk 
    ON 
        gd.id_User = gk.id_User
    LEFT JOIN 
        nhanvien nv 
    ON 
        gd.id_User = nv.id_User
    WHERE 
        (? = 'ALL' OR gd.NamHoc = ?) 
        AND (? = 'ALL' OR gd.HocKy = ?) 
        AND gd.id_User != 1
    GROUP BY 
        gd.Khoa, gd.GiangVien, nv.ChucVu -- Đảm bảo các cột không aggregate được thêm vào GROUP BY
    ORDER BY 
        TongSoTiet DESC
)
SELECT 
    Khoa AS Khoa, 
    SUM(TongSoTiet) AS TongSoTiet,
    SUM(SoTietVuotGio) AS TongSoTietVuotGio
FROM 
    Final
GROUP BY 
    Khoa;

        `;

      // Xây dựng tham số
      const paramsVuotGio = [];

      paramsVuotGio.push(namhoc || "ALL"); // Thêm kiểm tra cho trường hợp null
      paramsVuotGio.push(namhoc || "ALL"); // NamHoc ở subquery giuaky
      paramsVuotGio.push(kihoc || "ALL"); // HocKy ở subquery giuaky
      paramsVuotGio.push(kihoc || "ALL"); // HocKy ở subquery giuaky
      paramsVuotGio.push(namhoc || "ALL"); // NamHoc ở giangday
      paramsVuotGio.push(namhoc || "ALL"); // NamHoc ở giangday
      paramsVuotGio.push(kihoc || "ALL"); // HocKy ở giangday
      paramsVuotGio.push(kihoc || "ALL"); // HocKy ở giangday

      // Thực thi câu truy vấn
      const [vuotGioData] = await connection.query(queryVuotGio, paramsVuotGio);
      console.log("Dữ liệu vượt giờ:", vuotGioData);
      console.log("Năm ", namhoc);
      // Combine the data
      const chartData = moiGiangData.map((item) => {
        const vuotGio = vuotGioData.find((v) => v.Khoa === item.Khoa) || {
          TongSoTietVuotGio: 0,
          TongSoTiet: 0,
        };
        const tongSoTietMoiGiang = parseFloat(item.TongSoTietMoiGiang).toFixed(
          1
        );
        const tongSoTietVuotGio = parseFloat(vuotGio.TongSoTietVuotGio).toFixed(
          1
        );
        const tongSoTiet = parseFloat(vuotGio.TongSoTiet).toFixed(1);
        const tongso = (
          parseFloat(tongSoTietMoiGiang) + parseFloat(tongSoTiet)
        ).toFixed(1);

        return {
          Khoa: item.Khoa,
          TongSoTietMoiGiang: tongSoTietMoiGiang,
          TongSoTietVuotGio: tongSoTietVuotGio,
          TongSoTiet: tongSoTiet,
          Tongso: tongso,
        };
      });

      console.log("Dữ liệu biểu đồ tổng hợp:", chartData);
      res.json(chartData);
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu biểu đồ tổng hợp:", error);
      res
        .status(500)
        .json({ success: false, message: "Lỗi máy chủ", error: error.message });
    } finally {
      if (connection) connection.release();
    }
  },

  getNamHocData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [namHoc] = await connection.query(
        "SELECT DISTINCT namhoc as NamHoc FROM hopdonggvmoi ORDER BY namhoc DESC"
      );
      const [ki] = await connection.query(
        "SELECT DISTINCT kihoc as Ki, kihoc as value FROM hopdonggvmoi ORDER BY kihoc"
      );

      res.json({
        success: true,
        NamHoc: namHoc,
        Ki: ki,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu năm học:", error);
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    } finally {
      if (connection) connection.release();
    }
  },
};

module.exports = thongketonghopController;
