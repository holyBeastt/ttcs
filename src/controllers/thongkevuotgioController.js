const createConnection = require("../config/databasePool");

const thongkevuotgioController = {
    showThongkevuotgioPage: (req, res) => {
        res.render("thongkevuotgio");
    },

    getThongkevuotgioData: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query;

        console.log("Nam hoc:", namhoc);
        console.log("Khoa:", khoa);

        try {
            connection = await createConnection();
            let query;
            const params = [];

            console.log("Received query parameters:", req.query);

            if (khoa !== 'ALL') {
                // Query when selecting all departments
                query = `
                    SELECT 
                        gd.GiangVien AS GiangVien,
                        SUM(gd.QuyChuan) AS SoTietGiangDay,
                        COALESCE(gk.TotalSoTietKT, 0) AS SoTietKTGK,
                        SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) AS TongSoTiet
                    FROM 
                        giangday gd 
                    LEFT JOIN 
                        (SELECT id_User, SUM(COALESCE(SoTietKT, 0)) AS TotalSoTietKT
                        FROM giuaky
                        WHERE NamHoc = ?
                        GROUP BY id_User) gk 
                    ON gd.id_User = gk.id_User
                    WHERE 
                        gd.NamHoc = ? AND gd.Khoa = ? AND gd.id_User != 1
                    GROUP BY 
                        gd.GiangVien
                    ORDER BY 
                        TongSoTiet DESC
                `;
                params.push(namhoc, namhoc, khoa);
            } else {
                // Tất cả khoa
                query = `
                    SELECT 
                        gd.Khoa AS Khoa,
                        SUM(gd.QuyChuan) AS SoTietGiangDay,
                        COALESCE(gk.TotalSoTietKT, 0) AS SoTietKTGK,
                        SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) AS TongSoTiet,
                        COUNT(DISTINCT gd.id_User) AS SoLuongGiangVien
                    FROM 
                        giangday gd 
                    LEFT JOIN 
                        (SELECT Khoa, SUM(COALESCE(SoTietKT, 0)) AS TotalSoTietKT
                        FROM giuaky
                        WHERE NamHoc = ? 
                        GROUP BY Khoa) gk 
                    ON gd.Khoa = gk.Khoa
                    WHERE 
                        gd.NamHoc = ? AND gd.id_User != 1 
                    GROUP BY 
                        gd.Khoa
                    ORDER BY 
                        gd.Khoa DESC 
                `;
                params.push(namhoc, namhoc);
            }

            // Add parameters for the query
            if (namhoc) {
                params.push(namhoc);
            }

            console.log("Executing query:", query);
            console.log("With parameters:", params);
            console.log("Query:", query);

            const [result] = await connection.query(query, params);

            // Check if result is empty
            if (result.length === 0) {
                console.log("No data found for the query.");
                return res.json([]); // Return an empty array if no data found
            }

            // Calculate total hours for each lecturer
            const finalResult = result.map(item => ({
                ...item,

                TongSoTiet: (
                    parseFloat(item.SoTietGiangDay) + 
                    parseFloat(item.SoTietKTGK || 0) // Bao gồm SoTietKTGK
                ).toFixed(2) // Cột "Tổng số tiết"
            }));

            res.json(finalResult);
        } catch (err) {
            console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ", error: err.message });
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

    getThongkeGiangDayData: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query;

        try {
            connection = await createConnection();
            let query = `
                SELECT 
                    gd.giangvien AS GiangVien,
                    COALESCE(SUM(gd.QuyChuan), 0) AS SoTietGiangDay
                FROM 
                    giangday gd
                WHERE 
                    gd.id_User != 1
                    gd.NamHoc = ? AND gd.Khoa = ?
                GROUP BY 
                    gd.giangvien
                ORDER BY 
                    SoTietGiangDay DESC
            `;

            // Xây dựng mảng tham số
            const params = [];
            if (namhoc) params.push(namhoc);
            if (khoa && khoa !== 'ALL') params.push(khoa);

            // In ra câu truy vấn và tham số để kiểm tra
            console.log("Query:", query);
            console.log("Params:", params);

            const [result] = await connection.query(query, params);

            res.json(result);
        } catch (err) {
            console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ", error: err.message });
        } finally {
            if (connection) connection.release();
        }
    }
};

module.exports = thongkevuotgioController;