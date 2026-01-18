/**
 * NCKH V2 - Đề Xuất Nghiên Cứu Controller
 * Logic riêng cho loại NCKH: Đề xuất nghiên cứu
 * Date: 2026-01-17
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");
const nckhService = require("../../services/nckhV2Service");

// =====================================================
// QUY ĐỔI SỐ TIẾT
// =====================================================

/**
 * Quy đổi số tiết cho Đề xuất nghiên cứu - Chia đều cho tất cả thành viên
 * Công thức: soTietMoiNguoi = T / tongSoThanhVien
 */
const quyDoiSoGioDeXuatV2 = async (body, MaBang) => {
    const {
        capDeXuat,
        thanhVien,
        tongSoTacGia
    } = body;

    // Lấy số tiết chuẩn từ DB
    const T = await nckhService.getSoTietChuan("CapDeXuat", capDeXuat, MaBang);

    // Sử dụng TongSoTacGia từ body (đây là tổng số thành viên)
    const finalTongSoThanhVien = parseInt(tongSoTacGia) || 0;

    if (finalTongSoThanhVien === 0) {
        throw new Error("Phải có ít nhất 1 thành viên tham gia.");
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
 * Lưu đề xuất nghiên cứu mới (V2)
 */
const saveDeXuatV2 = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    let connection;

    try {
        // Quy đổi số tiết - chia đều cho thành viên
        const data = await quyDoiSoGioDeXuatV2(req.body, "dexuatnghiencuu");

        const {
            capDeXuat,
            namHoc,
            tenDeXuat,
            maSoDeXuat,
            ngayNghiemThu,
            khoa,
            thanhVien,
            ketQua
        } = data;

        // Convert array thành string nếu cần
        const thanhVienString = Array.isArray(thanhVien) ? thanhVien.join(", ") : (thanhVien || "");

        connection = await createPoolConnection();

        // Chèn dữ liệu
        await connection.execute(
            `INSERT INTO dexuatnghiencuu (
                CapDeXuat, NamHoc, TenDeXuat, MaSoDeXuat, TacGiaChinh, 
                NgayNghiemThu, Khoa, DanhSachThanhVien, KetQua,
                SoNamThucHien, TongSoTacGia, TongSoThanhVien
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                capDeXuat,
                namHoc,
                tenDeXuat,
                maSoDeXuat,
                null, // TacGiaChinh - không dùng nữa
                nckhService.convertDateFormat(ngayNghiemThu),
                khoa,
                thanhVienString,
                ketQua,
                null, // SoNamThucHien - không dùng nữa
                data.tongSoTacGia || 0,
                0 // TongSoThanhVien - không phân biệt nữa
            ]
        );

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Thêm thông tin NCKH V2',
                `Thêm đề xuất nghiên cứu "${tenDeXuat}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Thêm đề xuất nghiên cứu thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi lưu đề xuất V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thêm đề xuất nghiên cứu.",
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
 * Lấy danh sách đề xuất nghiên cứu (V2)
 */
const getTableDeXuatV2 = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[V2] Lấy dữ liệu bảng dexuatnghiencuu Năm: ${NamHoc} Khoa: ${Khoa}`);

    let connection;
    try {
        connection = await createPoolConnection();

        let query = `SELECT * FROM dexuatnghiencuu WHERE NamHoc = ?`;
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
        console.error("Lỗi trong hàm getTableDeXuatV2:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EDIT
// =====================================================

/**
 * Sửa thông tin Đề xuất nghiên cứu (V2)
 */
const editDeXuatV2 = async (req, res) => {
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
        const [oldRows] = await connection.execute(`SELECT * FROM dexuatnghiencuu WHERE ID = ?`, [ID]);
        if (oldRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
        }
        const oldData = oldRows[0];

        const data = {
            CapDeXuat: req.body.CapDeXuat,
            TenDeXuat: req.body.TenDeXuat,
            MaSoDeXuat: req.body.MaSoDeXuat,
            TacGiaChinh: null, // Không dùng nữa
            DanhSachThanhVien: req.body.DanhSachThanhVien,
            NgayNghiemThu: nckhService.convertDateFormat(req.body.NgayNghiemThu),
            DaoTaoDuyet: req.body.DaoTaoDuyet,
            Khoa: req.body.Khoa,
            KetQua: req.body.KetQua,
            SoNamThucHien: null, // Không dùng nữa
            TongSoTacGia: req.body.TongSoTacGia || 0,
            TongSoThanhVien: 0 // Không phân biệt nữa
        };

        const updateQuery = `
            UPDATE dexuatnghiencuu 
            SET CapDeXuat = ?, TenDeXuat = ?, MaSoDeXuat = ?, TacGiaChinh = ?, 
                DanhSachThanhVien = ?, NgayNghiemThu = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?,
                SoNamThucHien = ?, TongSoTacGia = ?, TongSoThanhVien = ?
            WHERE ID = ?`;

        const queryParams = [
            data.CapDeXuat,
            data.TenDeXuat,
            data.MaSoDeXuat,
            data.TacGiaChinh,
            data.DanhSachThanhVien,
            data.NgayNghiemThu,
            data.DaoTaoDuyet,
            data.Khoa,
            data.KetQua,
            data.SoNamThucHien,
            data.TongSoTacGia,
            data.TongSoThanhVien,
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
        console.error("Lỗi khi cập nhật Đề xuất V2:", error);
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
    quyDoiSoGioDeXuatV2,
    saveDeXuatV2,
    getTableDeXuatV2,
    editDeXuatV2
};
