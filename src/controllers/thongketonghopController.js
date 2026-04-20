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

  getDetailedStatsV2: async (req, res) => {
    const { namhoc, khoa } = req.query;
    try {
      // 1. Get all training systems
      const [heRows] = await pool.query("SELECT he_dao_tao FROM he_dao_tao WHERE loai_hinh = 'mời giảng' ORDER BY id");
      const allHe = heRows.map(h => h.he_dao_tao);

      // 2. Get teaching data grouped by Khoa
      const query = `
        SELECT 
          g.HocKy,
          g.Khoa,
          h.he_dao_tao AS HeDaoTao,
          SUM(CASE WHEN g.id_User = 1 THEN g.quychuan ELSE 0 END) AS mg_tiet,
          SUM(CASE WHEN g.id_Gvm = 1 THEN g.quychuan ELSE 0 END) AS ch_tiet
        FROM giangday g
        LEFT JOIN he_dao_tao h ON g.he_dao_tao = h.id
        WHERE (? = 'ALL' OR g.NamHoc = ?)
          AND (? = 'ALL' OR g.Khoa = ?)
        GROUP BY g.HocKy, g.Khoa, h.he_dao_tao
        ORDER BY g.HocKy, g.Khoa, h.he_dao_tao
      `;
      const params = [
        namhoc || "ALL", namhoc || "ALL",
        khoa || "ALL", khoa || "ALL"
      ];

      const [rows] = await pool.query(query, params);

      // 3. Structure data: semesters -> lecturerType -> [ {khoa, systems: {he: tiet}} ]
      const semesters = {};
      const foundSemesters = [...new Set(rows.map(r => r.HocKy))];

      foundSemesters.forEach(ki => {
        semesters[ki] = {
          mg: {}, // { khoaName: { heName: tiet } }
          ch: {}
        };
      });

      rows.forEach(row => {
        if (row.HocKy && semesters[row.HocKy]) {
          const sem = semesters[row.HocKy];

          if (!sem.mg[row.Khoa]) sem.mg[row.Khoa] = {};
          if (!sem.ch[row.Khoa]) sem.ch[row.Khoa] = {};

          sem.mg[row.Khoa][row.HeDaoTao] = parseFloat(row.mg_tiet || 0);
          sem.ch[row.Khoa][row.HeDaoTao] = parseFloat(row.ch_tiet || 0);
        }
      });

      res.json({ success: true, semesters, allHe });
    } catch (error) {
      console.error("Lỗi khi lấy chi tiết thống kê:", error);
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
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
    const ExcelJS = require("exceljs");

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

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Thống kê tổng hợp");

      // Set columns
      worksheet.columns = [
        { header: "Khoa", key: "khoa", width: 35 },
        { header: "KÌ 1", key: "ki1_mg_dhp", width: 15 },
        { header: "", key: "ki1_mg_khac", width: 15 },
        { header: "", key: "ki1_tong_mg", width: 15 },
        { header: "", key: "ki1_gd_dhp", width: 15 },
        { header: "", key: "ki1_gd_khac", width: 15 },
        { header: "", key: "ki1_tong_tiet", width: 18 },
        { header: "KÌ 2", key: "ki2_mg_dhp", width: 15 },
        { header: "", key: "ki2_mg_khac", width: 15 },
        { header: "", key: "ki2_tong_mg", width: 15 },
        { header: "", key: "ki2_gd_dhp", width: 15 },
        { header: "", key: "ki2_gd_khac", width: 15 },
        { header: "", key: "ki2_tong_tiet", width: 18 },
      ];

      // Styling helpers
      const titleStyle = { font: { bold: true, size: 18, color: { argb: 'FF000080' } } };
      const subTitleStyle = { font: { italic: true, size: 12, color: { argb: 'FF555555' } } };
      const headerStyle = {
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } },
        font: { bold: true, size: 11 },
        alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
        border: {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
      };

      // Add Title
      const titleRow = worksheet.addRow(["THỐNG KÊ TỔNG HỢP GIẢNG DẠY"]);
      worksheet.mergeCells('A1:M1');
      titleRow.getCell(1).style = titleStyle;
      titleRow.getCell(1).alignment = { horizontal: 'center' };
      titleRow.height = 30;

      // Add Subtitle
      const subTitleRow = worksheet.addRow([`Năm học: ${namhoc || 'Tất cả'}, Hệ đào tạo: ${hedaotao || 'Tất cả'}`]);
      worksheet.mergeCells('A2:M2');
      subTitleRow.getCell(1).style = subTitleStyle;
      subTitleRow.getCell(1).alignment = { horizontal: 'center' };

      worksheet.addRow([]); // Blank line

      // Complex Header Rows
      const h1 = ["Khoa", "KÌ 1", "", "", "", "", "", "KÌ 2", "", "", "", "", ""];
      const h2 = ["", "Mời giảng", "", "", "Cơ hữu", "", "Tổng tiết kì 1", "Mời giảng", "", "", "Cơ hữu", "", "Tổng tiết kì 2"];
      const h3 = ["", "Hệ đóng HP", "Hệ khác", "Tổng MG", "Hệ đóng HP", "Hệ khác", "", "Hệ đóng HP", "Hệ khác", "Tổng MG", "Hệ đóng HP", "Hệ khác", ""];

      const row4 = worksheet.addRow(h1);
      const row5 = worksheet.addRow(h2);
      const row6 = worksheet.addRow(h3);

      // Merge cells for professional header
      worksheet.mergeCells('A4:A6'); // Khoa
      worksheet.mergeCells('B4:G4'); // KÌ 1
      worksheet.mergeCells('H4:M4'); // KÌ 2
      worksheet.mergeCells('B5:D5'); // Ki 1 MG
      worksheet.mergeCells('E5:F5'); // Ki 1 CH
      worksheet.mergeCells('G5:G6'); // Ki 1 Total
      worksheet.mergeCells('H5:J5'); // Ki 2 MG
      worksheet.mergeCells('K5:L5'); // Ki 2 CH
      worksheet.mergeCells('M5:M6'); // Ki 2 Total

      [row4, row5, row6].forEach(row => {
        row.eachCell(cell => {
          cell.style = headerStyle;
        });
      });

      // Data rows
      const sortedKhoas = Object.keys(pivotMap).sort();
      const totals = {
        ki1: { mg_dhp: 0, mg_khac: 0, tong_mg: 0, gd_dhp: 0, gd_khac: 0, tong_tiet: 0 },
        ki2: { mg_dhp: 0, mg_khac: 0, tong_mg: 0, gd_dhp: 0, gd_khac: 0, tong_tiet: 0 }
      };

      sortedKhoas.forEach(khoa => {
        const d = pivotMap[khoa];
        const dataRow = [
          khoa,
          d.ki1.mg_dhp, d.ki1.mg_khac, d.ki1.tong_mg, d.ki1.gd_dhp, d.ki1.gd_khac, d.ki1.tong_tiet,
          d.ki2.mg_dhp, d.ki2.mg_khac, d.ki2.tong_mg, d.ki2.gd_dhp, d.ki2.gd_khac, d.ki2.tong_tiet
        ];
        const row = worksheet.addRow(dataRow);
        row.eachCell((cell, colNumber) => {
          cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          if (colNumber > 1) {
            cell.alignment = { horizontal: 'center' };
            cell.numFmt = '#,##0.00';
          }
          if (colNumber === 7 || colNumber === 13) {
            cell.font = { bold: true };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
          }
        });

        ['ki1', 'ki2'].forEach(ki => {
          Object.keys(totals[ki]).forEach(key => {
            totals[ki][key] += d[ki][key];
          });
        });
      });

      // Totals row
      const totalRowData = [
        "TỔNG CỘNG",
        totals.ki1.mg_dhp, totals.ki1.mg_khac, totals.ki1.tong_mg, totals.ki1.gd_dhp, totals.ki1.gd_khac, totals.ki1.tong_tiet,
        totals.ki2.mg_dhp, totals.ki2.mg_khac, totals.ki2.tong_mg, totals.ki2.gd_dhp, totals.ki2.gd_khac, totals.ki2.tong_tiet
      ];
      const tRow = worksheet.addRow(totalRowData);
      tRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true };
        cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF99' } }; // Light yellow
        if (colNumber > 1) {
          cell.alignment = { horizontal: 'center' };
          cell.numFmt = '#,##0.00';
        }
      });

      // Annual total row
      const yearlyTotal = totals.ki1.tong_tiet + totals.ki2.tong_tiet;
      const annualRowData = ["TỔNG TIẾT CẢ NĂM", "", "", "", "", "", "", "", "", "", "", "", yearlyTotal];
      const aRow = worksheet.addRow(annualRowData);
      const startRow = aRow.number;
      worksheet.mergeCells(`A${startRow}:L${startRow}`);
      const labelCell = aRow.getCell(1);
      const valueCell = aRow.getCell(13);

      [labelCell, valueCell].forEach(cell => {
        cell.style = {
          font: { bold: true, size: 14, color: { argb: 'FFFFFFFF' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFED7D31' } }, // Orange
          alignment: { horizontal: 'center', vertical: 'middle' },
          border: { top: { style: 'medium' }, left: { style: 'medium' }, bottom: { style: 'medium' }, right: { style: 'medium' } }
        };
      });
      valueCell.numFmt = '#,##0.00';
      aRow.height = 25;

      res.setHeader("Content-Disposition", "attachment; filename=ThongKeTongHop.xlsx");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      await workbook.xlsx.write(res);
      res.end();

    } catch (error) {
      console.error("Lỗi khi xuất file Excel:", error);
      res.status(500).send("Lỗi khi xuất file Excel");
    }
  }
};

module.exports = thongketonghopController;
