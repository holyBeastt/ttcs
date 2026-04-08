/**
 * VUOT GIO V2 - Thêm Kết Thúc Học Phần Controller
 * CRUD cho bảng vg_coi_cham_ra_de
 * Date: 2026-04-08
 * 
 * Cấu trúc bảng mới:
 * id, id_user, giang_vien, khoa, hoc_ky, nam_hoc, hinh_thuc, ten_hoc_phan,
 * lop_hoc_phan, doi_tuong, bai_cham_1, bai_cham_2, tong_so, quy_chuan,
 * ghi_chu, khoa_duyet, khao_thi_duyet
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

const toInt = (value, fallback = 0) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const toDecimal = (value, fallback = 0) => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};

const pick = (source, ...keys) => {
    for (const key of keys) {
        if (source[key] !== undefined && source[key] !== null && source[key] !== "") {
            return source[key];
        }
    }
    return undefined;
};

const normalizeKthpPayload = (body) => ({
    giang_vien: pick(body, "giang_vien", "giangvien") || "",
    khoa: pick(body, "khoa", "Khoa") || "",
    hoc_ky: toInt(pick(body, "hoc_ky", "ki", "HocKy"), 1),
    nam_hoc: pick(body, "nam_hoc", "namhoc", "NamHoc") || "",
    hinh_thuc: pick(body, "hinh_thuc", "hinhthuc", "HinhThuc") || "",
    ten_hoc_phan: pick(body, "ten_hoc_phan", "tenhocphan", "TenHocPhan") || "",
    lop_hoc_phan: pick(body, "lop_hoc_phan", "lophocphan", "LopHocPhan") || "",
    doi_tuong: pick(body, "doi_tuong", "doituong", "DoiTuong") || "",
    bai_cham_1: toInt(pick(body, "bai_cham_1", "baicham1", "BaiCham1"), 0),
    bai_cham_2: toInt(pick(body, "bai_cham_2", "baicham2", "BaiCham2"), 0),
    tong_so: toInt(pick(body, "tong_so", "tongso", "TongSo"), 0),
    quy_chuan: toDecimal(pick(body, "quy_chuan", "sotietqc", "SoTietQC"), 0),
    ghi_chu: pick(body, "ghi_chu", "ghichu", "GhiChu") || ""
});

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
        
        const data = normalizeKthpPayload(req.body);

        // Validate required fields
        if (!data.nam_hoc || !data.ten_hoc_phan || !data.giang_vien || !data.khoa || !data.hinh_thuc) {
            return res.status(400).json({
                success: false,
                message: "Thiếu thông tin bắt buộc: Năm học, Tên HP, Giảng viên, Khoa, Hình thức"
            });
        }

        const query = `
            INSERT INTO ${COI_CHAM_RA_DE_TABLE} 
            (id_user, giang_vien, khoa, hoc_ky, nam_hoc, hinh_thuc, ten_hoc_phan, lop_hoc_phan, doi_tuong, bai_cham_1, bai_cham_2, tong_so, quy_chuan, ghi_chu, khoa_duyet, khao_thi_duyet)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0)
        `;

        const [result] = await connection.execute(query, [
            userId,
            data.giang_vien,
            data.khoa,
            data.hoc_ky,
            data.nam_hoc,
            data.hinh_thuc,
            data.ten_hoc_phan,
            data.lop_hoc_phan,
            data.doi_tuong,
            data.bai_cham_1,
            data.bai_cham_2,
            data.tong_so,
            data.quy_chuan,
            data.ghi_chu
        ]);

        // Ghi log
        try {
            await LogService.logChange(
                userId,
                userName,
                'Thêm KTHP',
                `Thêm KTHP "${data.hinh_thuc}" - HP: "${data.ten_hoc_phan}" cho GV: "${data.giang_vien}"`
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
            SELECT ${buildKthpSelect()}
            FROM ${COI_CHAM_RA_DE_TABLE}
            WHERE nam_hoc = ?
        `;
        const params = [NamHoc];

        if (Khoa && Khoa !== 'ALL') {
            query += ` AND khoa = ?`;
            params.push(Khoa);
        }

        query += ` ORDER BY giang_vien, ten_hoc_phan, hinh_thuc`;

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

        const data = normalizeKthpPayload(req.body);

        const query = `
            UPDATE ${COI_CHAM_RA_DE_TABLE} SET
                giang_vien = ?,
                khoa = ?,
                hoc_ky = ?,
                nam_hoc = ?,
                hinh_thuc = ?,
                ten_hoc_phan = ?,
                lop_hoc_phan = ?,
                doi_tuong = ?,
                bai_cham_1 = ?,
                bai_cham_2 = ?,
                tong_so = ?,
                quy_chuan = ?,
                ghi_chu = ?
            WHERE id = ?
        `;

        const [result] = await connection.execute(query, [
            data.giang_vien,
            data.khoa,
            data.hoc_ky,
            data.nam_hoc,
            data.hinh_thuc,
            data.ten_hoc_phan,
            data.lop_hoc_phan,
            data.doi_tuong,
            data.bai_cham_1,
            data.bai_cham_2,
            data.tong_so,
            data.quy_chuan,
            data.ghi_chu,
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
                `Sửa KTHP ID: ${ID} - Hình thức: "${data.hinh_thuc}"`
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
            `SELECT hinh_thuc, ten_hoc_phan, giang_vien FROM ${COI_CHAM_RA_DE_TABLE} WHERE id = ?`,
            [ID]
        );

        const [result] = await connection.execute(
            `DELETE FROM ${COI_CHAM_RA_DE_TABLE} WHERE id = ?`,
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
                `Xóa KTHP: "${info.hinh_thuc}" - HP: "${info.ten_hoc_phan}" - GV: "${info.giang_vien}"`
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
