/**
 * NCKH V2 - Giải Thưởng KHCN, Bằng Sáng Chế Controller
 * Logic riêng cho loại NCKH: Giải thưởng KH&CN; Bằng sáng chế, giải pháp hữu ích
 * Date: 2026-01-17
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");
const nckhService = require("../../services/nckhV2Service");

// =====================================================
// QUY ĐỔI SỐ TIẾT
// =====================================================

/**
 * Quy đổi số tiết cho Giải thưởng/Bằng sáng chế theo công thức V2
 */
const quyDoiSoGioGiaiThuongV2 = async (body, MaBang) => {
    const {
        loaiGiaiThuong,
        tacGiaChinh,
        thanhVien,
        tongSoTacGia,
        soNamThucHien = 1
    } = body;

    // Lấy số tiết chuẩn từ DB
    const T = await nckhService.getSoTietChuan("BangSangCheGiaiThuong", loaiGiaiThuong, MaBang);

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
 * Lưu giải thưởng/bằng sáng chế mới (V2)
 */
const saveGiaiThuongV2 = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    let connection;

    try {
        // Quy đổi số tiết theo công thức V2
        const data = await quyDoiSoGioGiaiThuongV2(req.body, "bangsangchevagiaithuong");

        const {
            loaiGiaiThuong,
            namHoc,
            tenGiaiThuong,
            soQuyetDinh,
            ngayQuyetDinh,
            tacGiaChinh,
            khoa,
            thanhVien,
            soNamThucHien = 1
        } = data;

        // Convert array thành string nếu cần
        const thanhVienString = Array.isArray(thanhVien) ? thanhVien.join(", ") : (thanhVien || "");

        connection = await createPoolConnection();

        // Chèn dữ liệu vào bảng bangsangchevagiaithuong
        await connection.execute(
            `INSERT INTO bangsangchevagiaithuong (
                PhanLoai, NamHoc, TenBangSangCheVaGiaiThuong, SoQDCongNhan, NgayQDCongNhan, 
                TacGia, Khoa, DanhSachThanhVien, SoNamThucHien, TongSoTacGia, TongSoThanhVien
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                loaiGiaiThuong,
                namHoc,
                tenGiaiThuong,
                soQuyetDinh,
                nckhService.convertDateFormat(ngayQuyetDinh),
                tacGiaChinh,
                khoa,
                thanhVienString,
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
                `Thêm giải thưởng/bằng sáng chế "${tenGiaiThuong}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Thêm giải thưởng/bằng sáng chế thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi lưu giải thưởng V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thêm giải thưởng.",
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
 * Lấy danh sách giải thưởng/bằng sáng chế (V2)
 */
const getTableGiaiThuongV2 = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[V2] Lấy dữ liệu bảng bangsangchevagiaithuong Năm: ${NamHoc} Khoa: ${Khoa}`);

    let connection;
    try {
        connection = await createPoolConnection();

        let query = `SELECT * FROM bangsangchevagiaithuong WHERE NamHoc = ?`;
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
        console.error("Lỗi trong hàm getTableGiaiThuongV2:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EDIT
// =====================================================

/**
 * Sửa thông tin Giải thưởng/Bằng sáng chế (V2)
 */
const editGiaiThuongV2 = async (req, res) => {
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
        const [oldRows] = await connection.execute(`SELECT * FROM bangsangchevagiaithuong WHERE ID = ?`, [ID]);
        if (oldRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
        }
        const oldData = oldRows[0];

        const data = {
            PhanLoai: req.body.PhanLoai,
            TenBangSangCheVaGiaiThuong: req.body.TenBangSangCheVaGiaiThuong,
            SoQDCongNhan: req.body.SoQDCongNhan,
            NgayQDCongNhan: nckhService.convertDateFormat(req.body.NgayQDCongNhan),
            TacGia: req.body.TacGia,
            DanhSachThanhVien: req.body.DanhSachThanhVien,
            DaoTaoDuyet: req.body.DaoTaoDuyet,
            Khoa: req.body.Khoa,
            SoNamThucHien: req.body.SoNamThucHien || 1,
            TongSoTacGia: req.body.TongSoTacGia || 0,
            TongSoThanhVien: req.body.TongSoThanhVien || 0
        };

        const updateQuery = `
            UPDATE bangsangchevagiaithuong 
            SET PhanLoai = ?, TenBangSangCheVaGiaiThuong = ?, SoQDCongNhan = ?, NgayQDCongNhan = ?, 
                TacGia = ?, DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?,
                SoNamThucHien = ?, TongSoTacGia = ?, TongSoThanhVien = ?
            WHERE ID = ?`;

        const queryParams = [
            data.PhanLoai,
            data.TenBangSangCheVaGiaiThuong,
            data.SoQDCongNhan,
            data.NgayQDCongNhan,
            data.TacGia,
            data.DanhSachThanhVien,
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
        console.error("Lỗi khi cập nhật Giải thưởng V2:", error);
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
    quyDoiSoGioGiaiThuongV2,
    saveGiaiThuongV2,
    getTableGiaiThuongV2,
    editGiaiThuongV2
};
