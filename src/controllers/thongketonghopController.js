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
                (300 * ((100 - COALESCE(MAX(nv.PhanTramMienGiam), 0)) / 100))
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
  getGeneralStatsV2: async (req, res) => {
    const { namhoc, khoa, hedaotao } = req.query;

    try {
      let query = `
        SELECT 
          Khoa,
          HocKy,
          SUM(CASE WHEN id_User = 1 AND he_dao_tao = 1 THEN quychuan ELSE 0 END) AS mg_dhp,
          SUM(CASE WHEN id_User = 1 AND he_dao_tao != 1 THEN quychuan ELSE 0 END) AS mg_khac,
          SUM(CASE WHEN id_User = 1 THEN quychuan ELSE 0 END) AS tong_mg,
          SUM(CASE WHEN id_Gvm = 1 AND he_dao_tao = 1 THEN quychuan ELSE 0 END) AS gd_dhp,
          SUM(CASE WHEN id_Gvm = 1 AND he_dao_tao != 1 THEN quychuan ELSE 0 END) AS gd_khac,
          SUM(quychuan) AS tong_tiet
        FROM giangday
        WHERE (? = 'ALL' OR NamHoc = ?)
          AND (? = 'ALL' OR he_dao_tao = ?)
          AND (? = 'ALL' OR Khoa = ?)
        GROUP BY Khoa, HocKy
        ORDER BY Khoa, HocKy
      `;

      const params = [
        namhoc || "ALL", namhoc || "ALL",
        hedaotao || "ALL", hedaotao || "ALL",
        khoa || "ALL", khoa || "ALL"
      ];

      const [rows] = await pool.query(query, params);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu thống kê tổng hợp V2:", error);
      res.status(500).json({ success: false, message: "Lỗi máy chủ", error: error.message });
    }
  },

  getFiltersV2: async (req, res) => {
    try {
      const [namhocRows] = await pool.query("SELECT * FROM namhoc ORDER BY trangthai DESC, NamHoc ASC");
      const [hedaotaoRows] = await pool.query("SELECT DISTINCT id, he_dao_tao FROM he_dao_tao where loai_hinh = 'mời giảng'");
      const [phongbanRows] = await pool.query("SELECT MaPhongBan, TenPhongBan FROM phongban WHERE isKhoa = 1");

      res.json({
        success: true,
        namhoc: namhocRows,
        hedaotao: hedaotaoRows,
        phongban: phongbanRows
      });
    } catch (error) {
      console.error("Lỗi khi lấy filter:", error);
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    }
  },

  exportGeneralStatsV2: async (req, res) => {
    const { namhoc, khoa, hedaotao } = req.query;
    const XLSX = require("xlsx");

    try {
      let query = `
        SELECT 
          Khoa,
          HocKy,
          SUM(CASE WHEN id_User = 1 AND he_dao_tao = 1 THEN quychuan ELSE 0 END) AS mg_dhp,
          SUM(CASE WHEN id_User = 1 AND he_dao_tao != 1 THEN quychuan ELSE 0 END) AS mg_khac,
          SUM(CASE WHEN id_User = 1 THEN quychuan ELSE 0 END) AS tong_mg,
          SUM(CASE WHEN id_Gvm = 1 AND he_dao_tao = 1 THEN quychuan ELSE 0 END) AS gd_dhp,
          SUM(CASE WHEN id_Gvm = 1 AND he_dao_tao != 1 THEN quychuan ELSE 0 END) AS gd_khac,
          SUM(quychuan) AS tong_tiet
        FROM giangday
        WHERE (? = 'ALL' OR NamHoc = ?)
          AND (? = 'ALL' OR he_dao_tao = ?)
          AND (? = 'ALL' OR Khoa = ?)
        GROUP BY Khoa, HocKy
        ORDER BY Khoa, HocKy
      `;

      const params = [
        namhoc || "ALL", namhoc || "ALL",
        hedaotao || "ALL", hedaotao || "ALL",
        khoa || "ALL", khoa || "ALL"
      ];

      const [rows] = await pool.query(query, params);

      // Process data for pivot
      const pivotMap = {};
      rows.forEach(row => {
        if (!pivotMap[row.Khoa]) {
          pivotMap[row.Khoa] = {
            ki1: { mg_dhp: 0, mg_khac: 0, tong_mg: 0, gd_dhp: 0, gd_khac: 0, tong_tiet: 0 },
            ki2: { mg_dhp: 0, mg_khac: 0, tong_mg: 0, gd_dhp: 0, gd_khac: 0, tong_tiet: 0 }
          };
        }
        const kiKey = row.HocKy == 1 ? 'ki1' : 'ki2';
        pivotMap[row.Khoa][kiKey] = {
          mg_dhp: parseFloat(row.mg_dhp || 0),
          mg_khac: parseFloat(row.mg_khac || 0),
          tong_mg: parseFloat(row.tong_mg || 0),
          gd_dhp: parseFloat(row.gd_dhp || 0),
          gd_khac: parseFloat(row.gd_khac || 0),
          tong_tiet: parseFloat(row.tong_tiet || 0)
        };
      });

      const worksheetData = [
        ["THỐNG KÊ TỔNG HỢP GIẢNG DẠY"],
        [`Năm học: ${namhoc || 'Tất cả'}, Hệ đào tạo: ${hedaotao || 'Tất cả'}`],
        [],
        ["Khoa", "KÌ 1", "", "", "", "", "", "KÌ 2", "", "", "", "", ""],
        ["", "Mời giảng", "", "", "Cơ hữu", "", "Tổng tiết kì 1", "Mời giảng", "", "", "Cơ hữu", "", "Tổng tiết kì 2"],
        ["", "Hệ đóng HP", "Hệ khác", "Tổng MG", "Hệ đóng HP", "Hệ khác", "", "Hệ đóng HP", "Hệ khác", "Tổng MG", "Hệ đóng HP", "Hệ khác", ""],
      ];

      const sortedKhoas = Object.keys(pivotMap).sort();
      const totals = {
        ki1: { mg_dhp: 0, mg_khac: 0, tong_mg: 0, gd_dhp: 0, gd_khac: 0, tong_tiet: 0 },
        ki2: { mg_dhp: 0, mg_khac: 0, tong_mg: 0, gd_dhp: 0, gd_khac: 0, tong_tiet: 0 }
      };

      sortedKhoas.forEach(khoa => {
        const d = pivotMap[khoa];
        worksheetData.push([
          khoa,
          d.ki1.mg_dhp, d.ki1.mg_khac, d.ki1.tong_mg, d.ki1.gd_dhp, d.ki1.gd_khac, d.ki1.tong_tiet,
          d.ki2.mg_dhp, d.ki2.mg_khac, d.ki2.tong_mg, d.ki2.gd_dhp, d.ki2.gd_khac, d.ki2.tong_tiet
        ]);

        ['ki1', 'ki2'].forEach(ki => {
          Object.keys(totals[ki]).forEach(key => {
            totals[ki][key] += d[ki][key];
          });
        });
      });

      worksheetData.push([
        "TỔNG CỘNG",
        totals.ki1.mg_dhp, totals.ki1.mg_khac, totals.ki1.tong_mg, totals.ki1.gd_dhp, totals.ki1.gd_khac, totals.ki1.tong_tiet,
        totals.ki2.mg_dhp, totals.ki2.mg_khac, totals.ki2.tong_mg, totals.ki2.gd_dhp, totals.ki2.gd_khac, totals.ki2.tong_tiet
      ]);

      worksheetData.push([
        "TỔNG TIẾT CẢ NĂM", "", "", "", "", "", "", "", "", "", "", "",
        (totals.ki1.tong_tiet + totals.ki2.tong_tiet)
      ]);

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Thong Ke");

      worksheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 12 } },
        { s: { r: 3, c: 0 }, e: { r: 5, c: 0 } },
        { s: { r: 3, c: 1 }, e: { r: 3, c: 6 } },
        { s: { r: 3, c: 7 }, e: { r: 3, c: 12 } },
        { s: { r: 4, c: 1 }, e: { r: 4, c: 3 } },
        { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
        { s: { r: 4, c: 6 }, e: { r: 5, c: 6 } },
        { s: { r: 4, c: 7 }, e: { r: 4, c: 9 } },
        { s: { r: 4, c: 10 }, e: { r: 4, c: 11 } },
        { s: { r: 4, c: 12 }, e: { r: 5, c: 12 } },
        { s: { r: worksheetData.length - 1, c: 0 }, e: { r: worksheetData.length - 1, c: 11 } }, // Yearly Total label
      ];

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", "attachment; filename=ThongKeTongHop.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.send(buffer);

    } catch (error) {
      console.error("Lỗi khi xuất file Excel:", error);
      res.status(500).send("Lỗi khi xuất file Excel");
    }
  }
};

module.exports = thongketonghopController;
