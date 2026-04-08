/**
 * VUOT GIO V2 - Lớp Ngoài Quy Chuẩn Controller
 * Refactored: Nháp trên course_schedule_details → Chốt sang lopngoaiquychuan
 * Date: 2026-03-04
 * 
 * Luồng 2 giai đoạn (giống TKB):
 *   1. Nháp: CRUD trên course_schedule_details (class_type='ngoai_quy_chuan', da_luu=0)
 *   2. Chốt: Chuyển sang lopngoaiquychuan (chính thức)
 *   3. Duyệt: Khoa → Đào tạo → Tài chính (trên lopngoaiquychuan)
 */

const createPoolConnection = require("../../config/databasePool");
const pool = require("../../config/Pool");
const LogService = require("../../services/logService");

const CLASS_TYPE = 'ngoai_quy_chuan';
const LNQC_TABLE = 'vg_lop_ngoai_quy_chuan';

const buildLnqcSelect = () => `
    id AS ID,
    id_user,
    tt,
    so_tin_chi AS SoTinChi,
    so_tin_chi,
    lop_hoc_phan AS LopHocPhan,
    lop_hoc_phan,
    ma_bo_mon AS MaBoMon,
    ma_bo_mon,
    ll AS LL,
    so_tiet_ctdt AS SoTietCTDT,
    so_tiet_ctdt,
    he_so_t7cn AS HeSoT7CN,
    he_so_t7cn,
    so_sv AS SoSV,
    he_so_lop_dong AS HeSoLopDong,
    he_so_lop_dong,
    quy_chuan AS QuyChuan,
    quy_chuan,
    hoc_ky AS KiHoc,
    hoc_ky,
    nam_hoc AS NamHoc,
    nam_hoc,
    ma_hoc_phan AS MaHocPhan,
    ma_hoc_phan,
    giang_vien AS GiangVien,
    giang_vien,
    giao_vien_giang_day AS GiaoVienGiangDay,
    giao_vien_giang_day,
    moi_giang AS MoiGiang,
    moi_giang,
    he_dao_tao,
    ten_lop AS TenLop,
    ten_lop,
    khoa_duyet AS KhoaDuyet,
    dao_tao_duyet AS DaoTaoDuyet,
    tai_chinh_duyet AS TaiChinhDuyet,
    ngay_bat_dau AS NgayBatDau,
    ngay_ket_thuc AS NgayKetThuc,
    khoa AS Khoa,
    dot AS Dot,
    ghi_chu AS GhiChu,
    ghi_chu,
    hoan_thanh AS HoanThanh,
    0 AS DaLuu
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

const toDecimal = (value, fallback = 0) => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
};

// =====================================================
// DRAFT OPERATIONS (course_schedule_details)
// =====================================================

/**
 * Thêm dòng mới vào bảng nháp
 */
const save = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    let connection;
    try {
        connection = await createPoolConnection();

        const data = req.body;
        const dot = data.dot || 1;
        const ki_hoc = data.ki_hoc || 1;
        const nam_hoc = data.nam_hoc;
        const id = data.id || -1;

        if (!nam_hoc) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin năm học" });
        }

        const insertQuery = `
            INSERT INTO course_schedule_details 
            (course_name, course_code, credit_hours, student_quantity, student_bonus,
             bonus_time, ll_code, ll_total, qc, lecturer, major, he_dao_tao,
             dot, ki_hoc, nam_hoc, note, course_id, class_type, da_luu)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
        `;

        const [result] = await connection.execute(insertQuery, [
            data.course_name || `Môn học mới ${Date.now()}`,
            data.course_code || '',
            data.credit_hours || 0,
            data.student_quantity || 0,
            data.student_bonus || 1,
            data.bonus_time || 1,
            data.ll_code || 0,
            data.ll_total || 0,
            data.qc || 0,
            data.lecturer || '',
            data.major || '',
            data.he_dao_tao || '',
            dot,
            ki_hoc,
            nam_hoc,
            data.note || '',
            data.course_id || '',
            CLASS_TYPE
        ]);

        try {
            await LogService.logChange(userId, userName, 'Thêm lớp ngoài QC (nháp)',
                `Thêm "${data.course_name}" - GV: "${data.lecturer}" - id: ${id}`);
        } catch (e) { console.error("Log error:", e); }

        res.status(200).json({
            success: true,
            message: "Thêm dòng mới thành công!",
            data: { id: result.insertId, ...data }
        });

    } catch (error) {
        console.error("Lỗi khi thêm lớp ngoài QC:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Lấy danh sách nháp (GROUP BY tt, giống getDataTKBChinhThuc)
 */
const getTable = async (req, res) => {
    const { Dot, KiHoc, NamHoc, Khoa } = req.params;

    let connection;
    try {
        connection = await createPoolConnection();

        const baseSelect = `
            SELECT 
                id,
                course_id,
                course_name,
                course_code,
                major,
                lecturer,
                start_date,
                end_date,
                ll_total,
                credit_hours,
                ll_code,
                student_quantity,
                student_bonus,
                bonus_time,
                qc,
                dot,
                ki_hoc,
                nam_hoc,
                note,
                he_dao_tao
            FROM course_schedule_details
            WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? AND da_luu = 0 AND class_type = ?
        `;
        const params = [Dot, KiHoc, NamHoc, CLASS_TYPE];

        let query = baseSelect;
        if (Khoa && Khoa !== 'ALL') {
            query += ` AND major = ?`;
            params.push(Khoa);
        }
        query += ` ORDER BY lecturer, course_name`;

        const [results] = await connection.execute(query, params);

        res.json(results);

    } catch (error) {
        console.error("Lỗi getTable nháp:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Cập nhật dòng nháp (theo tt, giống updateRowTKB)
 */
const edit = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';
    const data = req.body;

    const { id, dot, ki_hoc, nam_hoc } = data;
    if (!id || !dot || !ki_hoc || !nam_hoc) {
        return res.status(400).json({ success: false, message: "Thiếu id, dot, ki_hoc, nam_hoc" });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        const allowedFields = [
            'course_name', 'course_code', 'credit_hours', 'student_quantity',
            'student_bonus', 'bonus_time', 'll_code', 'll_total', 'qc',
            'lecturer', 'major', 'he_dao_tao', 'note', 'course_id'
        ];

        const setClauses = [];
        const setValues = [];

        for (const field of allowedFields) {
            if (data[field] !== undefined) {
                setClauses.push(`${field} = ?`);
                setValues.push(data[field]);
            }
        }

        if (setClauses.length === 0) {
            return res.status(400).json({ success: false, message: "Không có dữ liệu để cập nhật" });
        }

        setValues.push(id, dot, ki_hoc, nam_hoc, CLASS_TYPE);

        const [result] = await connection.execute(
            `UPDATE course_schedule_details SET ${setClauses.join(', ')} WHERE id = ? AND dot = ? AND ki_hoc = ? AND nam_hoc = ? AND class_type = ?`,
            setValues
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
        }

        try {
            await LogService.logChange(userId, userName, 'Sửa lớp ngoài QC (nháp)', `Sửa id: ${id}`);
        } catch (e) { console.error("Log error:", e); }

        res.status(200).json({ success: true, message: "Cập nhật thành công!" });

    } catch (error) {
        console.error("Lỗi edit nháp:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Xóa dòng nháp theo tt (giống deleteRow TKB)
 */
const deleteRecord = async (req, res) => {
    const { id, dot, ki_hoc, nam_hoc } = req.query;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!id) {
        return res.status(400).json({ success: false, message: "Thiếu id." });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await connection.query(
            `DELETE FROM course_schedule_details WHERE id = ? AND dot = ? AND ki_hoc = ? AND nam_hoc = ? AND class_type = ?`,
            [id, dot, ki_hoc, nam_hoc, CLASS_TYPE]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
        }

        try {
            await LogService.logChange(userId, userName, 'Xóa lớp ngoài QC (nháp)', `Xóa id: ${id}`);
        } catch (e) { console.error("Log error:", e); }

        res.json({ success: true, message: "Xóa thành công!" });

    } catch (error) {
        console.error("Lỗi delete nháp:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Xóa toàn bộ nháp theo filter
 */
const deleteByFilter = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';
    const { nam_hoc, ki_hoc, dot, major } = req.body;

    if (!nam_hoc) {
        return res.status(400).json({ success: false, message: "Cần chọn năm học" });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        let query = `DELETE FROM course_schedule_details WHERE nam_hoc = ? AND class_type = ? AND da_luu = 0`;
        const params = [nam_hoc, CLASS_TYPE];

        if (ki_hoc) { query += ` AND ki_hoc = ?`; params.push(ki_hoc); }
        if (dot) { query += ` AND dot = ?`; params.push(dot); }
        if (major && major !== 'ALL') { query += ` AND major = ?`; params.push(major); }

        const [result] = await connection.execute(query, params);

        try {
            await LogService.logChange(userId, userName, 'Xóa hàng loạt nháp ngoài QC',
                `Xóa ${result.affectedRows} dòng - Năm: ${nam_hoc}`);
        } catch (e) { console.error("Log error:", e); }

        res.json({ success: true, message: `Đã xóa ${result.affectedRows} dòng` });
    } catch (error) {
        console.error("Lỗi deleteByFilter:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra khi xóa" });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// CONFIRM TO MAIN (Chốt nháp → lopngoaiquychuan)
// =====================================================

/**
 * Chuyển dữ liệu nháp sang chính thức (copy logic themTKBVaoQCDK)
 */
const confirmToMain = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';
    const { major, dot, ki_hoc, nam_hoc } = req.body;

    let connection;
    let maPhongBanFalse = [];

    try {
        connection = await createPoolConnection();

        // 1. SELECT gom nhóm từ bảng nháp
        let getDataQuery = `
            SELECT
                id AS ID,
                major AS Khoa, ll_code AS SoTietCTDT, ll_total AS LL,
                student_quantity AS SoSV, student_bonus AS HeSoLopDong,
                bonus_time AS HeSoT7CN, course_id AS MaBoMon,
                lecturer AS GiangVien, lecturer AS GiaoVienGiangDay,
                credit_hours AS SoTinChi,
                course_name AS LopHocPhan, course_code AS MaHocPhan,
                start_date AS NgayBatDau, end_date AS NgayKetThuc,
                qc AS QuyChuan, he_dao_tao AS he_dao_tao
            FROM course_schedule_details
            WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? AND da_luu = 0 AND class_type = ?
        `;
        const params = [dot, ki_hoc, nam_hoc, CLASS_TYPE];

        if (major !== 'ALL') {
            getDataQuery += ` AND major = ?`;
            params.push(major);
        }

        const [draftData] = await connection.query(getDataQuery, params);

        if (draftData.length === 0) {
            return res.status(200).json({ success: true, message: "Không có dữ liệu nháp để chuyển" });
        }

        const lecturerNames = [...new Set(draftData
            .map(row => row.GiangVien || row.GiaoVienGiangDay)
            .filter(Boolean))];

        const lecturerMap = new Map();
        if (lecturerNames.length > 0) {
            const placeholders = lecturerNames.map(() => '?').join(', ');
            const [lecturerRows] = await connection.query(
                `SELECT id_User, TenNhanVien FROM nhanvien WHERE TenNhanVien IN (${placeholders})`,
                lecturerNames
            );
            lecturerRows.forEach(row => {
                lecturerMap.set(row.TenNhanVien, row.id_User);
            });
        }

        // 2. Chuẩn bị INSERT vào vg_lop_ngoai_quy_chuan
        let insertValues = [];

        const mapOfficialRow = (row) => {
            const giangVien = row.GiangVien || row.GiaoVienGiangDay || null;
            const idUser = lecturerMap.get(giangVien) || null;

            return [
                row.tt || null,
                row.SoTinChi || 0,
                row.LopHocPhan || '',
                row.MaBoMon || row.MaHocPhan || '',
                idUser,
                row.LL || 0,
                row.SoTietCTDT || 0,
                row.HeSoT7CN || 1,
                row.SoSV || 0,
                row.HeSoLopDong || 1,
                row.QuyChuan || 0,
                ki_hoc,
                nam_hoc,
                row.MaHocPhan || '',
                giangVien,
                row.GiaoVienGiangDay || giangVien,
                row.MoiGiang || 0,
                row.he_dao_tao || null,
                row.TenLop || row.LopHocPhan || '',
                0,
                0,
                0,
                row.NgayBatDau || null,
                row.NgayKetThuc || null,
                row.Khoa || null,
                dot,
                row.GhiChu || null,
                row.HoanThanh || 0
            ];
        };

        if (major === 'ALL') {
            const [MaPhongBanList] = await connection.query(`SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`);
            const validSet = new Set(MaPhongBanList.map(r => r.MaPhongBan));

            draftData.forEach(row => {
                if (validSet.has(row.Khoa)) {
                    insertValues.push(mapOfficialRow(row));
                } else {
                    maPhongBanFalse.push(row.ID);
                }
            });
        } else {
            insertValues = draftData.map(mapOfficialRow);
        }

        if (insertValues.length === 0) {
            return res.status(200).json({ success: true, message: "Không có dữ liệu hợp lệ (Khoa không trùng)" });
        }

        // 3. INSERT vào bảng chính thức
                await connection.query(
                        `INSERT INTO ${LNQC_TABLE} 
                         (tt, so_tin_chi, lop_hoc_phan, ma_bo_mon, id_user, ll, so_tiet_ctdt, he_so_t7cn,
                            so_sv, he_so_lop_dong, quy_chuan, hoc_ky, nam_hoc, ma_hoc_phan, giang_vien,
                            giao_vien_giang_day, moi_giang, he_dao_tao, ten_lop, khoa_duyet, dao_tao_duyet,
                            tai_chinh_duyet, ngay_bat_dau, ngay_ket_thuc, khoa, dot, ghi_chu, hoan_thanh) VALUES ?`,
                        [insertValues]
                );

        // 4. Đánh dấu da_luu = 1 bên nháp
        let updateQuery = `UPDATE course_schedule_details SET da_luu = 1 
            WHERE dot = ? AND ki_hoc = ? AND nam_hoc = ? AND class_type = ?`;
        const updateParams = [dot, ki_hoc, nam_hoc, CLASS_TYPE];

        if (major === 'ALL' && maPhongBanFalse.length > 0) {
            updateQuery += ` AND id NOT IN (${maPhongBanFalse.join(', ')})`;
        } else if (major !== 'ALL') {
            updateQuery += ` AND major = ?`;
            updateParams.push(major);
        }
        await connection.query(updateQuery, updateParams);

        try {
            await LogService.logChange(userId, userName, 'Chốt lớp ngoài QC',
                `Chuyển ${insertValues.length} dòng - Đợt: ${dot}, Kì: ${ki_hoc}, Năm: ${nam_hoc}`);
        } catch (e) { console.error("Log error:", e); }

        const msg = maPhongBanFalse.length > 0
            ? `Đã chuyển ${insertValues.length} dòng. ${maPhongBanFalse.length} dòng không trùng khoa.`
            : `Đã chuyển ${insertValues.length} dòng thành công!`;

        res.status(200).json({ success: true, message: msg });

    } catch (error) {
        console.error("Lỗi confirmToMain:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// OFFICIAL TABLE (lopngoaiquychuan - cột mới)
// =====================================================

/**
 * Lấy danh sách chính thức (cột mới sau migration)
 */
const getChinhThuc = async (req, res) => {
    const { NamHoc, Khoa } = req.params;
    console.log(`[LopNgoaiQC] Lấy chính thức - Năm: ${NamHoc}, Khoa: ${Khoa}`);

    let connection;
    try {
        connection = await createPoolConnection();

        let query = `
            SELECT ${buildLnqcSelect()}
            FROM ${LNQC_TABLE} 
            WHERE nam_hoc = ?
        `;
        const params = [NamHoc];

        if (Khoa && Khoa !== 'ALL') {
            query += ` AND khoa = ?`;
            params.push(Khoa);
        }
        query += ` ORDER BY giang_vien, lop_hoc_phan`;

        const [results] = await connection.execute(query, params);
        console.log(`[LopNgoaiQC] Found ${results.length} rows (chính thức)`);
        res.json(results);

    } catch (error) {
        console.error("Lỗi getChinhThuc:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// APPROVAL (lopngoaiquychuan - giữ nguyên)
// =====================================================

const approve = async (req, res) => {
    const { ID } = req.params;
    const { type } = req.body;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    const columnMap = { 'khoa': 'khoa_duyet', 'daotao': 'dao_tao_duyet' };
    const column = columnMap[type];
    if (!column) return res.status(400).json({ success: false, message: "Loại duyệt không hợp lệ" });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await connection.execute(`UPDATE ${LNQC_TABLE} SET ${column} = 1 WHERE id = ?`, [ID]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy" });

        try { await LogService.logChange(userId, userName, 'Duyệt lớp ngoài QC', `Duyệt ${type} ID: ${ID}`); } catch (e) { }
        res.json({ success: true, message: "Duyệt thành công" });
    } catch (error) {
        console.error("Lỗi approve:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    } finally {
        if (connection) connection.release();
    }
};

const unapprove = async (req, res) => {
    const { ID } = req.params;
    const { type } = req.body;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    const columnMap = { 'khoa': 'khoa_duyet', 'daotao': 'dao_tao_duyet' };
    const column = columnMap[type];
    if (!column) return res.status(400).json({ success: false, message: "Loại duyệt không hợp lệ" });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await connection.execute(`UPDATE ${LNQC_TABLE} SET ${column} = 0 WHERE id = ?`, [ID]);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy" });

        try { await LogService.logChange(userId, userName, 'Bỏ duyệt lớp ngoài QC', `Bỏ ${type} ID: ${ID}`); } catch (e) { }
        res.json({ success: true, message: "Bỏ duyệt thành công" });
    } catch (error) {
        console.error("Lỗi unapprove:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    } finally {
        if (connection) connection.release();
    }
};

const batchApprove = async (req, res) => {
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';
    const records = req.body;

    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        let updatedCount = 0;

        // Start transaction
        await connection.beginTransaction();

        // Group IDs by their set of status: "khoa_duyet_dao_tao_duyet" -> [IDs]
        const updateGroups = {};

        records.forEach(record => {
            const recordId = record.ID || record.id;
            if (!recordId) return;
            const khoa = toInt(pick(record, 'khoa_duyet', 'KhoaDuyet', 'khoaduyet'), 0);
            const daoTao = toInt(pick(record, 'dao_tao_duyet', 'DaoTaoDuyet', 'daotaoduyet'), 0);

            const key = `${khoa}_${daoTao}`;
            if (!updateGroups[key]) {
                updateGroups[key] = [];
            }
            updateGroups[key].push(recordId);
        });

        // Execute bulk update for each group
        for (const [key, ids] of Object.entries(updateGroups)) {
            const [khoa, daoTao] = key.split('_').map(Number);

            const [result] = await connection.query(
                `UPDATE ${LNQC_TABLE} SET khoa_duyet = ?, dao_tao_duyet = ? WHERE id IN (?)`,
                [khoa, daoTao, ids]
            );

            updatedCount += result.affectedRows;
        }

        await connection.commit();

        try { await LogService.logChange(userId, userName, 'Batch duyệt ngoài QC (Bulk)', `${updatedCount} bản ghi`); } catch (e) { }
        res.json({ success: true, message: `Cập nhật ${updatedCount} bản ghi thành công` });
    } catch (error) {
        console.error("Lỗi batchApprove:", error);
        if (connection) await connection.rollback();
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    } finally {
        if (connection) connection.release();
    }
};

// =====================================================
// EDIT/DELETE CHÍNH THỨC (lopngoaiquychuan - cột mới)
// =====================================================

/**
 * Cập nhật bản ghi chính thức (lopngoaiquychuan - cột mới sau migration)
 */
const editChinhThuc = async (req, res) => {
    const { ID } = req.params;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID) {
        return res.status(400).json({ success: false, message: "Thiếu ID" });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        const data = req.body;
        const query = `
            UPDATE ${LNQC_TABLE} SET
                nam_hoc = ?, hoc_ky = ?, lop_hoc_phan = ?, ma_hoc_phan = ?, so_tin_chi = ?,
                ten_lop = ?, ll = ?, so_sv = ?, so_tiet_ctdt = ?, he_so_t7cn = ?,
                he_so_lop_dong = ?, quy_chuan = ?, giang_vien = ?, khoa = ?,
                he_dao_tao = ?, ghi_chu = ?, ngay_bat_dau = ?, ngay_ket_thuc = ?,
                tt = ?, ma_bo_mon = ?, giao_vien_giang_day = ?, moi_giang = ?,
                dot = ?, hoan_thanh = ?
            WHERE id = ?
        `;

        const [result] = await connection.execute(query, [
            pick(data, 'nam_hoc', 'NamHoc') || '',
            toInt(pick(data, 'hoc_ky', 'KiHoc', 'ki'), 1),
            pick(data, 'lop_hoc_phan', 'LopHocPhan') || '',
            pick(data, 'ma_hoc_phan', 'MaHocPhan') || '',
            toInt(pick(data, 'so_tin_chi', 'SoTinChi'), 0),
            pick(data, 'ten_lop', 'TenLop') || '',
            toDecimal(pick(data, 'll', 'LL'), 0),
            toInt(pick(data, 'so_sv', 'SoSV'), 0),
            toDecimal(pick(data, 'so_tiet_ctdt', 'SoTietCTDT'), 0),
            toDecimal(pick(data, 'he_so_t7cn', 'HeSoT7CN'), 1),
            toDecimal(pick(data, 'he_so_lop_dong', 'HeSoLopDong'), 1),
            toDecimal(pick(data, 'quy_chuan', 'QuyChuan'), 0),
            pick(data, 'giang_vien', 'GiangVien') || '',
            pick(data, 'khoa', 'Khoa') || '',
            pick(data, 'he_dao_tao', 'HeDaoTao') || '',
            pick(data, 'ghi_chu', 'GhiChu') || '',
            pick(data, 'ngay_bat_dau', 'NgayBatDau') || null,
            pick(data, 'ngay_ket_thuc', 'NgayKetThuc') || null,
            toInt(pick(data, 'tt', 'TT'), 0),
            pick(data, 'ma_bo_mon', 'MaBoMon') || '',
            pick(data, 'giao_vien_giang_day', 'GiaoVienGiangDay') || pick(data, 'giang_vien', 'GiangVien') || '',
            toInt(pick(data, 'moi_giang', 'MoiGiang'), 0),
            toInt(pick(data, 'dot', 'Dot'), 1),
            toInt(pick(data, 'hoan_thanh', 'HoanThanh'), 0),
            ID
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi" });
        }

        try { await LogService.logChange(userId, userName, 'Sửa lớp ngoài QC (chính thức)', `ID: ${ID}`); } catch (e) { }
        res.status(200).json({ success: true, message: "Cập nhật thành công!" });

    } catch (error) {
        console.error("Lỗi editChinhThuc:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Xóa bản ghi chính thức (lopngoaiquychuan)
 */
const deleteChinhThuc = async (req, res) => {
    const { ID } = req.params;
    const userId = req.session?.userId || 1;
    const userName = req.session?.TenNhanVien || req.session?.username || 'ADMIN';

    if (!ID) {
        return res.status(400).json({ success: false, message: "Thiếu ID" });
    }

    let connection;
    try {
        connection = await createPoolConnection();

        const [result] = await connection.execute(
            `DELETE FROM ${LNQC_TABLE} WHERE id = ?`, [ID]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi" });
        }

        try { await LogService.logChange(userId, userName, 'Xóa lớp ngoài QC (chính thức)', `ID: ${ID}`); } catch (e) { }
        res.json({ success: true, message: "Xóa thành công!" });

    } catch (error) {
        console.error("Lỗi deleteChinhThuc:", error);
        res.status(500).json({ success: false, message: error.message });
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
    deleteByFilter,
    confirmToMain,
    getChinhThuc,
    editChinhThuc,
    deleteChinhThuc,
    approve,
    unapprove,
    batchApprove
};
