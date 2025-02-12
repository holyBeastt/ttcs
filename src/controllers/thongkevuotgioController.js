const createConnection = require("../config/databasePool");

const thongkevuotgioController = {
  showThongkevuotgioPage: (req, res) => {
    res.render("thongkevuotgio");
  },

  getThongkevuotgioData: async (req, res) => {
    let connection;
    const { namhoc, khoa } = req.query;

    try {
      connection = await createConnection();
      let query;
      const params = [];

      console.log("Received query parameters:", req.query);

      if (khoa !== "ALL") {
        // Query when selecting specific department
        query = `
                    SELECT 
                      gd.GiangVien AS GiangVien,
                      SUM(gd.QuyChuan) AS SoTietGiangDay,
                      SUM(COALESCE(gk.TotalSoTietKT, 0)) AS SoTietKTGK,
                      SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) AS TongSoTiet,
                      nv.ChucVu AS ChucVu,
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
                      END AS STPHT,
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
                              NamHoc = ? 
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
                      gd.NamHoc = ? 
                      AND gd.Khoa = ? 
                      AND gd.id_User != 1
                  GROUP BY 
                      gd.GiangVien, nv.ChucVu -- Thêm nv.ChucVu vào GROUP BY
                  ORDER BY 
                      TongSoTiet DESC;

                `;
        params.push(namhoc, namhoc, khoa);
      } else {
        // Query for all departments
        query = `
                    WITH final AS (
                    SELECT 
                        gd.Khoa,
                        gd.GiangVien AS GiangVien,
                        SUM(gd.QuyChuan) AS SoTietGiangDay,
                        SUM(COALESCE(gk.TotalSoTietKT, 0)) AS SoTietKTGK,
                        SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) AS TongSoTiet,
                        nv.ChucVu AS ChucVu,
                        COUNT(DISTINCT gd.id_User) AS SoLuongGiangVien,
                        GREATEST(0, (SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) - 
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
                        END)) AS SoTietVuotGio
                    FROM 
                        giangday gd 
                    LEFT JOIN 
                        (SELECT id_User, SUM(COALESCE(SoTietKT, 0)) AS TotalSoTietKT
                        FROM giuaky
                        WHERE NamHoc = ? 
                        GROUP BY id_User) gk 
                    ON gd.id_User = gk.id_User
                    LEFT JOIN 
                        nhanvien nv ON gd.id_User = nv.id_User
                    WHERE 
                        gd.NamHoc = ? AND gd.id_User != 1
                    GROUP BY 
                        gd.Khoa, gd.GiangVien, nv.ChucVu
                )
                SELECT 
                    Khoa AS Khoa, 
                    SUM(SoTietVuotGio) AS SoTietVuotGio,
                    SUM(SoLuongGiangVien) AS SoLuongGiangVien
                FROM final
                GROUP BY Khoa 
                ORDER BY SoTietVuotGio DESC;
                `;
        params.push(namhoc, namhoc);
      }

      // Add parameters for the query
      if (namhoc) {
        params.push(namhoc);
      }

      const [result] = await connection.query(query, params);

      // Check if result is empty
      if (result.length === 0) {
        console.log("No data found for the query.");
        return res.json([
          { message: "Không có dữ liệu cho khoảng thời gian này" },
        ]); // Return message if no data found
      }

      // Calculate total hours for each lecturer
      const finalResult = result.map((item) => ({
        ...item,

        TongSoTiet: (
          parseFloat(item.SoTietGiangDay) + parseFloat(item.SoTietKTGK || 0)
        ) // Bao gồm SoTietKTGK
          .toFixed(2), // Cột "Tổng số tiết"
      }));

      res.json(finalResult);
    } catch (err) {
      console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
      res
        .status(500)
        .json({ success: false, message: "Lỗi máy chủ", error: err.message });
    } finally {
      if (connection) connection.release();
    }
  },

  getFilterOptions: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const query = `
                SELECT DISTINCT NamHoc, Khoa 
                FROM giangday 
                ORDER BY NamHoc DESC;
            `;
      const [result] = await connection.query(query);
      res.json(result);
    } catch (err) {
      console.error("Lỗi khi lấy dữ liệu filter:", err);
      res.status(500).send("Lỗi máy chủ");
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
                Ki: ki
            });
  } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      res.status(500).json({
          success: false,
          message: "Lỗi server"
      });
  } finally {
        if (connection) connection.release();
    }
  },

  getPhongBanVG: async (req, res)=>{
    try {
      const connection = await createConnection();
      // Lấy khoa từ các bảng giangday, giuaky
      const [phongBan] = await connection.query(`
          SELECT DISTINCT khoa as MaPhongBan 
          FROM (
              SELECT DISTINCT khoa FROM giangday
              UNION
              SELECT DISTINCT khoa FROM giuaky
          ) AS combined_tables 
          ORDER BY khoa
      `);
      
      connection.release();
      res.json({
          success: true,
          MaPhongBan: phongBan
      });
  } catch (error) {
      console.error("Lỗi khi lấy dữ liệu phòng ban:", error);
      res.status(500).json({
          success: false,
          message: "Lỗi server"
      });
  }
  },
};

module.exports = thongkevuotgioController;
