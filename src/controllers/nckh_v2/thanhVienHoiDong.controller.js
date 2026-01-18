/**
 * NCKH V2 - Thành viên Hội đồng khoa học Controller
 * Logic riêng cho loại NCKH: Thành viên Hội đồng
 * Date: 2026-01-17
 * 
 * ĐẶC ĐIỂM: Cho phép nhiều thành viên, mỗi người nhận đủ số tiết (không chia)
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");
const nckhService = require("../../services/nckhV2Service");

// =====================================================
// QUY ĐỔI SỐ TIẾT (KHÔNG CHIA - MỖI NGƯỜI NHẬN ĐỦ)
// =====================================================

/**
 * Quy đổi số tiết cho Thành viên Hội đồng
 * Mỗi thành viên nhận đủ số tiết theo loại hội đồng (không chia)
 * Ví dụ: 10 tiết + 3 thành viên = mỗi người 10 tiết
 */
const quyDoiSoGioThanhVienHoiDongV2 = async (body, MaBang) => {
    const { loaiHoiDong, thanhVien } = body;

    // Lấy số tiết chuẩn từ DB (cố định theo loại hội đồng)
    const T = await nckhService.getSoTietChuan("CapDeTaiDuAn", loaiHoiDong, MaBang);

    // Format danh sách thành viên với số tiết (mỗi người nhận đủ T tiết)
    if (thanhVien && Array.isArray(thanhVien) && thanhVien.length > 0) {
        const formattedMembers = [];
        for (const member of thanhVien) {
            const { name, unit } = nckhService.extractNameAndUnit(member);
            if (unit) {
                formattedMembers.push(`${name} (${unit} - ${nckhService.formatHours(T)})`);
            } else {
                // Lookup Khoa cho giảng viên nội bộ
                const khoa = await nckhService.getKhoaByName(name);
                formattedMembers.push(khoa
                    ? `${name} (${khoa} - ${nckhService.formatHours(T)})`
                    : `${name} (${nckhService.formatHours(T)})`);
            }
        }
        body.danhSachThanhVien = formattedMembers.join(", ");
    } else if (thanhVien && typeof thanhVien === 'string') {
        // Nếu chỉ có 1 thành viên dạng string
        const { name, unit } = nckhService.extractNameAndUnit(thanhVien);
        if (unit) {
            body.danhSachThanhVien = `${name} (${unit} - ${nckhService.formatHours(T)})`;
        } else {
            // Lookup Khoa cho giảng viên nội bộ
            const khoa = await nckhService.getKhoaByName(name);
            body.danhSachThanhVien = khoa
                ? `${name} (${khoa} - ${nckhService.formatHours(T)})`
                : `${name} (${nckhService.formatHours(T)})`;
        }
    }


    body.soTiet = T;
    body.tongSoThanhVien = Array.isArray(thanhVien) ? thanhVien.length : (thanhVien ? 1 : 0);

    return body;
};

// =====================================================
// SAVE
// =====================================================

/**
 * Lưu Thành viên Hội đồng mới (V2)
 */
const saveThanhVienHoiDongV2 = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    let connection;

    try {
        // Quy đổi số tiết
        const data = await quyDoiSoGioThanhVienHoiDongV2(req.body, "thanhvienhoidong");

        const {
            loaiHoiDong,
            namHoc,
            tenDeTai,
            danhSachThanhVien,
            khoa,
            soTiet,
            tongSoThanhVien
        } = data;

        connection = await createPoolConnection();

        // Chèn dữ liệu
        await connection.execute(
            `INSERT INTO thanhvienhoidong (
                LoaiHoiDong, NamHoc, TenDeTai, ThanhVien, Khoa, SoTiet
            ) VALUES (?, ?, ?, ?, ?, ?)`,
            [
                loaiHoiDong,
                namHoc,
                tenDeTai || null,
                danhSachThanhVien,
                khoa,
                soTiet || 0
            ]
        );

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Thêm thông tin NCKH V2',
                `Thêm ${tongSoThanhVien} thành viên hội đồng - Loại: ${loaiHoiDong}`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: `Thêm ${tongSoThanhVien} thành viên hội đồng thành công!`,
        });
    } catch (error) {
        console.error("Lỗi khi lưu Thành viên Hội đồng V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thêm thành viên hội đồng.",
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
 * Lấy danh sách Thành viên Hội đồng (V2)
 */
const getTableThanhVienHoiDongV2 = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[V2] Lấy dữ liệu bảng thanhvienhoidong Năm: ${NamHoc} Khoa: ${Khoa}`);

    let connection;
    try {
        connection = await createPoolConnection();

        let query = `SELECT * FROM thanhvienhoidong WHERE NamHoc = ?`;
        let params = [NamHoc];

        // Build filter clause dựa trên Khoa (chỉ có ThanhVien)
        const { whereClause, params: khoaParams } = nckhService.buildKhoaFilterClause(Khoa, 'ThanhVien', null);
        query += whereClause;
        params = params.concat(khoaParams);

        console.log("Executing query:", query, "with params:", params);

        const [results] = await connection.execute(query, params);
        console.log(`Found ${results.length} records for NamHoc ${NamHoc}, Khoa ${Khoa}`);

        res.json(results);
    } catch (error) {
        console.error("Lỗi trong hàm getTableThanhVienHoiDongV2:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EDIT
// =====================================================

/**
 * Sửa thông tin Thành viên Hội đồng (V2)
 */
const editThanhVienHoiDongV2 = async (req, res) => {
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
        const [oldRows] = await connection.execute(`SELECT * FROM thanhvienhoidong WHERE ID = ?`, [ID]);
        if (oldRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
        }
        const oldData = oldRows[0];

        const data = {
            LoaiHoiDong: req.body.LoaiHoiDong,
            TenDeTai: req.body.TenDeTai,
            ThanhVien: req.body.ThanhVien,
            DaoTaoDuyet: req.body.DaoTaoDuyet,
            Khoa: req.body.Khoa,
            SoTiet: req.body.SoTiet || 0
        };

        const updateQuery = `
            UPDATE thanhvienhoidong 
            SET LoaiHoiDong = ?, TenDeTai = ?, ThanhVien = ?, 
                DaoTaoDuyet = ?, Khoa = ?, SoTiet = ?
            WHERE ID = ?`;

        const queryParams = [
            data.LoaiHoiDong,
            data.TenDeTai,
            data.ThanhVien,
            data.DaoTaoDuyet,
            data.Khoa,
            data.SoTiet,
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
        console.error("Lỗi khi cập nhật Thành viên Hội đồng V2:", error);
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
    quyDoiSoGioThanhVienHoiDongV2,
    saveThanhVienHoiDongV2,
    getTableThanhVienHoiDongV2,
    editThanhVienHoiDongV2
};
