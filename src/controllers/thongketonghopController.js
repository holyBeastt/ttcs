const pool = require("../config/Pool");

const thongketonghopController = {
  getChartData: async (req, res) => {
    const { namhoc, kihoc, khoa, hedaotao, type } = req.query;
    const thongkeType = type || "khoa"; // mặc định là theo khoa

    try {

      if (thongkeType === "hedaotao") {
        // Query cho thống kê theo hệ đào tạo
        let query = `
          WITH Final AS (
            SELECT 
              gd.he_dao_tao,
              SUM(gd.quychuan) AS TongSoTietMoiGiang,
              SUM(COALESCE(gk.TotalSoTietKT, 0)) AS SoTietKTGK,
              SUM(gd.quychuan + COALESCE(gk.TotalSoTietKT, 0)) AS TongSoTiet,
              GREATEST(
                0, 
                SUM(gd.quychuan + COALESCE(gk.TotalSoTietKT, 0)) - 
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
              gd.he_dao_tao
          )
          SELECT 
            he_dao_tao AS Khoa,
            TongSoTietMoiGiang,
            TongSoTiet,
            SoTietVuotGio,
            (TongSoTietMoiGiang + TongSoTiet) AS Tongso
          FROM 
            Final
          ORDER BY 
            TongSoTiet DESC;
        `;

        const params = [];
        params.push(namhoc || "ALL");
        params.push(namhoc || "ALL");
        params.push(kihoc || "ALL");
        params.push(kihoc || "ALL");
        params.push(namhoc || "ALL");
        params.push(namhoc || "ALL");
        params.push(kihoc || "ALL");
        params.push(kihoc || "ALL");

        const [result] = await pool.query(query, params);
        res.json(result);
      } else {
        // Query cho thống kê theo khoa (giữ nguyên code cũ)
        let query = `
          SELECT 
            Khoa AS Khoa,
            SUM(quychuan) AS TongSoTietMoiGiang
          FROM giangday
          WHERE id_Gvm != 1
        `;
        const params = [];

        if (namhoc && namhoc !== "ALL") {
          query += ` AND NamHoc = ?`;
          params.push(namhoc);
        }
        if (kihoc && kihoc !== "ALL") {
          query += ` AND HocKy = ?`;
          params.push(kihoc);
        }

        query += ` GROUP BY Khoa`;

        const [moiGiangData] = await pool.query(query, params);

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

        const paramsVuotGio = [];
        paramsVuotGio.push(namhoc || "ALL");
        paramsVuotGio.push(namhoc || "ALL");
        paramsVuotGio.push(kihoc || "ALL");
        paramsVuotGio.push(kihoc || "ALL");
        paramsVuotGio.push(namhoc || "ALL");
        paramsVuotGio.push(namhoc || "ALL");
        paramsVuotGio.push(kihoc || "ALL");
        paramsVuotGio.push(kihoc || "ALL");

        const [vuotGioData] = await pool.query(
          queryVuotGio,
          paramsVuotGio
        );

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
          const tongSoTietVuotGio = parseFloat(
            vuotGio.TongSoTietVuotGio
          ).toFixed(1);
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

        res.json(chartData);
      }
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu biểu đồ tổng hợp:", error);
      res
        .status(500)
        .json({ success: false, message: "Lỗi máy chủ", error: error.message });
    }
  },

  getNamHocData: async (req, res) => {
    try {

      // Lấy danh sách năm học
      const [namHoc] = await pool.query(
        "SELECT DISTINCT namhoc as NamHoc FROM hopdonggvmoi ORDER BY namhoc DESC"
      );

      // Lấy danh sách kỳ
      const [ki] = await pool.query(
        "SELECT DISTINCT kihoc as Ki FROM hopdonggvmoi ORDER BY kihoc"
      );

      const maxNamHoc = namHoc.length > 0 ? namHoc[0].NamHoc : "ALL";

      namHoc.unshift({ NamHoc: "ALL" });
      ki.unshift({ Ki: "ALL" });

      res.json({
        success: true,
        NamHoc: namHoc,
        Ki: ki,
        MaxNamHoc: maxNamHoc,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu năm học:", error);
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
  },

  // getPhongBanTH: async (req, res) => { // Removed
  //   let connection;
  //   try {
  //     connection = await createConnection();
  //     const [phongBan] = await connection.query(
  //       "SELECT DISTINCT Khoa as MaPhongBan FROM giangday ORDER BY Khoa"
  //     );

  //     const uniquePhongBan = Array.from(
  //       new Set(phongBan.map((item) => item.MaPhongBan))
  //     ).map((maPB) => ({ MaPhongBan: maPB }));

  //     res.json({
  //       success: true,
  //       MaPhongBan: uniquePhongBan,
  //     });
  //   } catch (error) {
  //     console.error("Lỗi khi lấy dữ liệu phòng ban:", error);
  //     res.status(500).json({
  //       success: false,
  //       message: "Lỗi server",
  //     });
  //   } finally {
  //     if (connection) connection.release();
  //   }
  // },

  // getHeDaoTaoTH: async (req, res) => { // Removed
  //   let connection;
  //   try {
  //     connection = await createConnection();
  //     const [hedaotao] = await connection.query(
  //       "SELECT DISTINCT he_dao_tao as HeDaoTao FROM giangday ORDER BY he_dao_tao"
  //     );
  //     res.json({
  //       success: true,
  //       HeDaoTao: hedaotao,
  //     });
  //   } catch (error) {
  //     res.json({ success: false });
  //   } finally {
  //     if (connection) connection.release();
  //   }
  // },
};

module.exports = thongketonghopController;
