/**
 * VUOT GIO V2 - Thêm Kết Thúc Học Phần Controller
 * CRUD cho bảng ketthuchocphan
 * Date: 2026-01-29
 * 
 * Cấu trúc bảng ketthuchocphan:
 * id, giangvien, khoa, ki, namhoc, hinhthuc, tenhocphan, lophocphan, 
 * doituong, baicham1, baicham2, tongso, sotietqc, ghichu, khoaduyet, khaothiduyet, daluu
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");

// =====================================================
// CRUD OPERATIONS
// =====================================================

/**
 * Thêm kết thúc học phần mới
 */
const save = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';
    
    let connection;
    try {
        connection = await createPoolConnection();
        
        const {
            giangvien,
            khoa,
            ki,
            namhoc,
            hinhthuc,      // Ra đề / Coi thi / Chấm thi
            tenhocphan,
            lophocphan,
            doituong,
            baicham1,
            baicham2,
            tongso,
            sotietqc,
            ghichu
        } = req.body;

        // Validate required fields
        if (!namhoc || !tenhocphan || !giangvien || !khoa || !hinhthuc) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Năm học, Tên HP, Giảng viên, Khoa, Hình thức"
            });
        }

        const query = `
            INSERT INTO ketthuchocphan 
            (giangvien, khoa, ki, namhoc, hinhthuc, tenhocphan, lophocphan, doituong, baicham1, baicham2, tongso, sotietqc, ghichu, khoaduyet, khaothiduyet, daluu)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
        `;

        const [result] = await connection.execute(query, [
            giangvien,
            khoa,
            ki || 1,
            namhoc,
            hinhthuc,
            tenhocphan,
            lophocphan || '',
            doituong || '',
            baicham1 || 0,
            baicham2 || 0,
            tongso || 0,
            sotietqc || 0,
            ghichu || ''
        ]);

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Thêm KTHP',
                `Thêm KTHP "${hinhthuc}" - HP: "${tenhocphan}" cho GV: "${giangvien}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Thêm kết thúc học phần thành công!",
            id: result.insertId
        });

    } catch (error) {
        console.error("Lỗi khi thêm KTHP:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi thêm kết thúc học phần."
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy danh sách kết thúc học phần
 */
const getTable = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[VuotGio V2] Lấy KTHP - Năm: ${NamHoc}, Khoa: ${Khoa}`);

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

        query += ` ORDER BY giangvien, tenhocphan, hinhthuc`;

        const [results] = await connection.execute(query, params);
        console.log(`[VuotGio V2] Found ${results.length} KTHP records`);
        
        res.json(results);

    } catch (error) {
        console.error("Lỗi khi lấy danh sách KTHP:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Cập nhật kết thúc học phần
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
            giangvien,
            khoa,
            ki,
            namhoc,
            hinhthuc,
            tenhocphan,
            lophocphan,
            doituong,
            baicham1,
            baicham2,
            tongso,
            sotietqc,
            ghichu
        } = req.body;

        const query = `
            UPDATE ketthuchocphan SET
                giangvien = ?,
                khoa = ?,
                ki = ?,
                namhoc = ?,
                hinhthuc = ?,
                tenhocphan = ?,
                lophocphan = ?,
                doituong = ?,
                baicham1 = ?,
                baicham2 = ?,
                tongso = ?,
                sotietqc = ?,
                ghichu = ?
            WHERE id = ?
        `;

        const [result] = await connection.execute(query, [
            giangvien,
            khoa,
            ki || 1,
            namhoc,
            hinhthuc,
            tenhocphan,
            lophocphan || '',
            doituong || '',
            baicham1 || 0,
            baicham2 || 0,
            tongso || 0,
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
                `Sửa KTHP ID: ${ID} - Hình thức: "${hinhthuc}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Cập nhật thành công!"
        });

    } catch (error) {
        console.error("Lỗi khi cập nhật KTHP:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Có lỗi xảy ra khi cập nhật."
        });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Xóa kết thúc học phần
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
            `SELECT hinhthuc, tenhocphan, giangvien FROM ketthuchocphan WHERE id = ?`,
            [ID]
        );

        const [result] = await connection.execute(
            `DELETE FROM ketthuchocphan WHERE id = ?`,
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
                'Xóa KTHP',
                `Xóa KTHP: "${info.hinhthuc}" - HP: "${info.tenhocphan}" - GV: "${info.giangvien}"`
            );
        } catch (logError) {
            console.error("Lỗi khi ghi log:", logError);
        }

        res.status(200).json({
            success: true,
            message: "Xóa thành công!"
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
// EXPORTS
// =====================================================

module.exports = {
    save,
    getTable,
    edit,
    delete: deleteRecord
};
