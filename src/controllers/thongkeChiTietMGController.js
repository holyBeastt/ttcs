const createConnection = require("../config/databasePool");

const thongkeChiTietMGController = {
    showPage: (req, res) => {
        res.render("thongkeChiTietMG");
    },

    getFilterOptions: async (req, res) => {
        let connection;
        try {
            connection = await createConnection();
            
            // Lấy danh sách năm học
            const [namHoc] = await connection.query(
                "SELECT DISTINCT namhoc FROM hopdonggvmoi ORDER BY namhoc DESC"
            );

            // Lấy danh sách khoa
            const [khoa] = await connection.query(
                "SELECT DISTINCT MaPhongBan FROM hopdonggvmoi ORDER BY MaPhongBan"
            );

            res.json({
                success: true,
                namHoc: [{ namhoc: "ALL" }, ...namHoc],
                khoa: [{ MaPhongBan: "ALL" }, ...khoa]
            });
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu filter:", error);
            res.status(500).json({ success: false, message: "Lỗi server" });
        } finally {
            if (connection) connection.release();
        }
    },

    getGiangVien: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query;
        try {
            connection = await createConnection();
            
            // Query lấy giảng viên từ cả 2 bảng
            let query = `
                SELECT DISTINCT HoTen as hoten FROM (
                    SELECT HoTen
                    FROM hopdonggvmoi
                    WHERE 1=1
                    ${namhoc && namhoc !== 'ALL' ? 'AND NamHoc = ?' : ''}
                    ${khoa && khoa !== 'ALL' ? 'AND MaPhongBan = ?' : ''}
                    UNION
                    SELECT GiangVien as HoTen
                    FROM exportdoantotnghiep
                    WHERE isMoiGiang
                    ${namhoc && namhoc !== 'ALL' ? 'AND NamHoc = ?' : ''}
                    ${khoa && khoa !== 'ALL' ? 'AND MaPhongBan = ?' : ''}
                ) as combined
                ORDER BY HoTen
            `;

            const params = [];
            if (namhoc && namhoc !== 'ALL') {
                params.push(namhoc, namhoc); // Push 2 lần vì có 2 điều kiện trong UNION
            }
            if (khoa && khoa !== 'ALL') {
                params.push(khoa, khoa); // Push 2 lần vì có 2 điều kiện trong UNION
            }

            const [giangVien] = await connection.query(query, params);

            res.json({
                success: true,
                giangVien: [{ hoten: "ALL" }, ...giangVien]
            });
        } catch (error) {
            console.error("Lỗi khi lấy danh sách giảng viên:", error);
            res.status(500).json({ success: false, message: "Lỗi server" });
        } finally {
            if (connection) connection.release();
        }
    },

    getData: async (req, res) => {
        let connection;
        const { namhoc, khoa, giangvien } = req.query;
        try {
            connection = await createConnection();
            
            // Query cho thông tin giảng dạy
            let queryGiangDay = `
                SELECT 
                    HoTen as hoten,
                    MaPhongBan,
                    NamHoc as namhoc,
                    KiHoc as kihoc,
                    MaLop as malop,
                    MaBoMon as mamonhoc,
                    SoTiet as sotiet,
                    he_dao_tao as hedaotao
                FROM hopdonggvmoi
                WHERE 1=1
            `;
            
            // Query cho thông tin đồ án
            let queryDoAn = `
                SELECT 
                    GiangVien as hoten,
                    MaPhongBan,
                    NamHoc as namhoc,
                    Dot as kihoc,
                    TenDeTai as detai,
                    SoTiet as sotiet
                FROM exportdoantotnghiep
                WHERE isMoiGiang
            `;
            
            const paramsGiangDay = [];
            const paramsDoAn = [];

            if (namhoc && namhoc !== 'ALL') {
                queryGiangDay += " AND NamHoc = ?";
                paramsGiangDay.push(namhoc);
                
                queryDoAn += " AND NamHoc = ?";
                paramsDoAn.push(namhoc);
            }
            
            if (khoa && khoa !== 'ALL') {
                queryGiangDay += " AND MaPhongBan = ?";
                paramsGiangDay.push(khoa);
                
                queryDoAn += " AND MaPhongBan = ?";
                paramsDoAn.push(khoa);
            }
            
            if (giangvien && giangvien !== 'ALL') {
                queryGiangDay += " AND HoTen LIKE ?";
                paramsGiangDay.push(`%${giangvien}%`);
                
                queryDoAn += " AND GiangVien LIKE ?";
                paramsDoAn.push(`%${giangvien}%`);
            }

            queryGiangDay += " ORDER BY HoTen, KiHoc, MaLop";
            queryDoAn += " ORDER BY GiangVien, Dot, MaSV";

            const [giangDayResult] = await connection.query(queryGiangDay, paramsGiangDay);
            const [doAnResult] = await connection.query(queryDoAn, paramsDoAn);

            res.json({
                success: true,
                dataGiangDay: giangDayResult,
                dataDoAn: doAnResult
            });
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu:", error);
            res.status(500).json({ success: false, message: error.message || "Lỗi server" });
        } finally {
            if (connection) connection.release();
        }
    }
};

module.exports = thongkeChiTietMGController;
