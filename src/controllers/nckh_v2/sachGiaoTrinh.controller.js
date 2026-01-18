/**
 * NCKH V2 - Sách, Giáo Trình Controller
 * Logic riêng cho loại NCKH: Sách, giáo trình, tài liệu
 * Date: 2026-01-17
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");
const nckhService = require("../../services/nckhV2Service");

// =====================================================
// QUY ĐỔI SỐ TIẾT
// =====================================================

/**
 * Quy đổi số tiết cho Sách/Giáo trình theo công thức V2
 */
const quyDoiSoGioSachGiaoTrinhV2 = async (body, MaBang) => {
    const {
        phanLoai,
        tacGiaChinh,
        thanhVien,
        tongSoTacGia,
        soNamThucHien = 1
    } = body;

    // Lấy số tiết chuẩn từ DB
    const T = await nckhService.getSoTietChuan("SachGiaoTrinh", phanLoai, MaBang);

    // Sử dụng TongSoTacGia từ body
    const finalTongSoTacGia = parseInt(tongSoTacGia) || 0;

    if (finalTongSoTacGia === 0) {
        throw new Error("Phải có ít nhất 1 tác giả.");
    }

    // Đếm số chủ biên (tác giả chính)
    const soChuBien = Array.isArray(tacGiaChinh) ? tacGiaChinh.length : (tacGiaChinh ? 1 : 0);

    // Tính tiết theo công thức V2
    const { chuNhiem: tietTacGiaChinh, thanhVien: tietThanhVien } = nckhService.quyDoiSoTietV2(
        T,
        finalTongSoTacGia,
        soChuBien, // Số đồng chủ biên
        parseInt(soNamThucHien) || 1
    );

    // Format kết quả cho Tác giả chính (hỗ trợ nhiều tác giả)
    if (tacGiaChinh) {
        const tacGiaList = Array.isArray(tacGiaChinh) ? tacGiaChinh : [tacGiaChinh];
        const formattedTacGia = [];
        for (const tg of tacGiaList) {
            const { name, unit } = nckhService.extractNameAndUnit(tg);
            if (unit) {
                formattedTacGia.push(`${name} (${unit} - ${nckhService.formatHours(tietTacGiaChinh)})`);
            } else {
                // Lookup Khoa cho giảng viên nội bộ
                const khoa = await nckhService.getKhoaByName(name);
                formattedTacGia.push(khoa
                    ? `${name} (${khoa} - ${nckhService.formatHours(tietTacGiaChinh)})`
                    : `${name} (${nckhService.formatHours(tietTacGiaChinh)})`);
            }
        }
        body.tacGiaChinh = formattedTacGia.join(", ");
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
 * Lưu sách/giáo trình mới (V2)
 */
const saveSachGiaoTrinhV2 = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    let connection;

    try {
        // Quy đổi số tiết theo công thức V2
        const data = await quyDoiSoGioSachGiaoTrinhV2(req.body, "sachvagiaotrinh");

        const {
            phanLoai,
            namHoc,
            tenSachGiaoTrinh,
            soXuatBan,
            soTrang,
            ketQua,
            tacGiaChinh,
            khoa,
            thanhVien,
            soNamThucHien = 1
        } = data;

        // Convert array thành string nếu cần
        const thanhVienString = Array.isArray(thanhVien) ? thanhVien.join(", ") : (thanhVien || "");

        connection = await createPoolConnection();

        // Chèn dữ liệu vào bảng sachvagiaotrinh
        await connection.execute(
            `INSERT INTO sachvagiaotrinh (
                PhanLoai, NamHoc, TenSachVaGiaoTrinh, SoXuatBan, SoTrang, 
                TacGia, DanhSachThanhVien, Khoa, KetQua, SoNamThucHien, 
                TongSoTacGia, TongSoThanhVien
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                phanLoai,
                namHoc,
                tenSachGiaoTrinh,
                soXuatBan,
                soTrang,
                tacGiaChinh,
                thanhVienString,
                khoa,
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
                `Thêm sách/giáo trình "${tenSachGiaoTrinh}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Thêm sách/giáo trình thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi lưu sách/giáo trình V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thêm sách/giáo trình.",
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
 * Lấy danh sách sách/giáo trình (V2)
 */
const getTableSachGiaoTrinhV2 = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[V2] Lấy dữ liệu bảng sachvagiaotrinh Năm: ${NamHoc} Khoa: ${Khoa}`);

    let connection;
    try {
        connection = await createPoolConnection();

        let query = `SELECT * FROM sachvagiaotrinh WHERE NamHoc = ?`;
        let params = [NamHoc];

        // Build filter clause dựa trên Khoa (lọc trong TacGia và DanhSachThanhVien)
        const { whereClause, params: khoaParams } = nckhService.buildKhoaFilterClause(Khoa, 'TacGia', 'DanhSachThanhVien');
        query += whereClause;
        params = params.concat(khoaParams);

        console.log("Executing query:", query, "with params:", params);

        const [results] = await connection.execute(query, params);
        console.log(`Found ${results.length} records for NamHoc ${NamHoc}, Khoa ${Khoa}`);

        res.json(results);
    } catch (error) {
        console.error("Lỗi trong hàm getTableSachGiaoTrinhV2:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EDIT
// =====================================================

/**
 * Sửa thông tin Sách/Giáo trình (V2)
 */
const editSachGiaoTrinhV2 = async (req, res) => {
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
        const [oldRows] = await connection.execute(`SELECT * FROM sachvagiaotrinh WHERE ID = ?`, [ID]);
        if (oldRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
        }
        const oldData = oldRows[0];

        const data = {
            PhanLoai: req.body.PhanLoai,
            TenSachVaGiaoTrinh: req.body.TenSachVaGiaoTrinh,
            SoXuatBan: req.body.SoXuatBan,
            SoTrang: req.body.SoTrang,
            TacGia: req.body.TacGia,
            DanhSachThanhVien: req.body.DanhSachThanhVien,
            KetQua: req.body.KetQua,
            DaoTaoDuyet: req.body.DaoTaoDuyet,
            Khoa: req.body.Khoa,
            SoNamThucHien: req.body.SoNamThucHien || 1,
            TongSoTacGia: req.body.TongSoTacGia || 0,
            TongSoThanhVien: req.body.TongSoThanhVien || 0
        };

        const updateQuery = `
            UPDATE sachvagiaotrinh 
            SET PhanLoai = ?, TenSachVaGiaoTrinh = ?, SoXuatBan = ?, SoTrang = ?, 
                TacGia = ?, DanhSachThanhVien = ?, KetQua = ?, DaoTaoDuyet = ?, Khoa = ?,
                SoNamThucHien = ?, TongSoTacGia = ?, TongSoThanhVien = ?
            WHERE ID = ?`;

        const queryParams = [
            data.PhanLoai,
            data.TenSachVaGiaoTrinh,
            data.SoXuatBan,
            data.SoTrang,
            data.TacGia,
            data.DanhSachThanhVien,
            data.KetQua,
            data.DaoTaoDuyet,
            data.Khoa,
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
        console.error("Lỗi khi cập nhật Sách/Giáo trình V2:", error);
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
    quyDoiSoGioSachGiaoTrinhV2,
    saveSachGiaoTrinhV2,
    getTableSachGiaoTrinhV2,
    editSachGiaoTrinhV2
};
