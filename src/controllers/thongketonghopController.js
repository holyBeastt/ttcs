const createConnection = require("../config/databasePool");

const thongketonghopController = {
  getChartData: async (req, res) => {
    let connection;
    const { namhoc, kihoc } = req.query; // Get filters from query parameters

    try {
      connection = await createConnection();

      // Base query for "Mời giảng"
      let query = `
                SELECT 
                    Khoa AS Khoa,
                    SUM(quychuan) AS TongSoTietMoiGiang
                FROM giangday
                WHERE id_Gvm != 1
            `;
      const params = [];

      // Add filters based on the provided parameters
      if (namhoc && namhoc !== "ALL") {
        query += ` AND NamHoc = ?`;
        params.push(namhoc);
      }
      if (kihoc && kihoc !== "ALL") {
        query += ` AND HocKy = ?`;
        params.push(kihoc);
      }

      query += ` GROUP BY Khoa`;

      // Execute the query
      const [moiGiangData] = await connection.query(query, params);
      // console.log("Dữ liệu mời giảng:", moiGiangData);

      // Query for "Vượt giờ"
      let queryVuotGio = `
            WITH Final AS (
    SELECT 
        gd.Khoa,
        gd.GiangVien AS GiangVien,
        SUM(gd.QuyChuan) AS SoTietGiangDay,
        SUM(COALESCE(gk.TotalSoTietKT, 0)) AS SoTietKTGK,
        SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) AS TongSoTiet,
        nv.ChucVu AS ChucVu,
        nv.PhanTramMienGiam AS PhanTramMienGiam,
        GREATEST(
            0, 
            SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) - 
            (300 * ((100 - COALESCE(nv.PhanTramMienGiam, 0)) / 100))
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
        gd.Khoa, gd.GiangVien, nv.ChucVu, nv.PhanTramMienGiam
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

      // Build parameters for the query
      const paramsVuotGio = [];

      paramsVuotGio.push(namhoc || "ALL"); // NamHoc in subquery giuaky
      paramsVuotGio.push(namhoc || "ALL"); // NamHoc in subquery giuaky
      paramsVuotGio.push(kihoc || "ALL"); // HocKy in subquery giuaky
      paramsVuotGio.push(kihoc || "ALL"); // HocKy in subquery giuaky
      paramsVuotGio.push(namhoc || "ALL"); // NamHoc in giangday
      paramsVuotGio.push(namhoc || "ALL"); // NamHoc in giangday
      paramsVuotGio.push(kihoc || "ALL"); // HocKy in giangday
      paramsVuotGio.push(kihoc || "ALL"); // HocKy in giangday

      // Execute the query
      const [vuotGioData] = await connection.query(queryVuotGio, paramsVuotGio);
      // console.log("Dữ liệu vượt giờ:", vuotGioData);

      // Combine the data
      const allKhoa = new Set([
        ...moiGiangData.map((item) => item.Khoa),
        ...vuotGioData.map((item) => item.Khoa),
      ]);

      const chartData = Array.from(allKhoa).map((khoa) => {
        const moiGiang = moiGiangData.find((item) => item.Khoa === khoa) || {
          TongSoTietMoiGiang: 0,
        };
        const vuotGio = vuotGioData.find((item) => item.Khoa === khoa) || {
          TongSoTietVuotGio: 0,
          TongSoTiet: 0,
        };

        const tongSoTietMoiGiang = parseFloat(
          moiGiang.TongSoTietMoiGiang
        ).toFixed(1);
        const tongSoTietVuotGio = parseFloat(vuotGio.TongSoTietVuotGio).toFixed(
          1
        );
        const tongSoTiet = parseFloat(vuotGio.TongSoTiet).toFixed(1);
        const tongso = (
          parseFloat(tongSoTietMoiGiang) + parseFloat(tongSoTiet)
        ).toFixed(1);

        return {
          Khoa: khoa,
          TongSoTietMoiGiang: tongSoTietMoiGiang,
          TongSoTietVuotGio: tongSoTietVuotGio,
          TongSoTiet: tongSoTiet,
          Tongso: tongso,
        };
      });

      // console.log("Dữ liệu biểu đồ tổng hợp:", chartData);
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

      // Lấy danh sách năm học
      const [namHoc] = await connection.query(
        "SELECT DISTINCT namhoc as NamHoc FROM hopdonggvmoi ORDER BY namhoc DESC"
      );

      // Lấy danh sách kỳ
      const [ki] = await connection.query(
        "SELECT DISTINCT kihoc as Ki FROM hopdonggvmoi ORDER BY kihoc"
      );

      const maxNamHoc = namHoc.length > 0 ? namHoc[0].NamHoc : "ALL"; // Lấy năm học lớn nhất

      // Thêm "Tất cả năm" và "Cả năm" vào đầu danh sách
      namHoc.unshift({ NamHoc: "ALL" });
      ki.unshift({ Ki: "ALL" });

      res.json({
        success: true,
        NamHoc: namHoc,
        Ki: ki,
        MaxNamHoc: maxNamHoc, // Trả về năm học lớn nhất
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
