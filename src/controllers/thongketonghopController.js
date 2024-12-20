const createConnection = require("../config/databasePool");

const thongketonghopController = {
    getChartData: async (req, res) => {
        let connection;

        try {
            connection = await createConnection();

            // Query lấy dữ liệu mời giảng
            console.log("Đang thực hiện query lấy dữ liệu mời giảng...");
            const [moiGiangData] = await connection.query(`
                SELECT 
                    MaPhongBan AS Khoa,
                    SUM(sotiet) AS TongSoTietMoiGiang
                FROM hopdonggvmoi
                GROUP BY MaPhongBan
            `);
            console.log("Dữ liệu mời giảng:", moiGiangData);

            // Query lấy dữ liệu vượt giờ
            console.log("Đang thực hiện query lấy dữ liệu vượt giờ...");
            const [vuotGioData] = await connection.query(`
                SELECT 
                    gd.Khoa AS Khoa,
                    SUM(gd.QuyChuan + COALESCE(gk.TotalSoTietKT, 0)) AS TongSoTietVuotGio
                FROM giangday gd
                LEFT JOIN (
                    SELECT Khoa, SUM(COALESCE(SoTietKT, 0)) AS TotalSoTietKT
                    FROM giuaky
                    GROUP BY Khoa
                ) gk ON gd.Khoa = gk.Khoa
                GROUP BY gd.Khoa
            `);
            console.log("Dữ liệu vượt giờ:", vuotGioData);

            // Gộp dữ liệu mời giảng và vượt giờ
            const chartData = moiGiangData.map(item => {
                const vuotGio = vuotGioData.find(v => v.Khoa === item.Khoa) || { TongSoTietVuotGio: 0 };
                return {
                    Khoa: item.Khoa,
                    TongSoTietMoiGiang: parseFloat(item.TongSoTietMoiGiang) || 0,
                    TongSoTietVuotGio: parseFloat(vuotGio.TongSoTietVuotGio) || 0,
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
};

module.exports = thongketonghopController;
