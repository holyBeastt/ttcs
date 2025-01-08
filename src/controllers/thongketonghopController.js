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
            if (namhoc && namhoc !== 'ALL') {
                query += ` AND namhoc = ?`;
                params.push(namhoc);
            }
            if (kihoc && kihoc !== 'ALL') {
                query += ` AND kihoc = ?`;
                params.push(kihoc);
            }

            query += ` GROUP BY MaPhongBan`;

            // Execute the query
            const [moiGiangData] = await connection.query(query, params);
            console.log("Dữ liệu mời giảng:", moiGiangData);

            // Similar query for vượt giờ
            let queryVuotGio = `
                SELECT 
                    gd.Khoa AS Khoa,
                    SUM(gd.QuyChuan) + COALESCE(gk.TotalSoTietKT, 0) AS TongSoTietVuotGio
                FROM giangday gd
                LEFT JOIN (
                    SELECT Khoa, SUM(COALESCE(SoTietKT, 0)) AS TotalSoTietKT
                    FROM giuaky
                    WHERE 1=1
            `;
            const paramsVuotGio = [];

            // Add filters for vượt giờ
            if (namhoc && namhoc !== 'ALL') {
                queryVuotGio += ` AND NamHoc = ?`;
                paramsVuotGio.push(namhoc);
            }
            if (kihoc && kihoc !== 'ALL') {
                queryVuotGio += ` AND HocKy = ?`;
                paramsVuotGio.push(kihoc);
            }

            queryVuotGio += `
                    GROUP BY Khoa
                ) gk ON gd.Khoa = gk.Khoa
                WHERE gd.id_User != 1
                GROUP BY gd.Khoa
            `;


            // Execute the vượt giờ query
            const [vuotGioData] = await connection.query(queryVuotGio, paramsVuotGio);
            console.log("Dữ liệu vượt giờ:", vuotGioData);
            console.log("Năm " ,namhoc);
            // Combine the data
            const chartData = moiGiangData.map(item => {
                const vuotGio = vuotGioData.find(v => v.Khoa === item.Khoa) || { TongSoTietVuotGio: 0 };
                const tongSoTietMoiGiang = parseFloat(item.TongSoTietMoiGiang).toFixed(1);
                const tongSoTietVuotGio = parseFloat(vuotGio.TongSoTietVuotGio).toFixed(1);
                const tongso = (parseFloat(tongSoTietMoiGiang) + parseFloat(tongSoTietVuotGio)).toFixed(1);

                return {
                    Khoa: item.Khoa,
                    TongSoTietMoiGiang: tongSoTietMoiGiang,
                    TongSoTietVuotGio: tongSoTietVuotGio,
                    Tongso: tongso,
                };
            });

            console.log("Dữ liệu biểu đồ tổng hợp:", chartData);
            res.json(chartData);
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu biểu đồ tổng hợp:", error);
            res.status(500).json({ success: false, message: "Lỗi máy chủ", error: error.message });
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
            console.error("Lỗi khi lấy dữ liệu năm học:", error);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },

};

module.exports = thongketonghopController;
