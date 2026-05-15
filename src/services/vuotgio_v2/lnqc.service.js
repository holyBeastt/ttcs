const createPoolConnection = require("../../config/databasePool");
const LogService = require("../logService");
const repo = require("../../repositories/vuotgio_v2/lnqc.repo");

const mapper = require("../../mappers/vuotgio_v2/lnqc.mapper");
const baseMapper = require("../../mappers/vuotgio_v2/base.mapper");

const getUserContext = (req) => {
    if (!req.session?.userId) {
        console.warn("[LNQC] getUserContext: session.userId is missing — request may be unauthenticated");
    }
    return {
        userId: req.session?.userId || null,
        userName: req.session?.TenNhanVien || req.session?.username || "Unknown",
    };
};

const save = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    let connection;
    try {
        connection = await createPoolConnection();
        const data = mapper.toEntity(req.body);

        if (!data.nam_hoc) {
            return res.status(400).json({ success: false, message: "Thiếu thông tin năm học" });
        }

        const [result] = await repo.insertDraft(connection, [[
            data.course_name,
            data.course_code,
            data.credit_hours,
            data.student_quantity,
            data.student_bonus,
            data.bonus_time,
            data.ll_code,
            data.ll_total,
            data.qc,
            data.lecturer,
            data.major,
            data.he_dao_tao,
            data.dot,
            data.ki_hoc,
            data.nam_hoc,
            data.note,
            data.course_id,
            "ngoai_quy_chuan",
            0,
        ]]);

        try {
            await LogService.logChange(userId, userName, "Thêm lớp ngoài QC (nháp)", `Thêm "${data.course_name}" - GV: "${data.lecturer}"`);
        } catch (error) {
            console.error("Log error:", error);
        }

        res.status(200).json({ success: true, message: "Thêm dòng mới thành công!", data: { id: result.insertId, ...data } });
    } catch (error) {
        console.error("Lỗi khi thêm lớp ngoài QC:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    } finally {
        if (connection) connection.release();
    }
};

const getTable = async (req, res) => {
    const { Dot, KiHoc, NamHoc } = req.params;
    // enforceKhoaFilter middleware đã override req.params.Khoa nếu user là khoa
    const Khoa = req.params.Khoa;
    let connection;
    try {
        connection = await createPoolConnection();
        const results = await repo.getDraftTable(connection, { dot: Dot, kiHoc: KiHoc, namHoc: NamHoc, khoa: Khoa });
        res.json(results);
    } catch (error) {
        console.error("Lỗi getTable nháp:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

const edit = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const raw = req.body;
    const { id, dot, ki_hoc, nam_hoc } = raw;
    if (!id || !dot || !ki_hoc || !nam_hoc) {
        return res.status(400).json({ success: false, message: "Thiếu id, dot, ki_hoc, nam_hoc" });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        const mapped = mapper.toEntity(req.body);
        
        const allowedFields = ["course_name", "course_code", "credit_hours", "student_quantity", "student_bonus", "bonus_time", "ll_code", "ll_total", "qc", "lecturer", "major", "he_dao_tao", "note", "course_id"];
        const values = allowedFields.map((field) => mapped[field]);
        const setClause = allowedFields.map((field) => `${field} = ?`).join(", ");

        const [result] = await connection.execute(
            `UPDATE course_schedule_details SET ${setClause} WHERE id = ? AND dot = ? AND ki_hoc = ? AND nam_hoc = ? AND class_type = ?`,
            [...values, id, dot, ki_hoc, nam_hoc, "ngoai_quy_chuan"]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
        }

        try {
            await LogService.logChange(userId, userName, "Sửa lớp ngoài QC (nháp)", `Sửa id: ${id}`);
        } catch (error) {
            console.error("Log error:", error);
        }

        res.status(200).json({ success: true, message: "Cập nhật thành công!" });
    } catch (error) {
        console.error("Lỗi edit nháp:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    } finally {
        if (connection) connection.release();
    }
};

const deleteRecord = async (req, res) => {
    const { id, dot, ki_hoc, nam_hoc } = req.query;
    const { userId, userName } = getUserContext(req);

    if (!id) return res.status(400).json({ success: false, message: "Thiếu id." });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await connection.query(
            `DELETE FROM course_schedule_details WHERE id = ? AND dot = ? AND ki_hoc = ? AND nam_hoc = ? AND class_type = ?`,
            [id, dot, ki_hoc, nam_hoc, "ngoai_quy_chuan"]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
        }

        try {
            await LogService.logChange(userId, userName, "Xóa lớp ngoài QC (nháp)", `Xóa id: ${id}`);
        } catch (error) {
            console.error("Log error:", error);
        }

        res.json({ success: true, message: "Xóa thành công!" });
    } catch (error) {
        console.error("Lỗi delete nháp:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

const deleteByFilter = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const { nam_hoc, ki_hoc, dot, major } = req.body;

    if (!nam_hoc) {
        return res.status(400).json({ success: false, message: "Cần chọn năm học" });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await repo.deleteDraftByFilter(connection, { namHoc: nam_hoc, kiHoc: ki_hoc, dot, major });

        try {
            await LogService.logChange(userId, userName, "Xóa hàng loạt nháp ngoài QC", `Xóa ${result.affectedRows} dòng - Năm: ${nam_hoc}`);
        } catch (error) {
            console.error("Log error:", error);
        }

        res.json({ success: true, message: `Đã xóa ${result.affectedRows} dòng` });
    } catch (error) {
        console.error("Lỗi deleteByFilter:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra khi xóa" });
    } finally {
        if (connection) connection.release();
    }
};

const confirmToMain = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const { major, dot, ki_hoc, nam_hoc } = req.body;

    let connection;
    try {
        connection = await createPoolConnection();

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
        const params = [dot, ki_hoc, nam_hoc, "ngoai_quy_chuan"];
        if (major !== "ALL") {
            getDataQuery += ` AND major = ?`;
            params.push(major);
        }

        const [draftData] = await connection.query(getDataQuery, params);
        if (draftData.length === 0) {
            return res.status(200).json({ success: true, message: "Không có dữ liệu nháp để chuyển" });
        }

        const lecturerNames = [...new Set(draftData.map((row) => row.GiangVien || row.GiaoVienGiangDay).filter(Boolean))];
        const lecturerMap = await repo.getLecturerIdsByNames(connection, lecturerNames);

        const mapOfficialRow = (row) => {
            const giangVien = row.GiangVien || row.GiaoVienGiangDay || null;
            const idUser = lecturerMap.get(giangVien) || null;
            return [
                row.tt || null,
                row.SoTinChi || 0,
                row.LopHocPhan || "",
                row.MaBoMon || row.MaHocPhan || "",
                idUser,
                row.LL || 0,
                row.SoTietCTDT || 0,
                row.HeSoT7CN || 1,
                row.SoSV || 0,
                row.HeSoLopDong || 1,
                row.QuyChuan || 0,
                ki_hoc,
                nam_hoc,
                row.MaHocPhan || "",
                giangVien,
                row.GiaoVienGiangDay || giangVien,
                row.MoiGiang || 0,
                row.he_dao_tao || null,
                row.TenLop || row.LopHocPhan || "",
                0,
                0,
                0,
                row.NgayBatDau || null,
                row.NgayKetThuc || null,
                row.Khoa || null,
                dot,
                row.GhiChu || null,
                row.HoanThanh || 0,
            ];
        };

        let insertValues = [];
        let excludedIds = [];
        if (major === "ALL") {
            const validSet = new Set(await repo.getKhoaList(connection));
            draftData.forEach((row) => {
                if (validSet.has(row.Khoa)) {
                    insertValues.push(mapOfficialRow(row));
                } else {
                    excludedIds.push(row.ID);
                }
            });
        } else {
            insertValues = draftData.map(mapOfficialRow);
        }

        if (insertValues.length === 0) {
            return res.status(200).json({ success: true, message: "Không có dữ liệu hợp lệ (Khoa không trùng)" });
        }

        // Sử dụng transaction để đảm bảo tính toàn vẹn dữ liệu
        await connection.beginTransaction();
        try {
            await repo.insertOfficialBatch(connection, insertValues);
            await repo.updateDraftSaved(connection, { dot, kiHoc: ki_hoc, namHoc: nam_hoc, major, excludedIds });
            await connection.commit();
        } catch (txError) {
            await connection.rollback();
            throw txError;
        }

        try {
            await LogService.logChange(userId, userName, "Chốt lớp ngoài QC", `Chuyển ${insertValues.length} dòng - Đợt: ${dot}, Kì: ${ki_hoc}, Năm: ${nam_hoc}`);
        } catch (error) {
            console.error("Log error:", error);
        }

        const message = excludedIds.length > 0
            ? `Đã chuyển ${insertValues.length} dòng. ${excludedIds.length} dòng không trùng khoa.`
            : `Đã chuyển ${insertValues.length} dòng thành công!`;

        res.status(200).json({ success: true, message });
    } catch (error) {
        console.error("Lỗi confirmToMain:", error);
        res.status(500).json({ success: false, message: error.message || "Có lỗi xảy ra." });
    } finally {
        if (connection) connection.release();
    }
};

const getChinhThuc = async (req, res) => {
    const { NamHoc } = req.params;
    // enforceKhoaFilter middleware đã override req.params.Khoa nếu user là khoa
    const Khoa = req.params.Khoa;
    let connection;
    try {
        connection = await createPoolConnection();
        const results = await repo.getOfficialTable(connection, { namHoc: NamHoc, khoa: Khoa });
        res.json(results);
    } catch (error) {
        console.error("Lỗi getChinhThuc:", error);
        res.status(500).json({ message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

const approve = async (req, res) => {
    const { ID } = req.params;
    const { type } = req.body;
    const { userId, userName } = getUserContext(req);
    const columnMap = { khoa: "khoa_duyet", daotao: "dao_tao_duyet" };
    const column = columnMap[type];
    if (!column) return res.status(400).json({ success: false, message: "Loại duyệt không hợp lệ" });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await repo.updateApproval(connection, ID, column, 1);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy" });
        try { await LogService.logChange(userId, userName, "Duyệt lớp ngoài QC", `Duyệt ${type} ID: ${ID}`); } catch (error) { console.error(error); }
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
    const { userId, userName } = getUserContext(req);
    const columnMap = { khoa: "khoa_duyet", daotao: "dao_tao_duyet" };
    const column = columnMap[type];
    if (!column) return res.status(400).json({ success: false, message: "Loại duyệt không hợp lệ" });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await repo.updateApproval(connection, ID, column, 0);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy" });
        try { await LogService.logChange(userId, userName, "Bỏ duyệt lớp ngoài QC", `Bỏ ${type} ID: ${ID}`); } catch (error) { console.error(error); }
        res.json({ success: true, message: "Bỏ duyệt thành công" });
    } catch (error) {
        console.error("Lỗi unapprove:", error);
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    } finally {
        if (connection) connection.release();
    }
};

const batchApprove = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const records = req.body;
    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: "Dữ liệu không hợp lệ" });
    }

    let connection;
    try {
        connection = await createPoolConnection();
        await connection.beginTransaction();

        const updateGroups = {};
        records.forEach((record) => {
            const recordId = record.ID || record.id;
            if (!recordId) return;
            const khoa = baseMapper.toInt(baseMapper.pick(record, "khoa_duyet", "KhoaDuyet", "khoaduyet"), 0);
            const daoTao = baseMapper.toInt(baseMapper.pick(record, "dao_tao_duyet", "DaoTaoDuyet", "daotaoduyet"), 0);
            const key = `${khoa}_${daoTao}`;
            if (!updateGroups[key]) updateGroups[key] = [];
            updateGroups[key].push(recordId);
        });

        const updatedCount = await repo.batchUpdateApproval(connection, updateGroups);
        await connection.commit();

        try { await LogService.logChange(userId, userName, "Batch duyệt ngoài QC (Bulk)", `${updatedCount} bản ghi`); } catch (error) { console.error(error); }
        res.json({ success: true, message: `Cập nhật ${updatedCount} bản ghi thành công` });
    } catch (error) {
        console.error("Lỗi batchApprove:", error);
        if (connection) await connection.rollback();
        res.status(500).json({ success: false, message: "Có lỗi xảy ra" });
    } finally {
        if (connection) connection.release();
    }
};

const editChinhThuc = async (req, res) => {
    const { ID } = req.params;
    const { userId, userName } = getUserContext(req);
    if (!ID) return res.status(400).json({ success: false, message: "Thiếu ID" });

    let connection;
    try {
        console.log("[LNQC][editChinhThuc] params:", { ID });
        console.log("[LNQC][editChinhThuc] body:", {
            he_dao_tao_id: req.body?.he_dao_tao_id,
            HeDaoTaoId: req.body?.HeDaoTaoId,
            he_dao_tao: req.body?.he_dao_tao,
            HeDaoTao: req.body?.HeDaoTao
        });

        connection = await createPoolConnection();
        const data = mapper.toEntity(req.body);
        console.log("[LNQC][editChinhThuc] mapped he_dao_tao:", data.he_dao_tao);
        const values = [
            data.nam_hoc,
            data.ki_hoc,
            data.course_name,
            data.course_code,
            data.credit_hours,
            data.course_name, // TenLop
            data.ll_total,
            data.student_quantity,
            data.ll_code,
            data.bonus_time,
            data.student_bonus,
            data.qc,
            data.lecturer,
            data.major,
            data.he_dao_tao,
            data.note,
            data.start_date,
            data.end_date,
            baseMapper.toInt(req.body.tt, 0), // TT is usually passed directly or from body
            data.course_id,
            data.lecturer, // GiaoVienGiangDay
            baseMapper.toInt(req.body.moi_giang, 0),
            data.dot,
            baseMapper.toInt(req.body.hoan_thanh, 0),
        ];
        console.log("[LNQC][editChinhThuc] update values he_dao_tao:", values[14]);

        const [result] = await repo.updateOfficial(connection, ID, values);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi" });

        try { await LogService.logChange(userId, userName, "Sửa lớp ngoài QC (chính thức)", `ID: ${ID}`); } catch (error) { console.error(error); }
        res.status(200).json({ success: true, message: "Cập nhật thành công!" });
    } catch (error) {
        console.error("Lỗi editChinhThuc:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

const deleteChinhThuc = async (req, res) => {
    const { ID } = req.params;
    const { userId, userName } = getUserContext(req);
    if (!ID) return res.status(400).json({ success: false, message: "Thiếu ID" });

    let connection;
    try {
        connection = await createPoolConnection();
        const [result] = await repo.deleteOfficial(connection, ID);
        if (result.affectedRows === 0) return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi" });
        try { await LogService.logChange(userId, userName, "Xóa lớp ngoài QC (chính thức)", `ID: ${ID}`); } catch (error) { console.error(error); }
        res.json({ success: true, message: "Xóa thành công!" });
    } catch (error) {
        console.error("Lỗi deleteChinhThuc:", error);
        res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

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
    batchApprove,
};