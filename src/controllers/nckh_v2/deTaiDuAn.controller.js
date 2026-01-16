/**
 * NCKH V2 - Đề Tài Dự Án Controller
 * Logic riêng cho loại NCKH: Đề tài, Dự án
 * Date: 2026-01-16
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");
const nckhService = require("../../services/nckhV2Service");

// =====================================================
// QUY ĐỔI SỐ TIẾT
// =====================================================

/**
 * Quy đổi số tiết cho Đề tài Dự án theo công thức V2
 */
const quyDoiSoGioDeTaiDuAnV2 = async (body, MaBang) => {
    const {
        capDeTai,
        chuNhiem,
        thanhVien,
        tongSoTacGia,
        soDongChuNhiem = 1,
        soNamThucHien = 1
    } = body;

    // Lấy số tiết chuẩn từ DB
    const T = await nckhService.getSoTietChuan("CapDeTaiDuAn", capDeTai, MaBang);

    // Sử dụng TongSoTacGia từ body
    const finalTongSoTacGia = parseInt(tongSoTacGia) || 0;

    if (finalTongSoTacGia === 0) {
        throw new Error("Phải có ít nhất 1 tác giả.");
    }

    // Tính tiết theo công thức V2
    const { chuNhiem: tietChuNhiem, thanhVien: tietThanhVien } = nckhService.quyDoiSoTietV2(
        T,
        finalTongSoTacGia,
        parseInt(soDongChuNhiem) || 1,
        parseInt(soNamThucHien) || 1
    );

    // Format kết quả cho Chủ nhiệm
    if (chuNhiem) {
        const { name, unit } = nckhService.extractNameAndUnit(chuNhiem);
        if (unit) {
            body.chuNhiem = `${name} (${unit} - ${nckhService.formatHours(tietChuNhiem)})`;
        } else {
            body.chuNhiem = `${name} (${nckhService.formatHours(tietChuNhiem)})`;
        }
    }

    // Format kết quả cho Thành viên
    if (thanhVien && Array.isArray(thanhVien)) {
        body.thanhVien = thanhVien
            .map((member) => {
                const { name, unit } = nckhService.extractNameAndUnit(member);
                if (unit) {
                    return `${name} (${unit} - ${nckhService.formatHours(tietThanhVien)})`;
                } else {
                    return `${name} (${nckhService.formatHours(tietThanhVien)})`;
                }
            })
            .join(", ");
    }

    return body;
};

// =====================================================
// SAVE
// =====================================================

/**
 * Lưu đề tài dự án mới (V2)
 */
const saveDeTaiDuAnV2 = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    let connection;

    try {
        // Quy đổi số tiết theo công thức V2
        const data = await quyDoiSoGioDeTaiDuAnV2(req.body, "detaiduan");

        const {
            capDeTai,
            namHoc,
            tenDeTai,
            maDeTai,
            chuNhiem,
            ngayNghiemThu,
            khoa,
            thanhVien,
            ketQua,
            soDongChuNhiem = 1,
            soNamThucHien = 1
        } = data;

        // Convert array thành string nếu cần
        const thanhVienString = Array.isArray(thanhVien) ? thanhVien.join(", ") : (thanhVien || "");

        connection = await createPoolConnection();

        // Chèn dữ liệu
        await connection.execute(
            `INSERT INTO detaiduan (
                CapDeTai, NamHoc, TenDeTai, MaSoDeTai, ChuNhiem, 
                NgayNghiemThu, Khoa, DanhSachThanhVien, KetQua,
                SoDongChuNhiem, SoNamThucHien, TongSoTacGia, TongSoThanhVien
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                capDeTai,
                namHoc,
                tenDeTai,
                maDeTai,
                chuNhiem,
                ngayNghiemThu,
                khoa,
                thanhVienString,
                ketQua,
                soDongChuNhiem,
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
                `Thêm đề tài dự án "${tenDeTai}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Thêm đề tài, dự án thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi lưu đề tài dự án V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thêm đề tài, dự án.",
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
 * Lấy danh sách đề tài dự án (V2)
 */
const getTableDeTaiDuAnV2 = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[V2] Lấy dữ liệu bảng detaiduan Năm: ${NamHoc} Khoa: ${Khoa}`);

    let connection;
    try {
        connection = await createPoolConnection();

        let query, params;

        if (Khoa === "ALL") {
            query = `SELECT * FROM detaiduan WHERE NamHoc = ?`;
            params = [NamHoc];
        } else {
            query = `SELECT * FROM detaiduan WHERE NamHoc = ? AND Khoa = ?`;
            params = [NamHoc, Khoa];
        }

        console.log("Executing query:", query, "with params:", params);

        const [results] = await connection.execute(query, params);
        console.log(`Found ${results.length} records for NamHoc ${NamHoc}, Khoa ${Khoa}`);

        res.json(results);
    } catch (error) {
        console.error("Lỗi trong hàm getTableDeTaiDuAnV2:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EDIT
// =====================================================

/**
 * Sửa thông tin Đề tài Dự án (V2)
 */
const editDeTaiDuAnV2 = async (req, res) => {
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
        const [oldRows] = await connection.execute(`SELECT * FROM detaiduan WHERE ID = ?`, [ID]);
        if (oldRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
        }
        const oldData = oldRows[0];

        const data = {
            CapDeTai: req.body.CapDeTai,
            TenDeTai: req.body.TenDeTai,
            MaSoDeTai: req.body.MaSoDeTai,
            ChuNhiem: req.body.ChuNhiem,
            DanhSachThanhVien: req.body.DanhSachThanhVien,
            NgayNghiemThu: nckhService.convertDateFormat(req.body.NgayNghiemThu),
            DaoTaoDuyet: req.body.DaoTaoDuyet,
            Khoa: req.body.Khoa,
            KetQua: req.body.KetQua,
            SoDongChuNhiem: req.body.SoDongChuNhiem || 1,
            SoNamThucHien: req.body.SoNamThucHien || 1,
            TongSoTacGia: req.body.TongSoTacGia || 0,
            TongSoThanhVien: req.body.TongSoThanhVien || 0
        };

        const updateQuery = `
            UPDATE detaiduan 
            SET CapDeTai = ?, TenDeTai = ?, MaSoDeTai = ?, ChuNhiem = ?, 
                DanhSachThanhVien = ?, NgayNghiemThu = ?, DaoTaoDuyet = ?, Khoa = ?, KetQua = ?,
                SoDongChuNhiem = ?, SoNamThucHien = ?, TongSoTacGia = ?, TongSoThanhVien = ?
            WHERE ID = ?`;

        const queryParams = [
            data.CapDeTai,
            data.TenDeTai,
            data.MaSoDeTai,
            data.ChuNhiem,
            data.DanhSachThanhVien,
            data.NgayNghiemThu,
            data.DaoTaoDuyet,
            data.Khoa,
            data.KetQua,
            data.SoDongChuNhiem,
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
        console.error("Lỗi khi cập nhật Đề tài Dự án V2:", error);
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
    quyDoiSoGioDeTaiDuAnV2,
    saveDeTaiDuAnV2,
    getTableDeTaiDuAnV2,
    editDeTaiDuAnV2
};
