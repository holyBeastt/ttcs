/**
 * NCKH V2 - Bài Báo Khoa Học Controller
 * Logic riêng cho loại NCKH: Bài báo, báo cáo khoa học
 * Date: 2026-01-17
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");
const nckhService = require("../../services/nckhV2Service");

// =====================================================
// QUY ĐỔI SỐ TIẾT
// =====================================================

/**
 * Quy đổi số tiết cho Bài báo khoa học theo công thức V2
 * Công thức:
 * - 2 người: Tác giả chính = 2T/3, Thành viên = T/3
 * - 3 người: Tác giả chính = T/2, Mỗi thành viên = T/4
 * - >3 người: Tác giả chính = T/3 + (2T/3)/n, Mỗi thành viên = (2T/3)/n
 */
const quyDoiSoGioBaiBaoV2 = async (body, MaBang) => {
    const {
        loaiTapChi,
        tacGiaChinh,
        thanhVien,
        tongSoTacGia,
        soNamThucHien = 1
    } = body;

    // Lấy số tiết chuẩn từ DB
    const T = await nckhService.getSoTietChuan("LoaiTapChi", loaiTapChi, MaBang);

    // Sử dụng TongSoTacGia từ body
    const finalTongSoTacGia = parseInt(tongSoTacGia) || 0;

    if (finalTongSoTacGia === 0) {
        throw new Error("Phải có ít nhất 1 tác giả.");
    }

    // Tính tiết theo công thức V2
    const { chuNhiem: tietTacGiaChinh, thanhVien: tietThanhVien } = nckhService.quyDoiSoTietV2(
        T,
        finalTongSoTacGia,
        1, // soDongChuNhiem
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
 * Lưu bài báo khoa học mới (V2)
 */
const saveBaiBaoKhoaHocV2 = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    let connection;

    try {
        // Quy đổi số tiết theo công thức V2
        const data = await quyDoiSoGioBaiBaoV2(req.body, "baibaokhoahoc");

        const {
            loaiTapChi,
            chiSoTapChi,
            namHoc,
            tenBaiBao,
            tacGiaChinh,
            khoa,
            thanhVien,
            soNamThucHien = 1
        } = data;

        // Convert array thành string nếu cần
        const thanhVienString = Array.isArray(thanhVien) ? thanhVien.join(", ") : (thanhVien || "");

        connection = await createPoolConnection();

        // Chèn dữ liệu vào bảng baibaokhoahoc
        await connection.execute(
            `INSERT INTO baibaokhoahoc (
                LoaiTapChi, ChiSoTapChi, NamHoc, TenBaiBao, TacGia, 
                Khoa, DanhSachThanhVien, SoNamThucHien, TongSoTacGia, TongSoThanhVien
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                loaiTapChi,
                chiSoTapChi,
                namHoc,
                tenBaiBao,
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
                `Thêm bài báo khoa học "${tenBaiBao}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Thêm bài báo khoa học thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi lưu bài báo V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi thêm bài báo.",
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
 * Lấy danh sách bài báo khoa học (V2)
 */
const getTableBaiBaoKhoaHocV2 = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[V2] Lấy dữ liệu bảng baibaokhoahoc Năm: ${NamHoc} Khoa: ${Khoa}`);

    let connection;
    try {
        connection = await createPoolConnection();

        let query = `SELECT * FROM baibaokhoahoc WHERE NamHoc = ?`;
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
        console.error("Lỗi trong hàm getTableBaiBaoKhoaHocV2:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EDIT
// =====================================================

/**
 * Sửa thông tin Bài báo khoa học (V2)
 */
const editBaiBaoKhoaHocV2 = async (req, res) => {
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
        const [oldRows] = await connection.execute(`SELECT * FROM baibaokhoahoc WHERE ID = ?`, [ID]);
        if (oldRows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi để cập nhật." });
        }
        const oldData = oldRows[0];

        const data = {
            LoaiTapChi: req.body.LoaiTapChi,
            ChiSoTapChi: req.body.ChiSoTapChi,
            TenBaiBao: req.body.TenBaiBao,
            TacGia: req.body.TacGia,
            DanhSachThanhVien: req.body.DanhSachThanhVien,
            DaoTaoDuyet: req.body.DaoTaoDuyet,
            Khoa: req.body.Khoa,
            SoNamThucHien: req.body.SoNamThucHien || 1,
            TongSoTacGia: req.body.TongSoTacGia || 0,
            TongSoThanhVien: req.body.TongSoThanhVien || 0
        };

        const updateQuery = `
            UPDATE baibaokhoahoc 
            SET LoaiTapChi = ?, ChiSoTapChi = ?, TenBaiBao = ?, TacGia = ?, 
                DanhSachThanhVien = ?, DaoTaoDuyet = ?, Khoa = ?,
                SoNamThucHien = ?, TongSoTacGia = ?, TongSoThanhVien = ?
            WHERE ID = ?`;

        const queryParams = [
            data.LoaiTapChi,
            data.ChiSoTapChi,
            data.TenBaiBao,
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
        console.error("Lỗi khi cập nhật Bài báo V2:", error);
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
    quyDoiSoGioBaiBaoV2,
    saveBaiBaoKhoaHocV2,
    getTableBaiBaoKhoaHocV2,
    editBaiBaoKhoaHocV2
};
