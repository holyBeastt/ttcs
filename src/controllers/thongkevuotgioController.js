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
                    gd.id_User AS id,                      
                    gd.GiangVien AS GiangVien,
                    SUM(gd.QuyChuan) AS SoTietGiangDay,
                    SUM(COALESCE(gk.TotalSoTietKT, 0)) AS SoTietKTGK,
                    SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) AS TongSoTiet,
                    nv.PhanTramMienGiam AS PhanTramMienGiam,
                    (300 * ((100 - COALESCE(nv.PhanTramMienGiam, 0)) / 100)) AS STPHT,
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
                        ${namhoc && namhoc !== "ALL" ? "WHERE NamHoc = ?" : ""}
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
                    ${namhoc && namhoc !== "ALL" ? "gd.NamHoc = ? AND" : ""} 
                    gd.Khoa = ? 
                    AND gd.id_User != 1
                GROUP BY 
                    gd.id_User, 
                    gd.GiangVien
                ORDER BY 
                    TongSoTiet DESC;
            `;
            if (namhoc && namhoc !== "ALL") {
                params.push(namhoc, namhoc);
            }
            params.push(khoa);
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
                        nv.PhanTramMienGiam AS PhanTramMienGiam,
                        (300 * ((100 - COALESCE(nv.PhanTramMienGiam, 0)) / 100)) AS STPHT,
                        GREATEST(
                            0, 
                            SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) - 
                            (300 * ((100 - COALESCE(nv.PhanTramMienGiam, 0)) / 100))
                        ) AS SoTietVuotGio
                    FROM 
                        giangday gd 
                    LEFT JOIN 
                        (
                            SELECT id_User, SUM(COALESCE(SoTietKT, 0)) AS TotalSoTietKT
                            FROM giuaky
                            ${namhoc && namhoc !== "ALL" ? "WHERE NamHoc = ?" : ""}
                            GROUP BY id_User
                        ) gk 
                    ON gd.id_User = gk.id_User
                    LEFT JOIN 
                        nhanvien nv ON gd.id_User = nv.id_User
                    WHERE 
                        ${namhoc && namhoc !== "ALL" ? "gd.NamHoc = ? AND" : ""} 
                        gd.id_User != 1
                    GROUP BY 
                        gd.Khoa, gd.GiangVien, nv.ChucVu, nv.PhanTramMienGiam
                )
                SELECT 
                    Khoa AS Khoa, 
                    SUM(TongSoTiet) AS TongSoTietall,
                    SUM(SoTietVuotGio) AS SoTietVuotGio,
                    COUNT(DISTINCT GiangVien) AS SoLuongGiangVien
                FROM final
                GROUP BY Khoa 
                ORDER BY SoTietVuotGio DESC;
            `;
            if (namhoc && namhoc !== "ALL") {
                params.push(namhoc, namhoc);
            }
        }

        console.log("Executing query with params:", params);
        const [result] = await connection.query(query, params);
        console.log("Query result:", result);

        if (result.length === 0) {
            console.log("No data found for the query.");
            return res.json([]);
        }

        const finalResult = result.map((item) => ({
            ...item,
            TongSoTiet: (
                parseFloat(item.SoTietGiangDay || 0) +
                parseFloat(item.SoTietKTGK || 0)
            ).toFixed(2),
            SoTietVuotGio: parseFloat(item.SoTietVuotGio || 0).toFixed(2),
            STPHT: parseFloat(item.STPHT || 0).toFixed(2),
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

  getNamHocData: async (req, res) => {
    let connection;
    try {
      connection = await createConnection();
      const [namHoc] = await connection.query(
        "SELECT DISTINCT namhoc as NamHoc FROM giangday ORDER BY namhoc DESC"
      );

      // Thêm option "Tất cả năm" vào đầu mảng kết quả
      const allYearsOption = { NamHoc: "ALL" };
      namHoc.unshift(allYearsOption);

      res.json({
        success: true,
        NamHoc: namHoc,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    } finally {
      if (connection) connection.release();
    }
  },

  getPhongBanVG: async (req, res) => {
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
        MaPhongBan: phongBan,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu phòng ban:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  },
};

module.exports = thongkevuotgioController;
