/**
 * NCKH V2 - Sáng Kiến Controller
 * Logic riêng cho loại NCKH: Sáng kiến
 * Date: 2026-01-17
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");
const nckhService = require("../../services/nckhV2Service");

// =====================================================
// QUY ĐỔI SỐ TIẾT
// =====================================================

/**
 * Quy đổi số tiết cho Sáng kiến theo công thức V2
 */
const quyDoiSoGioSangKienV2 = async (body, MaBang) => {
    const {
        loaiSangKien,
        tacGiaChinh,
        thanhVien,
        tongSoTacGia,
        soNamThucHien = 1
    } = body;

    // Lấy số tiết chuẩn từ DB
    const T = await nckhService.getSoTietChuan("LoaiSangKien", loaiSangKien, MaBang);

    // Sử dụng TongSoTacGia từ body
    const finalTongSoTacGia = parseInt(tongSoTacGia) || 0;

    if (finalTongSoTacGia === 0) {
        throw new Error("Phải có ít nhất 1 tác giả.");
    }

    // Tính tiết theo công thức V2 (soDongChuNhiem = 1 mặc định)
    const { chuNhiem: tietTacGiaChinh, thanhVien: tietThanhVien } = nckhService.quyDoiSoTietV2(
        T,
        finalTongSoTacGia,
        1, // Không cần soDongTacGia
        parseInt(soNamThucHien) || 1
    );

    // Format kết quả cho Tác giả chính
    if (tacGiaChinh) {
        const { name, unit } = nckhService.extractNameAndUnit(tacGiaChinh);
        if (unit) {
            body.tacGiaChinh = `${name} (${unit} - ${nckhService.formatHours(tietTacGiaChinh)})`;
        } else {
            // Lookup Khoa cho giảng viên nội bộ
            const khoa = await nckhService.getKhoaByName(name);
            body.tacGiaChinh = khoa
                ? `${name} (${khoa} - ${nckhService.formatHours(tietTacGiaChinh)})`
                : `${name} (${nckhService.formatHours(tietTacGiaChinh)})`;
        }
    }

    // Format kết quả cho Thành viên
    if (thanhVien && Array.isArray(thanhVien)) {
        const formattedMembers = [];
        for (const member of thanhVien) {
            const { name, unit } = nckhService.extractNameAndUnit(member);
            if (unit) {
                formattedMembers.push(`${name} (${unit} - ${nckhService.formatHours(tietThanhVien)})`);
            } else {
                // Lookup Khoa cho giảng viên nội bộ
                const khoa = await nckhService.getKhoaByName(name);
                formattedMembers.push(khoa
                    ? `${name} (${khoa} - ${nckhService.formatHours(tietThanhVien)})`
                    : `${name} (${nckhService.formatHours(tietThanhVien)})`);
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
 * Lưu sáng kiến mới (V2)
 */
const saveSangKienV2 = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    let connection;

    try {
        // Quy đổi số tiết theo công thức V2
        const data = await quyDoiSoGioSangKienV2(req.body, "sangkien");

        const {
            loaiSangKien,
            namHoc,
            tenSangKien,
            maSoSangKien,
            tacGiaChinh,
            ngayNghiemThu,
            khoa,
            thanhVien,
            ketQua,
            soNamThucHien = 1
        } = data;

        // Convert array thành string nếu cần
        const thanhVienString = Array.isArray(thanhVien) ? thanhVien.join(", ") : (thanhVien || "");

        connection = await createPoolConnection();

        // Chèn dữ liệu
        await connection.execute(
            `INSERT INTO sangkien (
                LoaiSangKien, NamHoc, TenSangKien, MaSoSangKien, TacGiaChinh, 
                NgayNghiemThu, Khoa, DanhSachThanhVien, KetQua,
                SoNamThucHien, TongSoTacGia, TongSoThanhVien
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                loaiSangKien,
                namHoc,
                tenSangKien,
                maSoSangKien,
                tacGiaChinh,
                nckhService.convertDateFormat(ngayNghiemThu),
                khoa,
                thanhVienString,
                ketQua,
                soNamThucHien,
                data.tongSoTacGia || 0,
                data.tongSoThanhVien || 0
            ]
        );

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Thêm thông tin NCKH V2',
                `Thêm sáng kiến "${tenSangKien}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Thêm sáng kiến thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi lưu sáng kiến V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thêm sáng kiến.",
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
 * Lấy danh sách sáng kiến (V2)
 */
const getTableSangKienV2 = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[V2] Lấy dữ liệu bảng sangkien Năm: ${NamHoc} Khoa: ${Khoa}`);

    let connection;
    try {
        connection = await createPoolConnection();

        let query = `SELECT * FROM sangkien WHERE NamHoc = ?`;
        let params = [NamHoc];

        // Build filter clause dựa trên Khoa (lọc trong TacGiaChinh và DanhSachThanhVien)
        const { whereClause, params: khoaParams } = nckhService.buildKhoaFilterClause(Khoa, 'TacGiaChinh', 'DanhSachThanhVien');
        query += whereClause;
        params = params.concat(khoaParams);

        console.log("Executing query:", query, "with params:", params);

        const [results] = await connection.execute(query, params);
        console.log(`Found ${results.length} records for NamHoc ${NamHoc}, Khoa ${Khoa}`);

        res.json(results);
    } catch (error) {
        console.error("Lỗi trong hàm getTableSangKienV2:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EDIT
// =====================================================

/**
 * Sửa thông tin Sáng kiến (V2)
 */
const editSangKienV2 = async (req, res) => {
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
        const [oldRows] = await connection.execute(`SELECT * FROM sangkien WHERE ID = ?`, [ID]);
        if (oldRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
        }
        const oldData = oldRows[0];

        const data = {
            LoaiSangKien: req.body.LoaiSangKien,
            TenSangKien: req.body.TenSangKien,
            MaSoSangKien: req.body.MaSoSangKien,
            TacGiaChinh: req.body.TacGiaChinh,
            DanhSachThanhVien: req.body.DanhSachThanhVien,
            NgayNghiemThu: nckhService.convertDateFormat(req.body.NgayNghiemThu),
            DaoTaoDuyet: req.body.DaoTaoDuyet,
            Khoa: req.body.Khoa,
            KetQua: req.body.KetQua,
            SoNamThucHien: req.body.SoNamThucHien || 1,
            TongSoTacGia: req.body.TongSoTacGia || 0,
            TongSoThanhVien: req.body.TongSoThanhVien || 0
        };

        const updateQuery = `
            UPDATE sangkien 
            SET LoaiSangKien = ?, TenSangKien = ?, MaSoSangKien = ?, TacGiaChinh = ?, 
                DanhSachThanhVien = ?, NgayNghiemThu = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?,
                SoNamThucHien = ?, TongSoTacGia = ?, TongSoThanhVien = ?
            WHERE ID = ?`;

        const queryParams = [
            data.LoaiSangKien,
            data.TenSangKien,
            data.MaSoSangKien,
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
        console.error("Lỗi khi cập nhật Sáng kiến V2:", error);
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
    quyDoiSoGioSangKienV2,
    saveSangKienV2,
    getTableSangKienV2,
    editSangKienV2
};
