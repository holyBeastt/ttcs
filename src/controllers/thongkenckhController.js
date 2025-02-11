const createConnection = require("../config/databasePool");

const thongkenckhController = {
    // Hiển thị trang thongkenckh
    showThongkePage: (req, res) => {
        res.render("thongkenckh");
    },
    

    // Lấy dữ liệu thống kê
    getStatisticsData: async (req, res) => {
        let connection;
        try {
            connection = await createConnection();
            const queries = [
                'SELECT COUNT(*) AS total FROM detaiduan',
                'SELECT COUNT(*) AS total FROM baibaokhoahoc',
                'SELECT COUNT(*) AS total FROM bangsangchevagiaithuong',
                'SELECT COUNT(*) AS total FROM biensoangiaotrinhbaigiang',
                // 'SELECT COUNT(*) AS total FROM nhiemvukhoahocvacongnghe',
                'SELECT COUNT(*) AS total FROM xaydungctdt',
                'SELECT COUNT(*) AS total FROM nckhvahuanluyendoituyen',
                'SELECT COUNT(*) AS total FROM sachvagiaotrinh'
            ];

            const results = await Promise.all(
                queries.map(query => connection.query(query))
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
                ORDER BY NamHoc DESC;
            `;
            const [rows] = await connection.query(query);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu chi tiết:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },
    //bài báo khoa học
    getDetailDataBaiBao: async (req, res) => {
        let connection;
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
                ORDER BY NamHoc DESC;
            `;

            const [rows] = await connection.query(query);
            res.json({ success: true, data: rows });
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu chi tiết:", error);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },
    /// bằng sáng chế và giải thưởng
    getDetailDataBangsangche: async (req, res) => {
        let connection;
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
                ORDER BY NamHoc DESC;
            `;
            const [rows] = await connection.query(query);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu chi tiết từ bảng Bằng sáng chế/giải thưởng:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },
    //biên soạn 
    getDetailDataBiensoan: async (req, res) => {
        let connection;
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
                ORDER BY NamHoc DESC;
            `;
            const [rows] = await connection.query(query);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu chi tiết từ bảng Biên soạn giáo trình:", err);
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
                ORDER BY NamHoc DESC;
            `;
            const [rows] = await connection.query(query);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu chi tiết từ bảng Xây dựng chương trình đào tạo:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },
    //nckh và huấn luyện đội tuyển
    getDetailDatanckh: async (req, res) => {
        let connection;
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
                ORDER BY NamHoc DESC;
            `;
            const [rows] = await connection.query(query);
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
                ORDER BY NamHoc DESC;
            `;
            const [rows] = await connection.query(query);
            res.json({ success: true, data: rows });
        } catch (err) {
            console.error("Lỗi khi lấy dữ liệu chi tiết từ bảng Sách và giáo trình:", err);
            res.status(500).json({ success: false, message: "Lỗi máy chủ" });
        } finally {
            if (connection) connection.release();
        }
    },

};


module.exports = thongkenckhController;