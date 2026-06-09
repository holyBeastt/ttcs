/**
 * LƯU Ý KIẾN TRÚC QUAN TRỌNG:
 * Service này (và thư mục save_moigiang nói chung) ĐỘC QUYỀN phục vụ 2 nghiệp vụ:
 * 1. Vượt giờ dự kiến (tính toán on-the-fly trên RAM, không lưu DB).
 * 2. Lưu dữ liệu Mời giảng (tính tiền, thuế, insert vào giangday, exportdoantotnghiep, hopdonggvmoi).
 * 
 * 🚫 TUYỆT ĐỐI KHÔNG SỬ DỤNG service này cho luồng "Vượt giờ chính thức" của giảng viên cơ hữu.
 * Luồng chính thức của GV cơ hữu đã được chuyển sang thư mục `vuotgio_v2` (dùng cơ chế Data Lock & Snapshot).
 */
const createPoolConnection = require("../../config/databasePool");
const datnRepo = require("../../repositories/vuotgioDuKien/datn.repo");

const calculateDonGiaWithCache = (tienLuongCache, gvInfo, he_dao_tao) => {
    try {
        const HSL_decimal = gvInfo.HSL ? parseFloat(gvInfo.HSL.toString().replace(',', '.')) : 0;

        // Filter in-memory cache based on matching criteria
        const matchedPrices = tienLuongCache.filter(cfg => {
            // Check he_dao_tao (NULL means apply to all)
            if (cfg.he_dao_tao !== null && cfg.he_dao_tao !== he_dao_tao) return false;

            // Check HocVi (NULL means apply to all)
            if (cfg.HocVi !== null && cfg.HocVi !== gvInfo.HocVi) return false;

            // Check chuc_danh (1 means apply to all, otherwise must match)
            if (cfg.chuc_danh_id !== 1 && cfg.chuc_danh_id !== gvInfo.chuc_danh) return false;

            // Check HSL (teacher's HSL must be >= config HSL)
            if (HSL_decimal < cfg.HSL) return false;

            return true;
        });

        // Sort by priority (same as SQL ORDER BY)
        matchedPrices.sort((a, b) => {
            // do_uu_tien DESC
            if (b.do_uu_tien !== a.do_uu_tien) return b.do_uu_tien - a.do_uu_tien;
            // SoTien DESC
            if (b.SoTien !== a.SoTien) return b.SoTien - a.SoTien;
            // HSL DESC
            return b.HSL - a.HSL;
        });

        return matchedPrices.length > 0 ? matchedPrices[0].SoTien : 0;
    } catch (error) {
        console.error('❌ Error calculating don gia:', error);
        return 0;
    }
};

/**
 * Hàm share dùng chung (Lõi logic biến đổi dữ liệu Đồ án):
 * 
 * SỬ DỤNG CHO 2 NGHIỆP VỤ:
 * 1. Mời giảng lưu (isDuKien = false):
 *    - Dữ liệu thô lấy từ luồng phê duyệt (chỉ lấy các bản ghi đã được Khoa duyệt, chưa lưu).
 *    - Thực hiện logic lọc TaiChinhDuyet, DaLuu và kiểm tra daDuyetHetArray.
 *    - Output trả về (values) sẽ được dùng để insert chính thức vào bảng `exportdoantotnghiep` và tính tiền cho GV mời.
 * 
 * 2. Vượt giờ dự kiến (isDuKien = true):
 *    - Dữ liệu thô lấy trực tiếp từ bảng `doantotnghiep`.
 *    - Bỏ qua các ràng buộc duyệt (TaiChinhDuyet, DaLuu) để hiển thị trước dữ liệu "on-the-fly" lên giao diện Dự kiến.
 *    - Không lưu vào DB, chỉ mapping ra format để render View.
 */
const transformDoAnData = (data, daDuyetHetArray, soTietMap, tienLuongCache, allGV, config, isDuKien = false) => {
    const values = [];
    const errors = [];

    // Tạo uniqueGV từ allGV giống như controller cũ
    const uniqueGV = [];
    const seenCCCD = new Set();
    for (const item of allGV) {
        if (item && item.CCCD && !seenCCCD.has(item.CCCD)) {
            uniqueGV.push(item);
            seenCCCD.add(item.CCCD);
        }
    }

    const { NamHoc, ki, Dot } = config; // Nhận từ tham số bên ngoài để đảm bảo giống controller

    data.forEach((item) => {
        // filter logic
        if (!isDuKien) {
            // Luồng chính thức: Yêu cầu Tài chính duyệt và chưa lưu, khoa đã duyệt hết
            if (item.TaiChinhDuyet == 0 || item.DaLuu == 1 || !daDuyetHetArray.includes(item.MaPhongBan)) {
                return; // Bỏ qua
            }
        } else {
            // Luồng dự kiến: Không quan tâm TaiChinhDuyet hay DaLuu. 
            // Có thể bỏ qua những dòng chưa được Khoa duyệt nếu cần thiết, 
            // nhưng hiện tại để mô phỏng data "Dự kiến" thì ta lấy tất (tuỳ thuộc vào nghiệp vụ, thường Dự kiến thì lấy hết hoặc chỉ lấy KhoaDuyet=1)
            // (Thêm điều kiện nếu có)
        }

        let SoQD = "không";
        let SoNguoi = 2; // Mặc định là 2 giảng viên

        if (
            item.GiangVien2 == null ||
            item.GiangVien2.toLowerCase() == "null" ||
            item.GiangVien2.toLowerCase() == "không" ||
            item.GiangVien2 == ""
        ) {
            SoNguoi = 1;
        }

        let isHDChinh = 1;
        let GiangVien, CCCD, isMoiGiang;
        let matchedItem1;

        if (!item.GiangVien1) return; // Nếu ko có giảng viên 1 thì bỏ qua

        if (item.GiangVien1.includes("-")) {
            GiangVien = item.GiangVien1.split("-")[0].trim();
            CCCD = item.GiangVien1.split("-")[2].trim();
            isMoiGiang = item.GiangVien1.split("-")[1].trim().toLowerCase() == "cơ hữu" ? 0 : 1;

            const normalizedGV1 = GiangVien.trim();
            matchedItem1 = allGV.find((arr) => arr.HoTen.trim() == normalizedGV1);

            if (!matchedItem1) {
                errors.push(`\nKhông tìm thấy giảng viên 1: ${item.GiangVien1} của sinh viên ${item.SinhVien}`);
                return;
            }

            if (isMoiGiang === 1 && matchedItem1.isQuanDoi === 1) {
                isMoiGiang = 0; // Giảng viên mời là quân đội
            }
        } else {
            const normalizedGV1 = item.GiangVien1.trim();
            matchedItem1 = uniqueGV.find((arr) => arr.HoTen.trim() == normalizedGV1);
            if (!matchedItem1) {
                errors.push(`\nKhông tìm thấy giảng viên 1: ${item.GiangVien1} của sinh viên ${item.SinhVien}`);
                return;
            }

            GiangVien = matchedItem1.HoTen.trim();
            CCCD = matchedItem1.CCCD;
            isMoiGiang = matchedItem1.BienChe.toLowerCase() == "cơ hữu" ? 0 : 1;

            if (isMoiGiang === 1 && matchedItem1.isQuanDoi === 1) {
                isMoiGiang = 0; // Giảng viên mời là quân đội
            }
        }

        let SoTiet = 0;
        const soTietConfig = soTietMap[item.he_dao_tao];

        if (!soTietConfig) {
            errors.push(`\nKhông tìm thấy cấu hình số tiết cho he_dao_tao = ${item.he_dao_tao} (Sinh viên: ${item.SinhVien})`);
            return;
        }

        if (SoNguoi == 1) {
            SoTiet = soTietConfig.tong_tiet;
        } else if (SoNguoi == 2) {
            SoTiet = soTietConfig.so_tiet_1;
        }

        values.push([
            item.SinhVien || null,
            item.MaSV || null,
            item.KhoaDaoTao || null,
            SoQD || null,
            item.TenDeTai || null,
            SoNguoi || null,
            isHDChinh || null,
            GiangVien || null,
            CCCD || null,
            isMoiGiang,
            SoTiet || null,
            item.NgayBatDau || null,
            item.NgayKetThuc || null,
            item.MaPhongBan || null,
            NamHoc || null,
            item.Ki || null,
            item.Dot || null,
            item.TT || null,
            matchedItem1.GioiTinh || null,
            matchedItem1.NgaySinh || null,
            matchedItem1.NgayCapCCCD || null,
            matchedItem1.NoiCapCCCD || null,
            matchedItem1.DiaChi || null,
            matchedItem1.DienThoai || null,
            matchedItem1.Email,
            matchedItem1.MaSoThue,
            matchedItem1.HocVi,
            matchedItem1.NoiCongTac,
            matchedItem1.ChucVu,
            matchedItem1.STK,
            matchedItem1.NganHang,
            matchedItem1.MonGiangDayChinh,
            matchedItem1.HSL,
            item.he_dao_tao,
            item.khoa_sinh_vien || null,
            item.nganh || null
        ]);

        let matchedItem2;
        if (SoNguoi == 2) {
            isHDChinh = 0; // Hướng dẫn phụ

            if (item.GiangVien2.includes("-")) {
                GiangVien = item.GiangVien2.split("-")[0].trim();
                CCCD = item.GiangVien2.split("-")[2].trim();
                isMoiGiang = item.GiangVien2.split("-")[1].trim().toLowerCase() == "cơ hữu" ? 0 : 1;

                const normalizedGV2 = GiangVien.trim();
                matchedItem2 = allGV.find((arr) => arr.HoTen.trim() == normalizedGV2);

                if (!matchedItem2) {
                    errors.push(`\nKhông tìm thấy giảng viên 2: ${item.GiangVien2} của sinh viên ${item.SinhVien}`);
                    return;
                }

                if (isMoiGiang === 1 && matchedItem2.isQuanDoi === 1) {
                    isMoiGiang = 0; // Giảng viên mời là quân đội
                }
            } else {
                const normalizedGV2 = item.GiangVien2.trim();
                matchedItem2 = uniqueGV.find((arr) => arr.HoTen.trim() == normalizedGV2);
                if (!matchedItem2) {
                    errors.push(`\nKhông tìm thấy giảng viên 2: ${item.GiangVien2} của sinh viên ${item.SinhVien}`);
                    return;
                }
                GiangVien = matchedItem2.HoTen.trim();
                CCCD = matchedItem2.CCCD;
                isMoiGiang = matchedItem2.BienChe.toLowerCase() == "cơ hữu" ? 0 : 1;

                if (isMoiGiang === 1 && matchedItem2.isQuanDoi === 1) {
                    isMoiGiang = 0; // Giảng viên mời là quân đội
                }
            }

            SoTiet = soTietConfig.so_tiet_2;

            values.push([
                item.SinhVien || null,
                item.MaSV || null,
                item.KhoaDaoTao || null,
                SoQD || null,
                item.TenDeTai || null,
                SoNguoi || null,
                isHDChinh,
                GiangVien || null,
                CCCD || null,
                isMoiGiang,
                SoTiet || null,
                item.NgayBatDau || null,
                item.NgayKetThuc || null,
                item.MaPhongBan || null,
                NamHoc || null,
                item.Ki || null,
                item.Dot || null,
                item.TT || null,
                matchedItem2.GioiTinh || null,
                matchedItem2.NgaySinh || null,
                matchedItem2.NgayCapCCCD || null,
                matchedItem2.NoiCapCCCD || null,
                matchedItem2.DiaChi || null,
                matchedItem2.DienThoai || null,
                matchedItem2.Email,
                matchedItem2.MaSoThue,
                matchedItem2.HocVi,
                matchedItem2.NoiCongTac,
                matchedItem2.ChucVu,
                matchedItem2.STK,
                matchedItem2.NganHang,
                matchedItem2.MonGiangDayChinh,
                matchedItem2.HSL,
                item.he_dao_tao,
                item.khoa_sinh_vien || null,
                item.nganh || null
            ]);
        }
    });

    return { values, errors };
};

const getDoAnTotNghiepDuKien = async (namHoc, khoaId, dot, kiHoc, isMoiGiang = 0) => {
    let connection;
    try {
        connection = await createPoolConnection();
        
        // 1. Query raw data từ doantotnghiep
        let queryData = "SELECT * FROM doantotnghiep WHERE NamHoc = ?";
        let params = [namHoc];
        if (khoaId && khoaId !== 'ALL') {
            queryData += " AND MaPhongBan = ?";
            params.push(khoaId);
        }
        if (dot && dot !== 'ALL') {
            queryData += " AND Dot = ?";
            params.push(dot);
        }
        if (kiHoc && kiHoc !== 'ALL') {
            queryData += " AND ki = ?";
            params.push(kiHoc);
        }
        const [data] = await connection.query(queryData, params);

        if (!data || data.length === 0) return [];

        // 2. Query cấu hình số tiết
        const [soTietDoanConfig] = await connection.query('SELECT * FROM sotietdoan');
        const soTietMap = {};
        soTietDoanConfig.forEach(config => {
            soTietMap[config.he_dao_tao] = {
                tong_tiet: config.tong_tiet,
                so_tiet_1: config.so_tiet_1,
                so_tiet_2: config.so_tiet_2
            };
        });

        // 3. Query toàn bộ giảng viên để truyền vào transform (giống hệt getGVData)
        const normalizeName = (name) => name ? name.replace(/\s*\(.*?\)\s*/g, "").trim() : "";
        const [gvms] = await connection.query(`SELECT HoTen, CCCD, isQuanDoi FROM gvmoi`);
        const [nvs] = await connection.query(`SELECT TenNhanVien, CCCD FROM nhanvien`);
        
        const allGV = [
            ...gvms.map((item) => ({
                HoTen: item.HoTen,
                CCCD: item.CCCD,
                BienChe: "Giảng viên mời",
                HoTenReal: normalizeName(item.HoTen),
                isQuanDoi: item.isQuanDoi
            })),
            ...nvs.map((item) => ({
                HoTen: item.TenNhanVien,
                CCCD: item.CCCD,
                BienChe: "Cơ hữu",
                HoTenReal: normalizeName(item.TenNhanVien),
                isQuanDoi: null
            })),
        ];

        // 4. Lấy daDuyetHetArray ảo (vì dự kiến không lọc theo duyệt)
        const daDuyetHetArray = data.map(d => d.MaPhongBan);
        const tienLuongCache = []; // Ko cần tính tiền cho dự kiến ở bước này

        // 5. Gọi lõi transform dùng chung (pass isDuKien = true)
        const { values } = transformDoAnData(data, daDuyetHetArray, soTietMap, tienLuongCache, allGV, { NamHoc: namHoc, ki: kiHoc, Dot: dot }, true);

        // 6. Map dữ liệu trả về theo format chuẩn
        // Format: { GiangVien_HienThi, MaPhongBan, SinhVien, KhoaSV, TenDeTai, SoTiet }
        let filteredValues = values;
        if (isMoiGiang !== 'ALL') {
            filteredValues = values.filter(v => v[9] === isMoiGiang);
        }

        const mappedRows = filteredValues.map(v => ({ 
            SinhVien: v[0],
            KhoaDaoTao: v[2],
            TenDeTai: v[4],
            GiangVien_HienThi: v[7],
            SoTiet: v[10],
            MaPhongBan: v[13],
            KhoaSV: v[34]
        }));

        return mappedRows;

    } catch (err) {
        console.error("Lỗi getDoAnTotNghiepDuKien:", err);
        return [];
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

module.exports = {
    getDoAnTotNghiepDuKien,
    transformDoAnData
};