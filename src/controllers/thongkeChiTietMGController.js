const createConnection = require("../config/databasePool");

const thongkeChiTietMGController = {
    showPage: (req, res) => {
        res.render("thongkeChiTietMG");
    },

    getFilterOptions: async (req, res) => {
        let connection;
        try {
            connection = await createConnection();

            // Lấy danh sách năm học từ cả hai bảng
            const [namHoc] = await connection.query(`
                SELECT DISTINCT namhoc FROM giangday
                UNION
                SELECT DISTINCT namhoc FROM exportdoantotnghiep
                ORDER BY namhoc DESC
            `);

            // Lấy danh sách kỳ từ cả hai bảng
            const [ki] = await connection.query(`
                SELECT DISTINCT HocKy AS ki FROM giangday
                UNION
                SELECT DISTINCT ki FROM exportdoantotnghiep
                ORDER BY ki DESC
            `);

            // Lấy danh sách khoa từ cả hai bảng
            const [khoa] = await connection.query(`
                SELECT DISTINCT Khoa AS MaPhongBan FROM giangday
                UNION
                SELECT DISTINCT MaPhongBan FROM exportdoantotnghiep
                ORDER BY MaPhongBan
            `);

            res.json({
                success: true,
                namHoc: [{ namhoc: "ALL" }, ...namHoc],
                ki: [{ ki: "ALL" }, ...ki],
                khoa: [{ MaPhongBan: "ALL" }, ...khoa],
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
        const { namhoc, khoa, ki } = req.query; // Thêm `ki` vào danh sách tham số
        try {
            connection = await createConnection();

            // Truy vấn lấy danh sách giảng viên từ cả hai bảng
            let query = `
                SELECT DISTINCT HoTen AS hoten FROM (
                    SELECT GiangVien AS HoTen
                    FROM giangday
                    WHERE 1=1
                    ${namhoc && namhoc !== 'ALL' ? 'AND NamHoc = ?' : ''}
                    ${khoa && khoa !== 'ALL' ? 'AND Khoa = ?' : ''}
                    ${ki && ki !== 'ALL' ? 'AND HocKy = ?' : ''}
                    UNION
                    SELECT GiangVien AS HoTen
                    FROM exportdoantotnghiep
                    WHERE 1=1
                    ${namhoc && namhoc !== 'ALL' ? 'AND NamHoc = ?' : ''}
                    ${khoa && khoa !== 'ALL' ? 'AND MaPhongBan = ?' : ''}
                    ${ki && ki !== 'ALL' ? 'AND Ki = ?' : ''}
                ) AS combined
                ORDER BY HoTen
            `;

            // Thêm tham số vào mảng params
            const params = [];
            if (namhoc && namhoc !== 'ALL') {
                params.push(namhoc, namhoc); // Push 2 lần vì có 2 điều kiện trong UNION
            }
            if (khoa && khoa !== 'ALL') {
                params.push(khoa, khoa); // Push 2 lần vì có 2 điều kiện trong UNION
            }
            if (ki && ki !== 'ALL') {
                params.push(ki, ki); // Push 2 lần vì có 2 điều kiện trong UNION
            }

            console.log("Query Giảng Viên:", query, params); // Debug truy vấn và tham số

            const [giangVien] = await connection.query(query, params);

            res.json({
                success: true,
                giangVien: [{ hoten: "ALL" }, ...giangVien],
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
        const { ki, namhoc, khoa, giangvien } = req.query;
        try {
            connection = await createConnection();

            // Khai báo giangDayParams
            const giangDayParams = [];

            // Truy vấn dữ liệu giảng dạy
            let giangDayQuery = `
                SELECT 
                    GiangVien AS hoten,
                    Khoa AS MaPhongBan,
                    NamHoc AS namhoc,
                    HocKy AS ki,
                    Lop AS lop,
                    TenHocPhan AS tenhocphan,
                    SoTC AS sotinchi,
                    QuyChuan AS sotiet,
                    he_dao_tao AS hedaotao
                FROM giangday
                WHERE 1=1
            `;

            if (namhoc && namhoc !== 'ALL') {
                giangDayQuery += " AND NamHoc = ?";
                giangDayParams.push(namhoc);
            }

            if (khoa && khoa !== 'ALL') {
                giangDayQuery += " AND Khoa = ?";
                giangDayParams.push(khoa);
            }

            if (giangvien && giangvien !== 'ALL') {
                giangDayQuery += " AND GiangVien LIKE ?";
                giangDayParams.push(`%${giangvien}%`);
            }

            if (ki && ki !== 'ALL') {
                giangDayQuery += " AND HocKy = ?";
                giangDayParams.push(ki);
            }

            console.log("Giảng dạy Query:", giangDayQuery, giangDayParams);
            const [giangDayResult] = await connection.query(giangDayQuery, giangDayParams);

            // Truy vấn dữ liệu đồ án
            const doAnParams = [];
            let doAnQuery = `
                SELECT 
                    GiangVien AS hoten,
                    MaPhongBan,
                    NamHoc AS namhoc,
                    dot,
                    Ki AS kihoc,
                    TenDeTai AS detai,
                    SoTiet AS sotiet
                FROM exportdoantotnghiep
                WHERE 1=1
            `;

            if (ki && ki !== 'ALL') {
                doAnQuery += " AND ki = ?";
                doAnParams.push(ki);
            }

            if (namhoc && namhoc !== 'ALL') {
                doAnQuery += " AND NamHoc = ?";
                doAnParams.push(namhoc);
            }

            if (khoa && khoa !== 'ALL') {
                doAnQuery += " AND MaPhongBan = ?";
                doAnParams.push(khoa);
            }

            if (giangvien && giangvien !== 'ALL') {
                doAnQuery += " AND GiangVien LIKE ?";
                doAnParams.push(`%${giangvien}%`);
            }

            console.log("Đồ án Query:", doAnQuery, doAnParams);
            const [doAnResult] = await connection.query(doAnQuery, doAnParams);

            res.json({
                success: true,
                dataGiangDay: giangDayResult,
                dataDoAn: doAnResult,
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
