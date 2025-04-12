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

            // Query chỉ lấy dữ liệu từ bảng quychuan
            let queryGiangDay = `
                SELECT 
                    TRIM(SUBSTRING_INDEX(qc.GiaoVienGiangDay, ' - ', 1)) AS hoten,
                    qc.Khoa AS MaPhongBan,
                    qc.NamHoc AS namhoc,
                    qc.KiHoc AS kihoc,
                    qc.TenLop AS lop,
                    qc.LopHocPhan AS tenhocphan,
                    qc.SoTinChi AS sotinchi,
                    qc.QuyChuan AS sotiet,
                    qc.he_dao_tao AS hedaotao
                FROM quychuan qc
                WHERE qc.MoiGiang = 1
            `;

            const paramsGiangDay = [];

            if (namhoc && namhoc !== 'ALL') {
                queryGiangDay += " AND qc.NamHoc = ?";
                paramsGiangDay.push(namhoc);
            }

            if (khoa && khoa !== 'ALL') {
                queryGiangDay += " AND qc.Khoa = ?";
                paramsGiangDay.push(khoa);
            }

            if (giangvien && giangvien !== 'ALL') {
                queryGiangDay += " AND qc.GiaoVienGiangDay LIKE ?";
                paramsGiangDay.push(`%${giangvien}%`);
            }

            queryGiangDay += " ORDER BY qc.GiaoVienGiangDay, qc.KiHoc, qc.TenLop";

            const [giangDayResult] = await connection.query(queryGiangDay, paramsGiangDay);

            res.json({
                success: true,
                dataGiangDay: giangDayResult,
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
