const createConnection = require("../config/databasePool");

const thongkemgController = {
    showThongkemgPage: (req, res) => {
        res.render("thongkemg");
    },

    getThongkemgData: async (req, res) => {
        let connection;
        const {kihoc, namhoc, khoa } = req.query;

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

    getNamHocData: async (req, res) => {
        try {
            const connection = await createConnection();
            
            // Lấy dữ liệu từ database
            const [namHoc] = await connection.query(
                "SELECT DISTINCT namhoc as NamHoc FROM hopdonggvmoi ORDER BY namhoc DESC"
            );
            const [ki] = await connection.query(
                "SELECT DISTINCT kihoc as Ki, kihoc as value FROM hopdonggvmoi ORDER BY kihoc"
            );
            const [khoa] = await connection.query(
                "SELECT DISTINCT MaPhongBan as value, MaPhongBan as Khoa FROM hopdonggvmoi ORDER BY MaPhongBan"
            );
    
            // Thêm option "Tất cả" vào đầu mỗi mảng
            const allNamHoc = [{ NamHoc: 'ALL' }, ...namHoc];
            const allKi = [{ Ki: 'Tất cả kỳ', value: 'ALL' }, ...ki];
            const allKhoa = [{ value: 'ALL', Khoa: 'Tất cả khoa' }, ...khoa];
    
            const data = {
                success: true,
                NamHoc: allNamHoc,
                Ki: allKi,
                Khoa: allKhoa
            };
    
            connection.release();
            res.json(data);
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu:", error);
            res.status(500).json({
                success: false,
                message: "Lỗi server"
            });
        }
    },
    
    getPhongBanMG: async (req, res)=>{
        try {
            const connection = await createConnection();
            // Thêm DISTINCT để loại bỏ các giá trị trùng lặp
            const [phongBan] = await connection.query(
                "SELECT DISTINCT MaPhongBan FROM hopdonggvmoi ORDER BY MaPhongBan"
            );
            
            // Tạo mảng mới không có giá trị trùng lặp
            const uniquePhongBan = Array.from(new Set(phongBan.map(item => item.MaPhongBan)))
                .map(maPB => ({ MaPhongBan: maPB }));
            
            connection.release();
            res.json({
                success: true,
                MaPhongBan: uniquePhongBan
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

module.exports = thongkemgController;