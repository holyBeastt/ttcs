/**
 * NCKH V2 - Hướng dẫn học viên, sinh viên NCKH Controller
 * Logic riêng cho loại NCKH: Hướng dẫn SV NCKH
 * Date: 2026-01-17
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");
const nckhService = require("../../services/nckhV2Service");

// =====================================================
// QUY ĐỔI SỐ TIẾT
// =====================================================

/**
 * Quy đổi số tiết cho Hướng dẫn SV NCKH - Chia đều cho tất cả thành viên
 * Công thức: soTietMoiNguoi = T / tongSoThanhVien
 */
const quyDoiSoGioHuongDanV2 = async (body, MaBang) => {
    const {
        loaiHuongDan,
        thanhVien,
        tongSoTacGia
    } = body;

    // Lấy số tiết chuẩn từ DB
    const T = await nckhService.getSoTietChuan("LoaiHuongDan", loaiHuongDan, MaBang);

    // Sử dụng TongSoTacGia từ body
    const finalTongSoThanhVien = parseInt(tongSoTacGia) || 0;

    if (finalTongSoThanhVien === 0) {
        throw new Error("Phải có ít nhất 1 thành viên tham gia hướng dẫn.");
    }

    // Tính tiết chia đều: T / tongSoThanhVien
    const soTietMoiNguoi = Math.round((T / finalTongSoThanhVien) * 100) / 100;

    // Format kết quả cho tất cả Thành viên (chia đều)
    if (thanhVien && Array.isArray(thanhVien)) {
        const formattedMembers = [];
        for (const member of thanhVien) {
            const { name, unit } = nckhService.extractNameAndUnit(member);
            if (unit) {
                formattedMembers.push(`${name} (${unit} - ${nckhService.formatHours(soTietMoiNguoi)})`);
            } else {
                // Lookup Khoa cho giảng viên nội bộ
                const khoa = await nckhService.getKhoaByName(name);
                formattedMembers.push(khoa
                    ? `${name} (${khoa} - ${nckhService.formatHours(soTietMoiNguoi)})`
                    : `${name} (${nckhService.formatHours(soTietMoiNguoi)})`);
            }
        }
        body.thanhVien = formattedMembers.join(", ");
    }


    return body;
};


// =====================================================
// SAVE
// =====================================================

/**
 * Lưu Hướng dẫn SV NCKH mới (V2)
 */
const saveHuongDanV2 = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    let connection;

    try {
        // Quy đổi số tiết - chia đều cho thành viên
        const data = await quyDoiSoGioHuongDanV2(req.body, "huongdansvnckh");

        const {
            loaiHuongDan,
            namHoc,
            tenDeTai,
            maSoDeTai,
            ngayNghiemThu,
            khoa,
            thanhVien,
            ketQua
        } = data;

        // Convert array thành string nếu cần
        const thanhVienString = Array.isArray(thanhVien) ? thanhVien.join(", ") : (thanhVien || "");

        connection = await createPoolConnection();

        // Chèn dữ liệu (không có HuongDanChinh và SoNamThucHien)
        await connection.execute(
            `INSERT INTO huongdansvnckh (
                LoaiHuongDan, NamHoc, TenDeTai, MaSoDeTai, 
                NgayNghiemThu, Khoa, DanhSachThanhVien, KetQua,
                TongSoTacGia
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                loaiHuongDan,
                namHoc,
                tenDeTai,
                maSoDeTai,
                nckhService.convertDateFormat(ngayNghiemThu),
                khoa,
                thanhVienString,
                ketQua,
                data.tongSoTacGia || 0
            ]
        );

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Thêm thông tin NCKH V2',
                `Thêm hướng dẫn SV NCKH "${tenDeTai}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Thêm hướng dẫn SV NCKH thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi lưu hướng dẫn SV NCKH V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thêm hướng dẫn SV NCKH.",
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// GET TABLE DATA
// =====================================================

/**
 * Lấy danh sách Hướng dẫn SV NCKH (V2)
 */
const getTableHuongDanV2 = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[V2] Lấy dữ liệu bảng huongdansvnckh Năm: ${NamHoc} Khoa: ${Khoa}`);

    let connection;
    try {
        connection = await createPoolConnection();

        let query = `SELECT * FROM huongdansvnckh WHERE NamHoc = ?`;
        let params = [NamHoc];

        // Build filter clause dựa trên Khoa (chỉ có DanhSachThanhVien, không có TacGiaChinh)
        const { whereClause, params: khoaParams } = nckhService.buildKhoaFilterClause(Khoa, 'DanhSachThanhVien', null);
        query += whereClause;
        params = params.concat(khoaParams);

        console.log("Executing query:", query, "with params:", params);

        const [results] = await connection.execute(query, params);
        console.log(`Found ${results.length} records for NamHoc ${NamHoc}, Khoa ${Khoa}`);

        res.json(results);
    } catch (error) {
        console.error("Lỗi trong hàm getTableHuongDanV2:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EDIT
// =====================================================

/**
 * Sửa thông tin Hướng dẫn SV NCKH (V2)
 */
const editHuongDanV2 = async (req, res) => {
    const { ID } = req.params;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID) {
        return res.status(400).json({ message: "Thiếu ID cần cập nhật." });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
        return res.status(400).json({ message: "Dữ liệu gửi lên bị thiếu hoặc rỗng." });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        // Lấy dữ liệu cũ
        const [oldRows] = await connection.execute(`SELECT * FROM huongdansvnckh WHERE ID = ?`, [ID]);
        if (oldRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
        }
        const oldData = oldRows[0];

        const data = {
            LoaiHuongDan: req.body.LoaiHuongDan,
            TenDeTai: req.body.TenDeTai,
            MaSoDeTai: req.body.MaSoDeTai,
            DanhSachThanhVien: req.body.DanhSachThanhVien,
            NgayNghiemThu: nckhService.convertDateFormat(req.body.NgayNghiemThu),
            DaoTaoDuyet: req.body.DaoTaoDuyet,
            Khoa: req.body.Khoa,
            KetQua: req.body.KetQua,
            TongSoTacGia: req.body.TongSoTacGia || 0
        };

        const updateQuery = `
            UPDATE huongdansvnckh 
            SET LoaiHuongDan = ?, TenDeTai = ?, MaSoDeTai = ?, 
                DanhSachThanhVien = ?, NgayNghiemThu = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?,
                TongSoTacGia = ?
            WHERE ID = ?`;

        const queryParams = [
            data.LoaiHuongDan,
            data.TenDeTai,
            data.MaSoDeTai,
            data.DanhSachThanhVien,
            data.NgayNghiemThu,
            data.DaoTaoDuyet,
            data.Khoa,
            data.KetQua,
            data.TongSoTacGia,
            ID
        ];

        const [result] = await connection.execute(updateQuery, queryParams);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
        }

        // Ghi log nếu có thay đổi duyệt
        if (oldData && oldData.DaoTaoDuyet !== data.DaoTaoDuyet) {
            try {
                await LogService.logNCKHChange(oldData, data, {
                    id: userId,
                    name: userName
                });
            } catch (logError) {
                console.error("Lỗi khi ghi log:", logError);
            }
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật Hướng dẫn SV NCKH V2:", error);
        res.status(500).json({
            message: "Có lỗi xảy ra khi cập nhật.",
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    quyDoiSoGioHuongDanV2,
    saveHuongDanV2,
    getTableHuongDanV2,
    editHuongDanV2
};
