/**
 * NCKH V2 - Base Controller
 * Các hàm CRUD dùng chung cho tất cả loại NCKH
 * Date: 2026-01-16
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");
const nckhService = require("../../services/nckhV2Service");

// =====================================================
// RENDER VIEWS
// =====================================================

const getDanhSachNCKHV2 = (req, res) => {
    res.render("nckh.danhSachNCKH.ejs");
};

// =====================================================
// CRUD OPERATIONS (GENERIC)
// =====================================================

/**
 * Cập nhật một field cụ thể
 */
const updateFieldNckhV2 = async (req, res) => {
    const { ID, namHoc, MaBang } = req.params;
    const { field, value } = req.body;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID || !MaBang || !field) {
        return res.status(400).json({
            success: false,
            message: "Thiếu thông tin cần thiết."
        });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        const [rows] = await connection.execute(
            `SELECT * FROM ${MaBang} WHERE ID = ?`,
            [ID]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản ghi."
            });
        }

        const oldData = rows[0];

        await connection.execute(
            `UPDATE ${MaBang} SET ${field} = ? WHERE ID = ?`,
            [value, ID]
        );

        if (field === 'DaoTaoDuyet' && oldData.DaoTaoDuyet !== value) {
            try {
                const action = value === 1 ? 'Duyệt' : 'Bỏ duyệt';
                await LogService.logChange(
                    userId,
                    userName,
                    `${action} NCKH V2`,
                    `${action} ${MaBang} ID: ${ID}`
                );
            } catch (logError) {
                console.error("Lỗi khi ghi log:", logError);
            }
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi cập nhật field V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi cập nhật.",
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Xóa thông tin NCKH
 * Không cho xóa khi đã duyệt
 */
const deleteNckhV2 = async (req, res) => {
    const { ID, namHoc, MaBang } = req.params;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID || !MaBang) {
        return res.status(400).json({ message: "Thiếu thông tin cần thiết." });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        // Kiểm tra trạng thái duyệt trước khi xóa
        const [rows] = await connection.execute(
            `SELECT * FROM ${MaBang} WHERE ID = ?`,
            [ID]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy bản ghi." });
        }

        // Không cho xóa nếu đã duyệt
        if (rows[0].DaoTaoDuyet === 1) {
            return res.status(403).json({
                success: false,
                message: "Không thể xóa bản ghi đã được duyệt."
            });
        }

        // Thực hiện xóa
        await connection.execute(`DELETE FROM ${MaBang} WHERE ID = ?`, [ID]);

        // Ghi log
        try {
            let entityName = rows[0].TenDeTai || rows[0].TenSangKien || rows[0].TenBaiBao || `ID:${ID}`;
            await LogService.logChange(
                userId,
                userName,
                'Xóa thông tin NCKH V2',
                `Xóa "${entityName}" từ bảng ${MaBang}`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log xóa:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Xóa thành công!",
        });
    } catch (error) {
        console.error("Lỗi khi xóa V2:", error);
        res.status(500).json({
            success: false,
            message: "Có lỗi xảy ra khi xóa.",
            error: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// API CHUNG
// =====================================================

/**
 * Lấy danh sách giảng viên cơ hữu
 */
const getTeacherV2 = async (req, res) => {
    let connection;
    try {
        connection = await createPoolConnection();
        const [results] = await connection.execute(
            `SELECT TenNhanVien AS HoTen, MonGiangDayChinh FROM nhanvien`
        );
        res.json(results);
    } catch (error) {
        console.error("Error fetching teachers V2:", error);
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu giảng viên" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy dữ liệu quy định số tiết cho dropdown
 */
const getDataV2 = async (req, res) => {
    const { MaBang } = req.params;

    let connection;
    try {
        connection = await createPoolConnection();

        let query = "";

        switch (MaBang) {
            case "detaiduan":
                query = `SELECT DISTINCT CapDeTaiDuAn, SoGio FROM quydinhsogionckh WHERE MaBang = ? AND CapDeTaiDuAn IS NOT NULL`;
                break;
            case "sangkien":
                query = `SELECT DISTINCT LoaiSangKien, SoGio FROM quydinhsogionckh WHERE MaBang = ? AND LoaiSangKien IS NOT NULL`;
                break;
            case "baibaokhoahoc":
                query = `SELECT DISTINCT LoaiTapChi, SoGio FROM quydinhsogionckh WHERE MaBang = ? AND LoaiTapChi IS NOT NULL`;
                break;
            case "bangsangchevagiaithuong":
                query = `SELECT DISTINCT BangSangCheGiaiThuong, SoGio FROM quydinhsogionckh WHERE MaBang = ? AND BangSangCheGiaiThuong IS NOT NULL`;
                break;
            case "dexuatnghiencuu":
                query = `SELECT DISTINCT CapDeXuat, SoGio FROM quydinhsogionckh WHERE MaBang = ? AND CapDeXuat IS NOT NULL`;
                break;
            case "thanhvienhoidong":
                query = `SELECT DISTINCT CapDeTaiDuAn, SoGio FROM quydinhsogionckh WHERE MaBang = ? AND CapDeTaiDuAn IS NOT NULL`;
                break;
            default:
                query = `SELECT * FROM quydinhsogionckh WHERE MaBang = ?`;
        }

        const [results] = await connection.execute(query, [MaBang]);
        res.json(results);
    } catch (error) {
        console.error("Error fetching data V2:", error);
        res.status(500).json({ message: "Lỗi khi lấy dữ liệu" });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    // Render views
    getDanhSachNCKHV2,

    // CRUD chung
    updateFieldNckhV2,
    deleteNckhV2,

    // API chung
    getTeacherV2,
    getDataV2,

    // Edit routing - sẽ được override bởi controller cụ thể
    // Hàm này chỉ là fallback, logic edit thực tế nằm trong các controller riêng
    editNckhV2: async (req, res) => {
        // Route edit request đến controller phù hợp dựa vào MaBang
        const { MaBang } = req.params;

        // Import dynamic để tránh circular dependency
        const deTaiDuAnController = require('./deTaiDuAn.controller');
        const sangKienController = require('./sangKien.controller');
        const deXuatController = require('./deXuatNghienCuu.controller');
        const thanhVienHoiDongController = require('./thanhVienHoiDong.controller');

        switch (MaBang) {
            case 'detaiduan':
                return deTaiDuAnController.editDeTaiDuAnV2(req, res);
            case 'sangkien':
                return sangKienController.editSangKienV2(req, res);
            case 'dexuatnghiencuu':
                return deXuatController.editDeXuatV2(req, res);
            case 'thanhvienhoidong':
                return thanhVienHoiDongController.editThanhVienHoiDongV2(req, res);
            default:
                return res.status(400).json({
                    success: false,
                    message: `Loại bảng "${MaBang}" chưa được hỗ trợ trong V2.`
                });
        }
    }
};
