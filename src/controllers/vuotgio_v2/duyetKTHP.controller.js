/**
 * VUOT GIO V2 - Duyệt Kết Thúc Học Phần Controller
 * Duyệt/Từ chối dữ liệu KTHP - Refactored for batch approval
 * Date: 2026-04-08
 * 
 * Cấu trúc bảng mới: vg_coi_cham_ra_de
 * id, id_user, giang_vien, khoa, hoc_ky, nam_hoc, hinh_thuc, ten_hoc_phan,
 * lop_hoc_phan, doi_tuong, bai_cham_1, bai_cham_2, tong_so, quy_chuan,
 * ghi_chu, khoa_duyet, khao_thi_duyet
 * 
 * khoa_duyet: 0 = chờ duyệt, 1 = đã duyệt
 * khao_thi_duyet: 0 = chờ duyệt, 1 = đã duyệt
 */

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../../services/logService");

const COI_CHAM_RA_DE_TABLE = "vg_coi_cham_ra_de";

const buildKthpSelect = () => `
    id,
    id_user,
    giang_vien AS giangvien,
    giang_vien,
    khoa,
    hoc_ky AS ki,
    hoc_ky,
    nam_hoc AS namhoc,
    nam_hoc,
    hinh_thuc AS hinhthuc,
    hinh_thuc,
    ten_hoc_phan AS tenhocphan,
    ten_hoc_phan,
    lop_hoc_phan AS lophocphan,
    lop_hoc_phan,
    doi_tuong AS doituong,
    doi_tuong,
    bai_cham_1 AS baicham1,
    bai_cham_1,
    bai_cham_2 AS baicham2,
    bai_cham_2,
    tong_so AS tongso,
    tong_so,
    quy_chuan AS sotietqc,
    quy_chuan,
    ghi_chu AS ghichu,
    ghi_chu,
    khoa_duyet AS khoaduyet,
    khoa_duyet,
    khao_thi_duyet AS khaothiduyet,
    khao_thi_duyet
`;

const pick = (source, ...keys) => {
    for (const key of keys) {
        if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
            return source[key];
        }
    }
    return undefined;
};

const toInt = (value, fallback = 0) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const normalizeStatus = (record) => {
    const khoaDuyet = toInt(pick(record, "khoaduyet", "khoa_duyet"), 0);
    const khaoThiDuyet = khoaDuyet === 1 ? toInt(pick(record, "khaothiduyet", "khao_thi_duyet"), 0) : 0;

    return {
        id: record.id || record.ID,
        khoa_duyet: khoaDuyet,
        khao_thi_duyet: khaoThiDuyet
    };
};

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
            SELECT ${buildKthpSelect()}
            FROM ${COI_CHAM_RA_DE_TABLE}
            WHERE nam_hoc = ?
        `;
        const params = [NamHoc];

        if (Khoa && Khoa !== 'ALL') {
            query += ` AND khoa = ?`;
            params.push(Khoa);
        }

        query += ` ORDER BY khoa_duyet ASC, khao_thi_duyet ASC, giang_vien, ten_hoc_phan`;

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
            const normalized = normalizeStatus(record);

            const [result] = await connection.execute(`
                UPDATE ${COI_CHAM_RA_DE_TABLE} 
                SET khoa_duyet = ?, khao_thi_duyet = ?
                WHERE id = ?
            `, [normalized.khoa_duyet, normalized.khao_thi_duyet, normalized.id]);

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
            `SELECT id, khoa_duyet, khao_thi_duyet FROM ${COI_CHAM_RA_DE_TABLE} WHERE id = ?`,
            [ID]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản ghi."
            });
        }

        const record = existing[0];
        if (record.khoa_duyet === 1 || record.khao_thi_duyet === 1) {
            return res.status(400).json({
                success: false,
                message: "Không thể sửa bản ghi đã được duyệt."
            });
        }

        const data = req.body;

        const [result] = await connection.execute(`
            UPDATE ${COI_CHAM_RA_DE_TABLE} SET
                nam_hoc = ?,
                hoc_ky = ?,
                khoa = ?,
                ten_hoc_phan = ?,
                lop_hoc_phan = ?,
                giang_vien = ?,
                tong_so = ?,
                hinh_thuc = ?,
                quy_chuan = ?,
                ghi_chu = ?
            WHERE id = ?
        `, [
            pick(data, "nam_hoc", "namhoc", "NamHoc") || "",
            toInt(pick(data, "hoc_ky", "ki", "HocKy"), 1),
            pick(data, "khoa", "Khoa") || "",
            pick(data, "ten_hoc_phan", "tenhocphan", "TenHocPhan") || "",
            pick(data, "lop_hoc_phan", "lophocphan", "LopHocPhan") || '',
            pick(data, "giang_vien", "giangvien", "GiangVien") || '',
            toInt(pick(data, "tong_so", "tongso", "TongSo"), 0),
            pick(data, "hinh_thuc", "hinhthuc", "HinhThuc") || '',
            Number.parseFloat(pick(data, "quy_chuan", "sotietqc", "SoTietQC") || 0) || 0,
            pick(data, "ghi_chu", "ghichu", "GhiChu") || '',
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
                `Sửa KTHP ID: ${ID} - Hình thức: "${pick(data, "hinh_thuc", "hinhthuc", "HinhThuc") || ''}" - HP: "${pick(data, "ten_hoc_phan", "tenhocphan", "TenHocPhan") || ''}"`
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
            `SELECT id, hinh_thuc, ten_hoc_phan, giang_vien, khoa_duyet, khao_thi_duyet FROM ${COI_CHAM_RA_DE_TABLE} WHERE id = ?`,
            [ID]
        );

        if (existing.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy bản ghi."
            });
        }

        const record = existing[0];
        if (record.khoa_duyet === 1 || record.khao_thi_duyet === 1) {
            return res.status(400).json({
                success: false,
                message: "Không thể xóa bản ghi đã được duyệt."
            });
        }

        // Xóa bản ghi
        await connection.execute(`DELETE FROM ${COI_CHAM_RA_DE_TABLE} WHERE id = ?`, [ID]);

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Xóa KTHP',
                `Xóa KTHP ID: ${ID} - "${record.hinh_thuc}" - HP: "${record.ten_hoc_phan}" - GV: "${record.giang_vien}"`
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
            UPDATE ${COI_CHAM_RA_DE_TABLE} SET khoa_duyet = 1 WHERE id = ?
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
