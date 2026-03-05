/**
 * VUOT GIO V2 - Lớp Ngoài Quy Chuẩn Controller
 * CRUD cho bảng lopngoaiquychuan
 * Date: 2026-01-29
 * Updated: 2026-01-30 - Refactor theo cấu trúc bảng thực tế
 * 
 * Cấu trúc bảng lopngoaiquychuan:
 * ID, SoTC, TenHocPhan, id_User, LenLop, SoTietCTDT, HeSoT7CN, SoSV, 
 * HeSoLopDong, QuyChuan, HocKy, NamHoc, MaHocPhan, GiangVien, he_dao_tao, 
 * DoiTuong, HinhThucKTGiuaKy, SoTietKT, Lop, KhoaDuyet, DaoTaoDuyet, 
 * TaiChinhDuyet, Khoa, SoDe, GhiChu, HoanThanh
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");

// =====================================================
// CRUD OPERATIONS
// =====================================================

/**
 * Thêm lớp ngoài quy chuẩn mới
 */
const save = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';
    
    let connection;
    try {
        connection = await createPoolConnection();
        
        const {
            NamHoc,
            HocKy,
            TenHocPhan,
            MaHocPhan,
            SoTC,
            Lop,
            LenLop,
            SoSV,
            SoTietCTDT,
            SoTietKT,
            HeSoT7CN,
            HeSoLopDong,
            QuyChuan,
            GhiChu,
            GiangVien,
            Khoa,
            he_dao_tao,
            DoiTuong,
            HinhThucKTGiuaKy,
            SoDe,
            HoanThanh
        } = req.body;

        // Validate required fields
        if (!NamHoc || !TenHocPhan || !GiangVien || !Khoa) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Năm học, Tên học phần, Giảng viên, Khoa"
            });
        }

        const query = `
            INSERT INTO lopngoaiquychuan 
            (NamHoc, HocKy, TenHocPhan, MaHocPhan, SoTC, Lop, LenLop, SoSV, 
             SoTietCTDT, SoTietKT, HeSoT7CN, HeSoLopDong, QuyChuan, GhiChu, 
             GiangVien, Khoa, he_dao_tao, DoiTuong, HinhThucKTGiuaKy, SoDe, 
             HoanThanh, id_User)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await connection.execute(query, [
            NamHoc,
            HocKy || 1,
            TenHocPhan,
            MaHocPhan || '',
            SoTC || 0,
            Lop || '',
            LenLop || '',
            SoSV || 0,
            SoTietCTDT || 0,
            SoTietKT || 0,
            HeSoT7CN || 1,
            HeSoLopDong || 1,
            QuyChuan || 0,
            GhiChu || '',
            GiangVien,
            Khoa,
            he_dao_tao || '',
            DoiTuong || '',
            HinhThucKTGiuaKy || '',
            SoDe || 0,
            HoanThanh || 0,
            userId
        ]);

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Thêm lớp ngoài quy chuẩn',
                `Thêm lớp "${Lop}" - HP: "${TenHocPhan}" cho GV: "${GiangVien}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Thêm lớp ngoài quy chuẩn thành công!",
            id: result.insertId
        });

    } catch (error) {
        console.error("Lỗi khi thêm lớp ngoài quy chuẩn:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi thêm lớp ngoài quy chuẩn."
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy danh sách lớp ngoài quy chuẩn
 */
const getTable = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[VuotGio V2] Lấy lớp ngoài QC - Năm: ${NamHoc}, Khoa: ${Khoa}`);

    let connection;
    try {
        connection = await createPoolConnection();
        
        let query = `
            SELECT 
                ID, NamHoc, HocKy, TenHocPhan, MaHocPhan, SoTC, Lop, LenLop, SoSV,
                SoTietCTDT, SoTietKT, HeSoT7CN, HeSoLopDong, QuyChuan, GhiChu, 
                GiangVien, Khoa, he_dao_tao, DoiTuong, HinhThucKTGiuaKy, SoDe,
                KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet, HoanThanh, id_User
            FROM lopngoaiquychuan 
            WHERE NamHoc = ?
        `;
        const params = [NamHoc];

        if (Khoa && Khoa !== 'ALL') {
            query += ` AND Khoa = ?`;
            params.push(Khoa);
        }

        query += ` ORDER BY GiangVien, TenHocPhan`;

        const [results] = await connection.execute(query, params);
        console.log(`[VuotGio V2] Found ${results.length} lớp ngoài quy chuẩn`);
        
        res.json(results);

    } catch (error) {
        console.error("Lỗi khi lấy danh sách lớp ngoài quy chuẩn:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Cập nhật lớp ngoài quy chuẩn
 */
const edit = async (req, res) => {
    const { ID } = req.params;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID) {
        return res.status(400).json({ message: "Thiếu ID cần cập nhật." });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        const {
            NamHoc,
            HocKy,
            TenHocPhan,
            MaHocPhan,
            SoTC,
            Lop,
            LenLop,
            SoSV,
            SoTietCTDT,
            SoTietKT,
            HeSoT7CN,
            HeSoLopDong,
            QuyChuan,
            GhiChu,
            GiangVien,
            Khoa,
            he_dao_tao,
            DoiTuong,
            HinhThucKTGiuaKy,
            SoDe,
            HoanThanh
        } = req.body;

        const query = `
            UPDATE lopngoaiquychuan SET
                NamHoc = ?,
                HocKy = ?,
                TenHocPhan = ?,
                MaHocPhan = ?,
                SoTC = ?,
                Lop = ?,
                LenLop = ?,
                SoSV = ?,
                SoTietCTDT = ?,
                SoTietKT = ?,
                HeSoT7CN = ?,
                HeSoLopDong = ?,
                QuyChuan = ?,
                GhiChu = ?,
                GiangVien = ?,
                Khoa = ?,
                he_dao_tao = ?,
                DoiTuong = ?,
                HinhThucKTGiuaKy = ?,
                SoDe = ?,
                HoanThanh = ?,
                id_User = ?
            WHERE ID = ?
        `;

        const [result] = await connection.execute(query, [
            NamHoc,
            HocKy || 1,
            TenHocPhan,
            MaHocPhan || '',
            SoTC || 0,
            Lop || '',
            LenLop || '',
            SoSV || 0,
            SoTietCTDT || 0,
            SoTietKT || 0,
            HeSoT7CN || 1,
            HeSoLopDong || 1,
            QuyChuan || 0,
            GhiChu || '',
            GiangVien,
            Khoa,
            he_dao_tao || '',
            DoiTuong || '',
            HinhThucKTGiuaKy || '',
            SoDe || 0,
            HoanThanh || 0,
            userId,
            ID
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản ghi để cập nhật."
            });
        }

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Sửa lớp ngoài quy chuẩn',
                `Sửa lớp ID: ${ID} - Lớp: "${Lop}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật thành công!"
        });

    } catch (error) {
        console.error("Lỗi khi cập nhật lớp ngoài quy chuẩn:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi cập nhật."
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Xóa lớp ngoài quy chuẩn
 */
const deleteRecord = async (req, res) => {
    const { ID } = req.params;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID) {
        return res.status(400).json({ message: "Thiếu ID cần xóa." });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        // Lấy thông tin trước khi xóa để ghi log
        const [existing] = await connection.execute(
            `SELECT Lop, TenHocPhan, GiangVien FROM lopngoaiquychuan WHERE ID = ?`,
            [ID]
        );

        const [result] = await connection.execute(
            `DELETE FROM lopngoaiquychuan WHERE ID = ?`,
            [ID]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản ghi để xóa."
            });
        }

        // Ghi log
        try {
            const info = existing[0] || {};
            await LogService.logChange(
                userId,
                userName,
                'Xóa lớp ngoài quy chuẩn',
                `Xóa lớp: "${info.Lop}" - HP: "${info.TenHocPhan}" - GV: "${info.GiangVien}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Xóa thành công!"
        });

    } catch (error) {
        console.error("Lỗi khi xóa lớp ngoài quy chuẩn:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi xóa."
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Duyệt lớp ngoài quy chuẩn
 */
const approve = async (req, res) => {
    const { ID } = req.params;
    const { type } = req.body; // 'khoa' | 'daotao' | 'taichinh'
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    const columnMap = {
        'khoa': 'KhoaDuyet',
        'daotao': 'DaoTaoDuyet',
        'taichinh': 'TaiChinhDuyet'
    };

    const column = columnMap[type];
    if (!column) {
        return res.status(400).json({ success: false, message: "Loại duyệt không hợp lệ" });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        
        const [result] = await connection.execute(
            `UPDATE lopngoaiquychuan SET ${column} = 1 WHERE ID = ?`,
            [ID]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi" });
        }

        // Ghi log
        try {
            await LogService.logChange(userId, userName, 'Duyệt lớp ngoài QC', `Duyệt ${type} cho ID: ${ID}`);
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.json({ success: true, message: "Duyệt thành công" });
    } catch (error) {
        console.error("Lỗi khi duyệt:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Bỏ duyệt lớp ngoài quy chuẩn
 */
const unapprove = async (req, res) => {
    const { ID } = req.params;
    const { type } = req.body;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    const columnMap = {
        'khoa': 'KhoaDuyet',
        'daotao': 'DaoTaoDuyet',
        'taichinh': 'TaiChinhDuyet'
    };

    const column = columnMap[type];
    if (!column) {
        return res.status(400).json({ success: false, message: "Loại duyệt không hợp lệ" });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        
        const [result] = await connection.execute(
            `UPDATE lopngoaiquychuan SET ${column} = 0 WHERE ID = ?`,
            [ID]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi" });
        }

        // Ghi log
        try {
            await LogService.logChange(userId, userName, 'Bỏ duyệt lớp ngoài QC', `Bỏ duyệt ${type} cho ID: ${ID}`);
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.json({ success: true, message: "Bỏ duyệt thành công" });
    } catch (error) {
        console.error("Lỗi khi bỏ duyệt:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Batch cập nhật trạng thái duyệt cho nhiều bản ghi
 */
const batchApprove = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';
    const records = req.body;

    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ 
            success: false, 
            message: "Dữ liệu không hợp lệ" 
        });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        
        let updatedCount = 0;
        
        for (const record of records) {
            if (!record.ID) continue;
            
            const [result] = await connection.execute(
                `UPDATE lopngoaiquychuan 
                 SET KhoaDuyet = ?, DaoTaoDuyet = ?, TaiChinhDuyet = ?
                 WHERE ID = ?`,
                [
                    record.KhoaDuyet || 0,
                    record.DaoTaoDuyet || 0,
                    record.TaiChinhDuyet || 0,
                    record.ID
                ]
            );
            
            if (result.affectedRows > 0) {
                updatedCount++;
            }
        }

        // Ghi log
        try {
            await LogService.logChange(
                userId, 
                userName, 
                'Batch duyệt lớp ngoài QC', 
                `Cập nhật ${updatedCount} bản ghi`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.json({ 
            success: true, 
            message: `Cập nhật thành công ${updatedCount} bản ghi` 
        });
    } catch (error) {
        console.error("Lỗi khi batch approve:", error);
        res.status(500).json({ 
            success: false, 
            message: "Có lỗi xảy ra khi cập nhật" 
        });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// DELETE BY FILTER
// =====================================================

/**
 * Xóa toàn bộ lớp ngoài QC theo filter (NamHoc, HocKy, Khoa)
 */
const deleteByFilter = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';
    const { NamHoc, HocKy, Khoa } = req.body;

    if (!NamHoc) {
        return res.status(400).json({ success: false, message: "Cần chọn năm học" });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        let query = `DELETE FROM lopngoaiquychuan WHERE NamHoc = ?`;
        const params = [NamHoc];

        if (HocKy) {
            query += ` AND HocKy = ?`;
            params.push(HocKy);
        }

        if (Khoa && Khoa !== 'ALL') {
            query += ` AND Khoa = ?`;
            params.push(Khoa);
        }

        const [result] = await connection.execute(query, params);

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Xóa hàng loạt lớp ngoài QC',
                `Xóa ${result.affectedRows} dòng - NamHoc: ${NamHoc}, HocKy: ${HocKy || 'ALL'}, Khoa: ${Khoa || 'ALL'}`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.json({
            success: true,
            message: `Đã xóa ${result.affectedRows} dòng`
        });
    } catch (error) {
        console.error("Lỗi khi xóa hàng loạt:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra khi xóa" });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    save,
    getTable,
    edit,
    delete: deleteRecord,
    approve,
    unapprove,
    batchApprove,
    deleteByFilter
};
