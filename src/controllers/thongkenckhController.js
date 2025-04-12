const createConnection = require("../config/databasePool");

const thongkenckhController = {
    // Hiển thị trang thongkenckh
    showThongkePage: (req, res) => {
        res.render("thongkenckh");
    },
    

    // Lấy dữ liệu thống kê
    getStatisticsData: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query;
    
        try {
            connection = await createConnection();
    
            const baseQuery = `
                SELECT COUNT(*) AS total 
                FROM ?? t
                WHERE t.daotaoduyet = 1
            `;
            const tables = [
                "detaiduan",
                "baibaokhoahoc",
                "bangsangchevagiaithuong",
                "biensoangiaotrinhbaigiang",
                "xaydungctdt",
                "nckhvahuanluyendoituyen",
                "sachvagiaotrinh"
            ];
    
            const results = await Promise.all(
                tables.map(async (table) => {
                    let conditions = [];
                    let params = [table];
    
                    if (khoa && khoa !== 'ALL') {
                        conditions.push(`
                            EXISTS (
                                SELECT 1 FROM nhanvien nv 
                                WHERE TRIM(BOTH ' ' FROM t.DanhSachThanhVien) COLLATE utf8mb4_general_ci
                                    LIKE CONCAT('%', TRIM(BOTH ' ' FROM nv.TenNhanVien) COLLATE utf8mb4_general_ci, '%')
                                AND nv.MaPhongBan = ?
                            )
                        `);
                        params.push(khoa);
                    }
    
                    if (namhoc) {
                        conditions.push("t.NamHoc = ?");
                        params.push(namhoc);
                    }
    
                    let finalQuery = baseQuery;
                    if (conditions.length > 0) {
                        finalQuery += ` AND ${conditions.join(" AND ")}`;
                    }
    
                    const [rows] = await connection.query(finalQuery, params);
                    return rows[0].total;
                })
            );
    
            res.json({
                success: true,
                data: results
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
        const { namhoc, khoa } = req.query;
        try {
            connection = await createConnection();
            let query = `
                SELECT 
                    t.ID,
                    t.CapDeTai,
                    t.NamHoc,
                    t.TenDeTai,
                    t.MaSoDeTai,
                    t.ChuNhiem,
                    t.ThuKy,
                    t.DanhSachThanhVien,
                    t.NgayNghiemThu,
                    t.Khoa
                FROM detaiduan t
                WHERE t.daotaoduyet = 1
            `;

            let conditions = [];
            let params = [];

            if (khoa && khoa !== 'ALL') {
                conditions.push(`
                    EXISTS (
                        SELECT 1 FROM nhanvien nv 
                        WHERE TRIM(BOTH ' ' FROM t.DanhSachThanhVien) COLLATE utf8mb4_general_ci
                            LIKE CONCAT('%', TRIM(BOTH ' ' FROM nv.TenNhanVien) COLLATE utf8mb4_general_ci, '%')
                        AND nv.MaPhongBan = ?
                    )
                `);
                params.push(khoa);
            }

            if (namhoc) {
                conditions.push("t.NamHoc = ?");
                params.push(namhoc);
            }

            if (conditions.length > 0) {
                query += ` AND ${conditions.join(" AND ")}`;
            }

            const [rows] = await connection.query(query, params);
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
            let query = `
                SELECT 
                    t.NamHoc,
                    t.Khoa,
                    t.ID,
                    t.TenBaiBao,
                    t.LoaiTapChi,
                    t.ChiSoTapChi,
                    t.TacGia,
                    t.TacGiaChiuTrachNhiem,
                    t.DanhSachThanhVien,
                    t.Khoa
                FROM baibaokhoahoc t
                WHERE t.daotaoduyet = 1
            `;

            let conditions = [];
            let params = [];

            if (khoa && khoa !== 'ALL') {
                conditions.push(`
                    EXISTS (
                        SELECT 1 FROM nhanvien nv 
                        WHERE TRIM(BOTH ' ' FROM t.DanhSachThanhVien) COLLATE utf8mb4_general_ci
                            LIKE CONCAT('%', TRIM(BOTH ' ' FROM nv.TenNhanVien) COLLATE utf8mb4_general_ci, '%')
                        AND nv.MaPhongBan = ?
                    )
                `);
                params.push(khoa);
            }

            if (namhoc) {
                conditions.push("t.NamHoc = ?");
                params.push(namhoc);
            }

            if (conditions.length > 0) {
                query += ` AND ${conditions.join(" AND ")}`;
            }

            const [rows] = await connection.query(query, params);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu từ bảng bài báo khoa học:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },
    
    // WHERE (? IS NULL OR FIND_IN_SET(?, REPLACE(khoathanhvien, ' ', ''))
    // TH nếu sau dấu phẩy có khoảng trắng
    

    // bằng sáng chế và giải thưởng
    getDetailDataBangsangche: async (req, res) => {
        let connection;
        const { namhoc, khoa } = req.query;
        try {
            connection = await createConnection();
            let query = `
                SELECT
                    t.ID,
                    t.NamHoc,
                    t.TenBangSangCheVaGiaiThuong,
                    t.PhanLoai,
                    t.TacGia,
                    t.SoQDCongNhan,
                    t.DanhSachThanhVien,
                    t.Khoa,
                    t.NgayQDCongNhan
                FROM bangsangchevagiaithuong t
                WHERE t.daotaoduyet = 1
            `;

            let conditions = [];
            let params = [];

            if (khoa && khoa !== 'ALL') {
                conditions.push(`
                    EXISTS (
                        SELECT 1 FROM nhanvien nv 
                        WHERE TRIM(BOTH ' ' FROM t.DanhSachThanhVien) COLLATE utf8mb4_general_ci
                            LIKE CONCAT('%', TRIM(BOTH ' ' FROM nv.TenNhanVien) COLLATE utf8mb4_general_ci, '%')
                        AND nv.MaPhongBan = ?
                    )
                `);
                params.push(khoa);
            }

            if (namhoc) {
                conditions.push("t.NamHoc = ?");
                params.push(namhoc);
            }

            if (conditions.length > 0) {
                query += ` AND ${conditions.join(" AND ")}`;
            }

            const [rows] = await connection.query(query, params);
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
            let query = `
                SELECT
                    t.ID,
                    t.Phanloai,
                    t.NamHoc,
                    t.TenGiaoTrinhBaiGiang,
                    t.SoQDGiaoNhiemVu,
                    t.SoTC,
                    t.NgayQDGiaoNhiemVu,
                    t.DanhSachThanhVien,
                    t.TacGia,
                    t.Khoa
                FROM biensoangiaotrinhbaigiang t
                WHERE t.daotaoduyet = 1
            `;

            let conditions = [];
            let params = [];

            if (khoa && khoa !== 'ALL') {
                conditions.push(`
                    EXISTS (
                        SELECT 1 FROM nhanvien nv 
                        WHERE TRIM(BOTH ' ' FROM t.DanhSachThanhVien) COLLATE utf8mb4_general_ci
                            LIKE CONCAT('%', TRIM(BOTH ' ' FROM nv.TenNhanVien) COLLATE utf8mb4_general_ci, '%')
                        AND nv.MaPhongBan = ?
                    )
                `);
                params.push(khoa);
            }

            if (namhoc) {
                conditions.push("t.NamHoc = ?");
                params.push(namhoc);
            }

            if (conditions.length > 0) {
                query += ` AND ${conditions.join(" AND ")}`;
            }

            const [rows] = await connection.query(query, params);
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
    //         let query = `
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
            let query = `
                SELECT
                    t.ID,
                    t.NamHoc,
                    t.TenChuongTrinh,
                    t.SoTC,
                    t.SoQDGiaoNhiemVu,
                    t.NgayQDGiaoNhiemVu,
                    t.HinhThucXayDung,
                    t.KetQua,
                    t.DanhSachThanhVien,
                    t.Khoa
                FROM xaydungctdt t
                WHERE t.daotaoduyet = 1
            `;

            let conditions = [];
            let params = [];

            if (khoa && khoa !== 'ALL') {
                conditions.push(`
                    EXISTS (
                        SELECT 1 FROM nhanvien nv 
                        WHERE TRIM(BOTH ' ' FROM t.DanhSachThanhVien) COLLATE utf8mb4_general_ci
                            LIKE CONCAT('%', TRIM(BOTH ' ' FROM nv.TenNhanVien) COLLATE utf8mb4_general_ci, '%')
                        AND nv.MaPhongBan = ?
                    )
                `);
                params.push(khoa);
            }

            if (namhoc) {
                conditions.push("t.NamHoc = ?");
                params.push(namhoc);
            }

            if (conditions.length > 0) {
                query += ` AND ${conditions.join(" AND ")}`;
            }

            const [rows] = await connection.query(query, params);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu bảng xây dựng ctđt:", err);
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
            let query = `
                SELECT
                    t.ID,
                    t.PhanLoai,
                    t.NamHoc,
                    t.TenDeTai,
                    t.SoQDGiaoNhiemVu,
                    t.NgayQDGiaoNhiemVu,
                    t.KetQuaCapKhoa,
                    t.KetQuaCapHocVien,
                    t.DanhSachThanhVien,
                    t.Khoa
                FROM nckhvahuanluyendoituyen t
                WHERE t.daotaoduyet = 1
            `;

            let conditions = [];
            let params = [];

            if (khoa && khoa !== 'ALL') {
                conditions.push(`
                    EXISTS (
                        SELECT 1 FROM nhanvien nv 
                        WHERE TRIM(BOTH ' ' FROM t.DanhSachThanhVien) COLLATE utf8mb4_general_ci
                            LIKE CONCAT('%', TRIM(BOTH ' ' FROM nv.TenNhanVien) COLLATE utf8mb4_general_ci, '%')
                        AND nv.MaPhongBan = ?
                    )
                `);
                params.push(khoa);
            }

            if (namhoc) {
                conditions.push("t.NamHoc = ?");
                params.push(namhoc);
            }

            if (conditions.length > 0) {
                query += ` AND ${conditions.join(" AND ")}`;
            }

            const [rows] = await connection.query(query, params);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu chi tiết từ bảng NCKH và huấn luyện đội tuyển:", err);
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
            let query = `
                SELECT
                    t.ID,
                    t.PhanLoai,
                    t.NamHoc,
                    t.TenSachVaGiaoTrinh,
                    t.SoTrang,
                    t.SoXuatBan,
                    t.TacGia,
                    t.DongChuBien,
                    t.DanhSachThanhVien,
                    t.Khoa
                FROM sachvagiaotrinh t
                WHERE t.daotaoduyet = 1
            `;
    
            let conditions = [];
            let params = [];
    
            // Nếu không phải 'ALL', lọc theo khoa nhưng chỉ dựa vào thành viên không nằm trong dấu ()
            if (khoa && khoa !== 'ALL') {
                conditions.push(`
                    EXISTS (
                        SELECT 1 FROM nhanvien nv 
                        WHERE TRIM(BOTH ' ' FROM t.DanhSachThanhVien) COLLATE utf8mb4_general_ci
                            LIKE CONCAT('%', TRIM(BOTH ' ' FROM nv.TenNhanVien) COLLATE utf8mb4_general_ci, '%')
                        AND nv.MaPhongBan = ?
                    )

                `);
                params.push(khoa);
                console.log("Generated Query:", query, params);

            }
            
    
            // Nếu có NamHoc, thêm điều kiện lọc theo NamHoc
            if (namhoc) {
                conditions.push("t.NamHoc = ?");
                params.push(namhoc);
            }
    
            // Gộp các điều kiện vào câu query
            if (conditions.length > 0) {
                query += ` AND ${conditions.join(" AND ")}`;
            }
    
            const [rows] = await connection.query(query, params);
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

            // Lấy dữ liệu khoa từ bảng phongban
            const [khoa] = await connection.query(
                `SELECT MaPhongBan as Khoa, TenPhongBan FROM phongban WHERE isKhoa=1`
            );

            const maxNamHoc = namHoc.length > 0 ? namHoc[0].namHoc : "ALL"; // Lấy năm học lớn nhất
            namHoc.unshift({ NamHoc: "ALL" });

            res.json({
                success: true,
                NamHoc: namHoc,
                Khoa: khoa,
                MaxNamHoc: maxNamHoc,
            });

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