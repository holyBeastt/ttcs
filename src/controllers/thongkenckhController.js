const createConnection = require("../config/databasePool");

const thongkenckhController = {
    // Hiển thị trang thongkenckh
    showThongkePage: (req, res) => {
        res.render("thongkenckh");
    },
    

    // Lấy dữ liệu thống kê
    getStatisticsData: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query; // Get filters from query parameters
        try {
            connection = await createConnection();
            const queries = [
                `SELECT COUNT(*) AS total FROM detaiduan WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1`,
                `SELECT COUNT(*) AS total FROM baibaokhoahoc WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1`,
                `SELECT COUNT(*) AS total FROM bangsangchevagiaithuong WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1`,
                `SELECT COUNT(*) AS total FROM biensoangiaotrinhbaigiang WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1`,
                `SELECT COUNT(*) AS total FROM xaydungctdt WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1`,
                `SELECT COUNT(*) AS total FROM nckhvahuanluyendoituyen WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1`,
                `SELECT COUNT(*) AS total FROM sachvagiaotrinh WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1`
            ];

            const results = await Promise.all(
                queries.map(query => connection.query(query, [khoa || null, khoa || null, namhoc || null, namhoc || null]))
            );

            const totals = results.map(([rows]) => rows[0].total); // Lấy tổng từ mỗi bảng

            res.json({
                success: true,
                data: totals
            });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu thống kê:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },

    // đề tài dự án
    getDetail1Data: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query; // Get filters from query parameters
        try {
            connection = await createConnection();
            const query = `
                SELECT 
                    ID,
                    CapDeTai,
                    NamHoc,
                    TenDeTai,
                    MaSoDeTai,
                    ChuNhiem,
                    ThuKy,
                    DanhSachThanhVien,
                    NgayNghiemThu,
                    Khoa
                FROM detaiduan 
                WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1
            `;
            const [rows] = await connection.query(query, [khoa || null, khoa || null, namhoc || null, namhoc || null]);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu từ bảng đề tài dự án:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },
    //bài báo khoa học
    getDetailDataBaiBao: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query;
        try {
            connection = await createConnection();
            const query = `
                SELECT 
                    NamHoc,
                    Khoa,
                    ID,
                    TenBaiBao,
                    LoaiTapChi,
                    ChiSoTapChi,
                    TacGia,
                    TacGiaChiuTrachNhiem,
                    DanhSachThanhVien,
                    Khoa
                FROM baibaokhoahoc 
                WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1
            `;
            //không có khoảng trắng sau dấu phẩy
            const [rows] = await connection.query(query, [khoa || null, khoa || null, namhoc || null, namhoc || null]);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu từ bảng bái báo khoa học:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },
    
    // WHERE (? IS NULL OR FIND_IN_SET(?, REPLACE(KhoaThanhVien, ' ', ''))
    // TH nếu sau dấu phẩy có khoảng trắng
    

    // bằng sáng chế và giải thưởng
    getDetailDataBangsangche: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query;
        try {
            connection = await createConnection();
            const query = `
                SELECT
                    ID,
                    NamHoc,
                    TenBangSangCheVaGiaiThuong,
                    PhanLoai,
                    TacGia,
                    SoQDCongNhan,
                    DanhSachThanhVien,
                    Khoa,
                    NgayQDCongNhan
                FROM bangsangchevagiaithuong 
                WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1
            `;
            const [rows] = await connection.query(query, [khoa || null, khoa || null, namhoc || null, namhoc || null]);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu từ bảng bằng sáng chế:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },
    //biên soạn 
    getDetailDataBiensoan: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query;
        try {
            connection = await createConnection();
            const query = `
                SELECT
                   ID,
                   Phanloai,
                   NamHoc,
                   TenGiaoTrinhBaiGiang,
                   SoQDGiaoNhiemVu,
                   SoTC,
                   NgayQDGiaoNhiemVu,
                   DanhSachThanhVien,
                   TacGia,
                   Khoa
                FROM biensoangiaotrinhbaigiang 
                WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1
            `;
            const [rows] = await connection.query(query, [khoa || null, khoa || null, namhoc || null, namhoc || null]);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu từ bảng biên soạn giáo trình:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },
///Nhiệm vụ kh&cn
    // getDetailDatanhiemvu: async (req, res) => {
    //     let connection;
    //     try {
    //         connection = await createConnection();
    //         const query = `
    //             SELECT 
    //             MaNhiemVu,
    //             NamHoc,
    //             TenNhiemVu,
    //             SoQDGiaoNhiemVu,
    //             NgayQDGiaoNhiemVu
    //             FROM nhiemvukhoahocvacongnghe
    //             ORDER BY NamHoc DESC;
    //         `;
    //         const [rows] = await connection.query(query);
    //         res.json({ success: true, data: rows });
    //     } catch (err) {
    //         console.error("Lỗi khi lấy dữ liệu chi tiết từ bảng Nhiệm vụ khoa học và công nghệ:", err);
    //         res.status(500).json({ success: false, message: "Lỗi máy chủ" });
    //     } finally {
    //         if (connection) connection.release();
    //     }
    // },
    // Xây dựng CTĐT
    getDetailDataxaydung: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query;
        try {
            connection = await createConnection();
            const query = `
                SELECT
                    ID,
                    NamHoc,
                    TenChuongTrinh,
                    SoTC,
                    SoQDGiaoNhiemVu,
                    NgayQDGiaoNhiemVu,
                    HinhThucXayDung,
                    KetQua,
                    DanhSachThanhVien,
                    Khoa
                FROM xaydungctdt 
                WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1
            `;
            const [rows] = await connection.query(query, [khoa || null, khoa || null, namhoc || null, namhoc || null]);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu bảng xây dưng ctđt::", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },
    //nckh và huấn luyện đội tuyển
    getDetailDatanckh: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query;
        try {
            connection = await createConnection();
            const query = `
            SELECT
                ID,
                PhanLoai,
                NamHoc,
                TenDeTai,
                SoQDGiaoNhiemVu,
                NgayQDGiaoNhiemVu,
                KetQuaCapKhoa,
                KetQuaCapHocVien,
                DanhSachThanhVien,
                Khoa
            FROM nckhvahuanluyendoituyen 
                WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1
            `;
            const [rows] = await connection.query(query, [khoa || null, khoa || null, namhoc || null, namhoc || null]);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu chi tiết từ bảng NCKH và huấn luyện đổi tuyển:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },
    /// sách và giáo trình
    getDetailDatasachvagiaotrinh: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query;
        try {
            connection = await createConnection();
            const query = `
                SELECT
                    ID,
                    PhanLoai,
                    NamHoc,
                    TenSachVaGiaoTrinh,
                    SoTrang,
                    SoXuatBan,
                    TacGia,
                    DongChuBien,
                    DanhSachThanhVien,
                    Khoa
                FROM sachvagiaotrinh 
                WHERE (? IS NULL OR FIND_IN_SET(?, KhoaThanhVien)) AND (? IS NULL OR NamHoc = ?) AND daotaoduyet = 1
            `;
            const [rows] = await connection.query(query, [khoa || null, khoa || null, namhoc || null, namhoc || null]);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu từ bảng sách và giáo trình:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },

    getNamHocAndKhoaData: async (req, res) => {
        let connection;
        try {
            connection = await createConnection();
            
            // Lấy dữ liệu năm học
            const [namHoc] = await connection.query(
                `SELECT DISTINCT NamHoc FROM detaiduan 
                UNION SELECT DISTINCT NamHoc FROM baibaokhoahoc 
                UNION SELECT DISTINCT NamHoc FROM bangsangchevagiaithuong 
                UNION SELECT DISTINCT NamHoc FROM biensoangiaotrinhbaigiang 
                UNION SELECT DISTINCT NamHoc FROM xaydungctdt 
                UNION SELECT DISTINCT NamHoc FROM nckhvahuanluyendoituyen 
                UNION SELECT DISTINCT NamHoc FROM sachvagiaotrinh 
                ORDER BY NamHoc DESC`
            );

            // Lấy dữ liệu khoa từ KhoaThanhVien
            const [khoa] = await connection.query(
                `WITH RECURSIVE KhoaCTE AS (
                SELECT 
                    TRIM(SUBSTRING_INDEX(KhoaThanhVien, ',', 1)) AS Khoa, 
                    CASE 
                        WHEN LOCATE(',', KhoaThanhVien) > 0 
                        THEN SUBSTRING(KhoaThanhVien FROM LOCATE(',', KhoaThanhVien) + 1) 
                        ELSE NULL 
                    END AS Remaining
                FROM (
                    SELECT KhoaThanhVien FROM detaiduan WHERE KhoaThanhVien IS NOT NULL
                    UNION ALL
                    SELECT KhoaThanhVien FROM baibaokhoahoc WHERE KhoaThanhVien IS NOT NULL
                    UNION ALL
                    SELECT KhoaThanhVien FROM bangsangchevagiaithuong WHERE KhoaThanhVien IS NOT NULL
                    UNION ALL
                    SELECT KhoaThanhVien FROM biensoangiaotrinhbaigiang WHERE KhoaThanhVien IS NOT NULL
                    UNION ALL
                    SELECT KhoaThanhVien FROM xaydungctdt WHERE KhoaThanhVien IS NOT NULL
                    UNION ALL
                    SELECT KhoaThanhVien FROM nckhvahuanluyendoituyen WHERE KhoaThanhVien IS NOT NULL
                    UNION ALL
                    SELECT KhoaThanhVien FROM sachvagiaotrinh WHERE KhoaThanhVien IS NOT NULL
                ) AS AllKhoa

                UNION ALL
                SELECT 
                    TRIM(SUBSTRING_INDEX(Remaining, ',', 1)) AS Khoa, 
                    CASE 
                        WHEN LOCATE(',', Remaining) > 0 
                        THEN SUBSTRING(Remaining FROM LOCATE(',', Remaining) + 1) 
                        ELSE NULL 
                    END
                FROM KhoaCTE
                WHERE Remaining IS NOT NULL
            )
            SELECT DISTINCT Khoa FROM KhoaCTE WHERE Khoa IS NOT NULL AND Khoa <> '';


`
            );

            const data = {
                success: true,
                NamHoc: namHoc,
                Khoa: khoa
            };

            res.json(data);
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu năm học và khoa:", error);
            res.status(500).json({
                success: false,
                message: "Lỗi server"
            });
        } finally {
            if (connection) connection.release();
        }
    },
};


module.exports = thongkenckhController;