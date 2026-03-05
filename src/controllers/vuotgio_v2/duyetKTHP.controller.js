/**
 * VUOT GIO V2 - Duyệt Kết Thúc Học Phần Controller
 * Duyệt/Từ chối dữ liệu KTHP - Refactored for batch approval
 * Date: 2026-02-02
 * 
 * Cấu trúc bảng ketthuchocphan:
 * id, giangvien, khoa, ki, namhoc, hinhthuc, tenhocphan, lophocphan, 
 * doituong, baicham1, baicham2, tongso, sotietqc, ghichu, khoaduyet, khaothiduyet, daluu
 * 
 * khoaduyet: 0 = chờ duyệt, 1 = đã duyệt
 * khaothiduyet: 0 = chờ duyệt, 1 = đã duyệt  
 * daluu: 0 = chưa lưu, 1 = đã lưu
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");

// =====================================================
// API OPERATIONS
// =====================================================

/**
 * Lấy danh sách KTHP cần duyệt
 */
const getTable = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[VuotGio V2] Lấy KTHP cần duyệt - Năm: ${NamHoc}, Khoa: ${Khoa}`);

    let connection;
    try {
        connection = await createPoolConnection();
        
        let query = `
            SELECT 
                id, giangvien, khoa, ki, namhoc, hinhthuc, tenhocphan, 
                lophocphan, doituong, baicham1, baicham2, tongso, sotietqc, 
                ghichu, khoaduyet, khaothiduyet, daluu
            FROM ketthuchocphan 
            WHERE namhoc = ?
        `;
        const params = [NamHoc];

        if (Khoa && Khoa !== 'ALL') {
            query += ` AND khoa = ?`;
            params.push(Khoa);
        }

        query += ` ORDER BY khoaduyet ASC, khaothiduyet ASC, giangvien, tenhocphan`;

        const [results] = await connection.execute(query, params);
        console.log(`[VuotGio V2] Found ${results.length} KTHP records for approval`);
        
        res.json(results);

    } catch (error) {
        console.error("Lỗi khi lấy danh sách KTHP cần duyệt:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Batch approve - Cập nhật nhiều bản ghi cùng lúc
 */
const batchApprove = async (req, res) => {
    const records = req.body; // Array of {id, khoaduyet, khaothiduyet}
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!records || !Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ 
            success: false,
            message: "Thiếu dữ liệu cần cập nhật." 
        });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        
        let updatedCount = 0;

        for (const record of records) {
            const { id, khoaduyet, khaothiduyet } = record;
            
            // Validate: Nếu Khoa chưa duyệt thì Khảo thí không được duyệt
            const finalKhaoThi = khoaduyet === 1 ? khaothiduyet : 0;
            
            const [result] = await connection.execute(`
                UPDATE ketthuchocphan 
                SET khoaduyet = ?, khaothiduyet = ?
                WHERE id = ?
            `, [khoaduyet, finalKhaoThi, id]);

            if (result.affectedRows > 0) {
                updatedCount++;
            }
        }

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Batch Duyệt KTHP',
                `Cập nhật trạng thái duyệt cho ${updatedCount} bản ghi KTHP`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: `Đã cập nhật ${updatedCount} bản ghi!`
        });

    } catch (error) {
        console.error("Lỗi khi batch approve KTHP:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi cập nhật."
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Sửa KTHP
 */
const edit = async (req, res) => {
    const { ID } = req.params;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID) {
        return res.status(400).json({ message: "Thiếu ID cần sửa." });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        // Kiểm tra bản ghi có cho phép sửa không (chưa duyệt)
        const [existing] = await connection.execute(
            `SELECT id, khoaduyet, khaothiduyet FROM ketthuchocphan WHERE id = ?`,
            [ID]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản ghi."
            });
        }

        const record = existing[0];
        if (record.khoaduyet === 1 || record.khaothiduyet === 1) {
            return res.status(400).json({
                success: false,
                message: "Không thể sửa bản ghi đã được duyệt."
            });
        }

        const {
            namhoc,
            ki,
            khoa,
            tenhocphan,
            mahocphan,
            sotc,
            giangvien,
            lophocphan,
            tongso,
            hinhthuc,
            sotietqc,
            ghichu
        } = req.body;

        const [result] = await connection.execute(`
            UPDATE ketthuchocphan SET
                namhoc = ?,
                ki = ?,
                khoa = ?,
                tenhocphan = ?,
                lophocphan = ?,
                giangvien = ?,
                tongso = ?,
                hinhthuc = ?,
                sotietqc = ?,
                ghichu = ?
            WHERE id = ?
        `, [
            namhoc,
            ki || 1,
            khoa,
            tenhocphan,
            lophocphan || '',
            giangvien,
            tongso || 0,
            hinhthuc,
            sotietqc || 0,
            ghichu || '',
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
                'Sửa KTHP',
                `Sửa KTHP ID: ${ID} - Hình thức: "${hinhthuc}" - HP: "${tenhocphan}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật thành công!"
        });

    } catch (error) {
        console.error("Lỗi khi sửa KTHP:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi cập nhật."
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Xóa KTHP
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

        // Kiểm tra bản ghi có cho phép xóa không (chưa duyệt)
        const [existing] = await connection.execute(
            `SELECT id, hinhthuc, tenhocphan, giangvien, khoaduyet, khaothiduyet FROM ketthuchocphan WHERE id = ?`,
            [ID]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản ghi."
            });
        }

        const record = existing[0];
        if (record.khoaduyet === 1 || record.khaothiduyet === 1) {
            return res.status(400).json({
                success: false,
                message: "Không thể xóa bản ghi đã được duyệt."
            });
        }

        // Xóa bản ghi
        await connection.execute(`DELETE FROM ketthuchocphan WHERE id = ?`, [ID]);

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Xóa KTHP',
                `Xóa KTHP ID: ${ID} - "${record.hinhthuc}" - HP: "${record.tenhocphan}" - GV: "${record.giangvien}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Đã xóa bản ghi!"
        });

    } catch (error) {
        console.error("Lỗi khi xóa KTHP:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi xóa."
        });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// DEPRECATED - Kept for backward compatibility
// =====================================================

/**
 * Duyệt KTHP (khoa duyệt) - DEPRECATED
 */
const approve = async (req, res) => {
    const { ID } = req.params;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID) {
        return res.status(400).json({ message: "Thiếu ID cần duyệt." });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        const [result] = await connection.execute(`
            UPDATE ketthuchocphan SET khoaduyet = 1 WHERE id = ?
        `, [ID]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản ghi."
            });
        }

        try {
            await LogService.logChange(userId, userName, 'Duyệt KTHP', `Duyệt KTHP ID: ${ID}`);
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Duyệt thành công!"
        });

    } catch (error) {
        console.error("Lỗi khi duyệt KTHP:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi duyệt."
        });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
    getTable,
    batchApprove,
    edit,
    delete: deleteRecord,
    approve // Deprecated but kept for backward compatibility
};
