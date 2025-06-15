const createConnection = require("../config/databasePool");

const thongkevuotgioController = {
  showThongkevuotgioPage: (req, res) => {
    res.render("thongkevuotgio");
  },

  getThongkevuotgioData: async (req, res) => {
    let connection;
    const { namhoc, khoa, hedaotao, type } = req.query;
    const thongkeType = type || "khoa"; // mặc định là theo khoa

    try {
      connection = await createConnection();
      let query;
      const params = [];

      if (thongkeType === "hedaotao") {
        if (!hedaotao || hedaotao === "ALL") {
          // Query khi chọn tất cả hệ đào tạo
          query = `
                    WITH final AS (
                        SELECT 
                            gd.he_dao_tao as HeDaoTao,
                            gd.GiangVien AS GiangVien,
                            SUM(gd.QuyChuan) AS SoTietGiangDay,
                            SUM(COALESCE(gk.TotalSoTietKT, 0)) AS SoTietKTGK,
                            SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) AS TongSoTiet,
                            nv.HocVi AS HocVi,
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
                                ${
                                  namhoc && namhoc !== "ALL"
                                    ? "WHERE NamHoc = ?"
                                    : ""
                                }
                                GROUP BY id_User
                            ) gk 
                        ON gd.id_User = gk.id_User
                        LEFT JOIN 
                            nhanvien nv ON gd.id_User = nv.id_User
                        WHERE 
                            ${
                              namhoc && namhoc !== "ALL"
                                ? "gd.NamHoc = ? AND"
                                : ""
                            } 
                            gd.id_User != 1
                        GROUP BY 
                            gd.he_dao_tao, gd.GiangVien, nv.HocVi, nv.PhanTramMienGiam
                    )
                    SELECT 
                        HeDaoTao AS HeDaoTao, 
                        SUM(SoTietGiangDay) AS SoTietGiangDay,
                        SUM(TongSoTiet) AS TongSoTiet,
                        SUM(SoTietVuotGio) AS SoTietVuotGio,
                        COUNT(DISTINCT GiangVien) AS SoLuongGiangVien
                    FROM final
                    GROUP BY HeDaoTao 
                    ORDER BY SoTietVuotGio DESC;
                `;
          if (namhoc && namhoc !== "ALL") {
            params.push(namhoc, namhoc);
          }
        } else {
          // Query khi chọn một hệ đào tạo cụ thể
          query = `
                    SELECT 
                        gd.id_User AS id,                      
                        gd.GiangVien AS GiangVien,
                        nv.HocVi AS HocVi,
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
                            ${
                              namhoc && namhoc !== "ALL"
                                ? "WHERE NamHoc = ?"
                                : ""
                            }
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
                        ${
                          namhoc && namhoc !== "ALL" ? "gd.NamHoc = ? AND" : ""
                        } 
                        gd.he_dao_tao = ? 
                        AND gd.id_User != 1
                    GROUP BY 
                        gd.id_User, 
                        gd.GiangVien,
                        nv.HocVi
                    ORDER BY 
                        TongSoTiet DESC;
                `;
          if (namhoc && namhoc !== "ALL") {
            params.push(namhoc, namhoc);
          }
          params.push(hedaotao);
        }
      } else {
        if (khoa !== "ALL") {
          // Query khi chọn một khoa cụ thể
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
                            ${
                              namhoc && namhoc !== "ALL"
                                ? "WHERE NamHoc = ?"
                                : ""
                            }
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
                        ${
                          namhoc && namhoc !== "ALL" ? "gd.NamHoc = ? AND" : ""
                        } 
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
          // Query cho tất cả khoa
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
                                ${
                                  namhoc && namhoc !== "ALL"
                                    ? "WHERE NamHoc = ?"
                                    : ""
                                }
                                GROUP BY id_User
                            ) gk 
                        ON gd.id_User = gk.id_User
                        LEFT JOIN 
                            nhanvien nv ON gd.id_User = nv.id_User
                        WHERE 
                            ${
                              namhoc && namhoc !== "ALL"
                                ? "gd.NamHoc = ? AND"
                                : ""
                            } 
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

      // Lấy danh sách năm học
      const [namHoc] = await connection.query(
        "SELECT DISTINCT NamHoc as NamHoc FROM giangday ORDER BY NamHoc DESC"
      );

      const maxNamHoc = namHoc.length > 0 ? namHoc[0].NamHoc : "ALL"; // Lấy năm học lớn nhất

      // Thêm "Tất cả năm" vào đầu danh sách
      namHoc.unshift({ NamHoc: "ALL" });

      res.json({
        success: true,
        NamHoc: namHoc,
        MaxNamHoc: maxNamHoc, // Trả về năm học lớn nhất
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu năm học:", error);
      res.status(500).json({ success: false, message: "Lỗi máy chủ" });
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

  getHeDaoTaoVG: async (req, res) => {
    try {
      const connection = await createConnection();
      // Lấy hệ đào tạo từ bảng giangday
      const [heDaoTao] = await connection.query(`
          SELECT DISTINCT he_dao_tao AS HeDaoTao
          FROM giangday
          WHERE he_dao_tao IS NOT NULL
          ORDER BY he_dao_tao
      `);

      connection.release();
      res.json({
        success: true,
        HeDaoTao: heDaoTao,
      });
    } catch (error) {
      console.error("Lỗi khi lấy dữ liệu hệ đào tạo:", error);
      res.status(500).json({
        success: false,
        message: "Lỗi server",
      });
    }
  },
};

module.exports = thongkevuotgioController;
