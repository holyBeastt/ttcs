const createConnection = require("../config/databasePool");

const thongkemgController = {
    showThongkemgPage: (req, res) => {
        res.render("thongkemg");
    },

    getThongkemgData: async (req, res) => {
        let connection;
        const { dot, kihoc, namhoc, khoa } = req.query;

        try {
            connection = await createConnection();
            let query;
            const params = [];

            if (khoa === 'ALL') {
                // Query khi chọn tất cả khoa
                query = `
                    SELECT 
                        MaPhongBan as khoa,
                        COUNT(DISTINCT hoten) as sogiangvien,
                        SUM(sotiet) as tongsotiet
                    FROM hopdonggvmoi 
                    WHERE 1=1
                `;
            } else {
                // Query cho khoa cụ thể
                query = `
                    SELECT hoten, SUM(sotiet) as tongsotiet 
                    FROM hopdonggvmoi 
                    WHERE MaPhongBan = ?
                `;
                params.push(khoa);
            }

            // Thêm các điều kiện lọc khác
            if (dot && dot !== 'ALL') {
                query += ` AND dot = ?`;
                params.push(dot);
            }
            if (kihoc && kihoc !== 'ALL') {
                query += ` AND kihoc = ?`;
                params.push(kihoc);
            }
            if (namhoc && namhoc !== 'ALL') {
                query += ` AND namhoc = ?`;
                params.push(namhoc);
            }

            // Thêm GROUP BY
            if (khoa === 'ALL') {
                query += ` GROUP BY MaPhongBan ORDER BY tongsotiet DESC`;
            } else {
                query += ` GROUP BY hoten ORDER BY tongsotiet DESC`;
            }

            const [result] = await connection.query(query, params);
            res.json(result);
        } catch (err) {
            console.error("Lỗi khi truy vấn cơ sở dữ liệu:", err);
            res.status(500).send("Lỗi máy chủ");
        } finally {
            if (connection) connection.release();
        }
    },

    getFilterOptions: async (req, res) => {
        let connection;
        try {
            connection = await createConnection();
            const query = `
                SELECT DISTINCT dot, kihoc, namhoc 
                FROM hopdonggvmoi 
                ORDER BY namhoc DESC, kihoc DESC, dot DESC;
            `;
            const [result] = await connection.query(query);
            res.json(result);
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu filter:", err);
            res.status(500).send("Lỗi máy chủ");
        } finally {
            if (connection) connection.release();
        }
    }
};

module.exports = thongkemgController;