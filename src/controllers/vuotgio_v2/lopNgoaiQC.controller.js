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

        // 2. Chuẩn bị INSERT vào lopngoaiquychuan
        let insertValues = [];

        if (major === 'ALL') {
            const [MaPhongBanList] = await connection.query(`SELECT MaPhongBan FROM phongban WHERE isKhoa = 1`);
            const validSet = new Set(MaPhongBanList.map(r => r.MaPhongBan));

            draftData.forEach(row => {
                if (validSet.has(row.Khoa)) {
                    insertValues.push([row.tt, row.Khoa, dot, ki_hoc, nam_hoc, row.SoTietCTDT,
                    row.LL, row.SoSV, row.HeSoLopDong, row.HeSoT7CN, row.MaBoMon,
                    row.GiangVien, row.GiaoVienGiangDay || row.GiangVien || null,
                    row.SoTinChi, row.LopHocPhan, row.MaHocPhan,
                    row.NgayBatDau || null, row.NgayKetThuc || null, row.QuyChuan,
                    row.he_dao_tao || null, 1]);
                } else {
                    maPhongBanFalse.push(row.ID);
                }
            });
        } else {
            insertValues = draftData.map(row => [
                row.tt, row.Khoa, dot, ki_hoc, nam_hoc, row.SoTietCTDT,
                row.LL, row.SoSV, row.HeSoLopDong, row.HeSoT7CN, row.MaBoMon,
                row.GiangVien, row.GiaoVienGiangDay || row.GiangVien || null,
                row.SoTinChi, row.LopHocPhan, row.MaHocPhan,
                row.NgayBatDau || null, row.NgayKetThuc || null, row.QuyChuan,
                row.he_dao_tao || null, 1
            ]);
        }

        if (insertValues.length === 0) {
            return res.status(200).json({ success: true, message: "Không có dữ liệu hợp lệ (Khoa không trùng)" });
        }

        // 3. INSERT vào bảng chính thức
        await connection.query(
            `INSERT INTO lopngoaiquychuan 
             (tt, Khoa, Dot, KiHoc, NamHoc, SoTietCTDT, LL, SoSV, HeSoLopDong, HeSoT7CN,
              MaBoMon, GiangVien, GiaoVienGiangDay, SoTinChi, LopHocPhan, MaHocPhan,
              NgayBatDau, NgayKetThuc, QuyChuan, he_dao_tao, DaLuu) VALUES ?`,
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
            SELECT 
                ID, tt, NamHoc, KiHoc, Dot, LopHocPhan, MaHocPhan, MaBoMon, SoTinChi,
                TenLop, LL, SoSV, SoTietCTDT, HeSoT7CN, HeSoLopDong, QuyChuan,
                GiangVien, GiaoVienGiangDay, MoiGiang, Khoa, he_dao_tao, GhiChu,
                NgayBatDau, NgayKetThuc, DaLuu, HoanThanh,
                KhoaDuyet, DaoTaoDuyet, TaiChinhDuyet
            FROM lopngoaiquychuan 
            WHERE NamHoc = ?
        `;
        const params = [NamHoc];

        if (Khoa && Khoa !== 'ALL') {
            query += ` AND Khoa = ?`;
            params.push(Khoa);
        }
        query += ` ORDER BY GiangVien, LopHocPhan`;

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

    const columnMap = { 'khoa': 'KhoaDuyet', 'daotao': 'DaoTaoDuyet' };
    const column = columnMap[type];
    if (!column) return res.status(400).json({ success: false, message: "Loại duyệt không hợp lệ" });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await connection.execute(`UPDATE lopngoaiquychuan SET ${column} = 1 WHERE ID = ?`, [ID]);
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

    const columnMap = { 'khoa': 'KhoaDuyet', 'daotao': 'DaoTaoDuyet' };
    const column = columnMap[type];
    if (!column) return res.status(400).json({ success: false, message: "Loại duyệt không hợp lệ" });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await connection.execute(`UPDATE lopngoaiquychuan SET ${column} = 0 WHERE ID = ?`, [ID]);
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

        // Group IDs by their set of status: "KhoaDuyet_DaoTaoDuyet" -> [IDs]
        const updateGroups = {};

        records.forEach(record => {
            if (!record.ID) return;
            const khoa = record.KhoaDuyet || 0;
            const daoTao = record.DaoTaoDuyet || 0;

            const key = `${khoa}_${daoTao}`;
            if (!updateGroups[key]) {
                updateGroups[key] = [];
            }
            updateGroups[key].push(record.ID);
        });

        // Execute bulk update for each group
        for (const [key, ids] of Object.entries(updateGroups)) {
            const [khoa, daoTao] = key.split('_').map(Number);

            const [result] = await connection.query(
                `UPDATE lopngoaiquychuan SET KhoaDuyet = ?, DaoTaoDuyet = ? WHERE ID IN (?)`,
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
            UPDATE lopngoaiquychuan SET
                NamHoc = ?, KiHoc = ?, LopHocPhan = ?, MaHocPhan = ?, SoTinChi = ?,
                TenLop = ?, LL = ?, SoSV = ?, SoTietCTDT = ?, HeSoT7CN = ?,
                HeSoLopDong = ?, QuyChuan = ?, GiangVien = ?, Khoa = ?,
                he_dao_tao = ?, GhiChu = ?
            WHERE ID = ?
        `;

        const [result] = await connection.execute(query, [
            data.NamHoc, data.KiHoc || 1, data.LopHocPhan || '', data.MaHocPhan || '',
            data.SoTinChi || 0, data.TenLop || '', data.LL || 0, data.SoSV || 0,
            data.SoTietCTDT || 0, data.HeSoT7CN || 1, data.HeSoLopDong || 1,
            data.QuyChuan || 0, data.GiangVien || '', data.Khoa || '',
            data.he_dao_tao || '', data.GhiChu || '', ID
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
            `DELETE FROM lopngoaiquychuan WHERE ID = ?`, [ID]
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
