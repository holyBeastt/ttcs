"use strict";

const createPoolConnection = require("../../config/databasePool");
const LogService = require("../logService");
const repo = require("../../repositories/vuotgio_v2/kthp.repo");
const mapper = require("../../mappers/vuotgio_v2/kthp.mapper");
const {
    canModifyRecord,
    canChangeApproval,
} = require("./kthpPermission.service");

const getUserContext = (req) => ({
    userId: req.session?.userId || null,
    userName: req.session?.TenNhanVien || req.session?.username || "Unknown",
});

const safeLog = async (...args) => {
    try {
        await LogService.logChange(...args);
    } catch (error) {
        console.error("[KTHP] Không ghi được audit log:", error);
    }
};

const getLecturerByName = async (connection, name) => {
    const [rows] = await connection.execute(
        `SELECT id_User, TenNhanVien, MaPhongBan
         FROM nhanvien WHERE TenNhanVien = ? LIMIT 2`,
        [name]
    );
    if (rows.length !== 1) return null;
    return rows[0];
};

const getLecturerById = async (connection, id) => {
    const [rows] = await connection.execute(
        `SELECT id_User, TenNhanVien, MaPhongBan
         FROM nhanvien WHERE id_User = ? LIMIT 1`,
        [id]
    );
    return rows[0] || null;
};

const getEducationSystem = async (connection, { id, name }) => {
    if ((id === null || id === undefined || id === "") && !name) return null;
    const hasId = id !== null && id !== undefined && id !== "";
    const where = hasId ? "id = ?" : "he_dao_tao = ?";
    const [rows] = await connection.execute(
        `SELECT id, he_dao_tao FROM he_dao_tao WHERE ${where} LIMIT 2`,
        [hasId ? id : name]
    );
    if (rows.length !== 1) return null;
    return rows[0];
};

const canonicalRows = (rows) => rows.map(mapper.rowToCanonical);

const getTableData = async (req, res) => {
    const { NamHoc, heDaoTao, dot, ki } = req.body;
    const khoa = req.body.khoa || req.body.Khoa;
    let connection;
    try {
        connection = await createPoolConnection();
        const rows = await repo.getTable(connection, {
            namHoc: NamHoc,
            khoa,
            heDaoTao,
            dot,
            ki,
        });
        return res.json({ success: true, data: canonicalRows(rows) });
    } catch (error) {
        console.error("[KTHP] Lỗi lấy dữ liệu duyệt:", error);
        return res.status(500).json({ success: false, message: "Không thể truy xuất dữ liệu." });
    } finally {
        if (connection) connection.release();
    }
};

const resolveEditReferences = async (connection, body, allowedDepartment) => {
    const employeeId = body.employeeId ?? body.employee_id ?? body.id_user;
    let employee;
    if (employeeId) {
        employee = await getLecturerById(connection, employeeId);
    } else {
        const name = body.employee?.name
            || body.giang_vien
            || body.giangvien
            || body.hoVaTen;
        employee = await getLecturerByName(connection, name);
    }
    if (!employee) {
        const error = new Error("Không xác định được duy nhất giảng viên trong hệ thống.");
        error.code = "EMPLOYEE_NOT_FOUND";
        throw error;
    }
    if (!employee.MaPhongBan) {
        const error = new Error("Giảng viên chưa được gán khoa/đơn vị.");
        error.code = "EMPLOYEE_DEPARTMENT_MISSING";
        throw error;
    }
    if (allowedDepartment && employee.MaPhongBan !== allowedDepartment) {
        const error = new Error("Giảng viên không thuộc khoa được phép thao tác.");
        error.code = "EMPLOYEE_OUTSIDE_SCOPE";
        throw error;
    }

    const educationSystemId = body.educationSystem?.id
        ?? body.educationSystemId
        ?? body.heDaoTaoId
        ?? body.he_dao_tao_id;
    const educationSystemName = body.educationSystem?.name
            || body.doi_tuong
            || body.doituong;
    const educationSystem = await getEducationSystem(connection, {
        id: educationSystemId,
        name: educationSystemName,
    });
    if (!educationSystem) {
        const error = new Error("Không xác định được hệ đào tạo.");
        error.code = "EDUCATION_SYSTEM_NOT_FOUND";
        throw error;
    }
    return {
        employeeId: employee.id_User,
        employeeName: employee.TenNhanVien,
        department: employee.MaPhongBan,
        educationSystemId: educationSystem.id,
        educationSystemName: educationSystem.he_dao_tao,
    };
};

const edit = async (req, res) => {
    const { ID } = req.params;
    const { userId, userName } = getUserContext(req);
    if (!ID) return res.status(400).json({ success: false, message: "Thiếu ID cần cập nhật." });

    let connection;
    try {
        connection = await createPoolConnection();
        await connection.beginTransaction();
        const existing = await repo.getByIdForUpdate(connection, ID);
        if (!existing) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
        }
        if (!canModifyRecord(req.session, existing)) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: "Bạn không có quyền sửa bản ghi này." });
        }

        const allowedDepartment = req.khoaFilter?.isAdmin
            ? null
            : (req.khoaFilter?.MaPhongBan || null);
        const references = await resolveEditReferences(
            connection,
            req.body,
            allowedDepartment
        );
        const model = mapper.toPersistenceModel(req.body, references);
        if (model.parent.activityType !== existing.loai_kthp) {
            await connection.rollback();
            return res.status(409).json({
                success: false,
                code: "KTHP_TYPE_CHANGE_FORBIDDEN",
                message: "Không được đổi loại KTHP khi chỉnh sửa; hãy xóa và tạo bản ghi mới.",
            });
        }

        const result = await repo.update(connection, ID, model);
        if (result.affectedRows !== 1) {
            const error = new Error("Bản ghi đã thay đổi hoặc không còn tồn tại.");
            error.code = "KTHP_UPDATE_CONFLICT";
            throw error;
        }
        await connection.commit();

        await safeLog(
            userId,
            userName,
            "Sửa KTHP",
            `Sửa KTHP ID ${ID}; trạng thái duyệt đã được đặt lại`
        );
        return res.status(200).json({
            success: true,
            message: "Cập nhật thành công; trạng thái duyệt đã được đặt lại.",
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("[KTHP] Rollback edit thất bại:", rollbackError);
            }
        }
        console.error("[KTHP] Lỗi cập nhật:", error);
        const status = [
            "KTHP_FIELD_REQUIRED",
            "KTHP_NUMBER_INVALID",
            "KTHP_TYPE_UNSUPPORTED",
            "KTHP_COMMON_NUMBER_INVALID",
            "EMPLOYEE_REQUIRED",
            "EMPLOYEE_NOT_FOUND",
            "EMPLOYEE_DEPARTMENT_MISSING",
            "EMPLOYEE_OUTSIDE_SCOPE",
            "EDUCATION_SYSTEM_NOT_FOUND",
            "EDUCATION_SYSTEM_REQUIRED",
            "SEMESTER_INVALID",
            "ROUND_INVALID",
            "STANDARD_HOURS_INVALID",
            "EXAM_DURATION_INVALID",
            "SHIFT_COUNT_INVALID",
            "QUANTITY_INVALID",
            "MARKING_COUNT_INVALID",
        ].includes(error.code) ? 400 : 500;
        return res.status(status).json({
            success: false,
            code: error.code,
            message: error.message || "Có lỗi xảy ra khi cập nhật.",
        });
    } finally {
        if (connection) connection.release();
    }
};

const deleteRecord = async (req, res) => {
    const { ID } = req.params;
    const { userId, userName } = getUserContext(req);
    if (!ID) return res.status(400).json({ success: false, message: "Thiếu ID cần xóa." });

    let connection;
    try {
        connection = await createPoolConnection();
        await connection.beginTransaction();
        const existing = await repo.getByIdForUpdate(connection, ID);
        if (!existing) {
            await connection.rollback();
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi." });
        }
        if (!canModifyRecord(req.session, existing)) {
            await connection.rollback();
            return res.status(403).json({ success: false, message: "Bạn không có quyền xóa bản ghi này." });
        }
        const [result] = await repo.remove(connection, ID);
        if (result.affectedRows !== 1) throw new Error("Không xóa được bản ghi KTHP.");
        await connection.commit();
        await safeLog(userId, userName, "Xóa KTHP", `Xóa KTHP ID ${ID}`);
        return res.status(200).json({ success: true, message: "Xóa thành công." });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("[KTHP] Rollback delete thất bại:", rollbackError);
            }
        }
        console.error("[KTHP] Lỗi xóa:", error);
        return res.status(500).json({ success: false, message: error.message });
    } finally {
        if (connection) connection.release();
    }
};

const batchApprove = async (req, res) => {
    const { userId, userName } = getUserContext(req);
    const records = req.body.updates || req.body;
    if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: "Thiếu dữ liệu cần cập nhật." });
    }
    const updates = records.map((record) => ({
        id: Number(record.id),
        khoa_duyet: Number(record.khoaDuyet ?? record.khoaduyet ?? record.khoa_duyet),
        khao_thi_duyet: Number(
            record.khaoThiDuyet ?? record.khaothiduyet ?? record.khao_thi_duyet
        ),
    }));
    if (updates.some((item) =>
        !Number.isInteger(item.id)
        || ![0, 1].includes(item.khoa_duyet)
        || ![0, 1].includes(item.khao_thi_duyet))) {
        return res.status(400).json({ success: false, message: "Dữ liệu duyệt không hợp lệ." });
    }
    if (new Set(updates.map((item) => item.id)).size !== updates.length) {
        return res.status(400).json({
            success: false,
            message: "Danh sách duyệt chứa ID trùng.",
        });
    }
    updates.sort((left, right) => left.id - right.id);

    let connection;
    try {
        connection = await createPoolConnection();
        await connection.beginTransaction();
        const changedUpdates = [];
        for (const update of updates) {
            const existing = await repo.getByIdForUpdate(connection, update.id);
            if (!existing) {
                const error = new Error(`Không tìm thấy bản ghi KTHP ID ${update.id}.`);
                error.code = "KTHP_APPROVAL_CONFLICT";
                throw error;
            }
            if (!canChangeApproval(req.session, existing, update)) {
                const error = new Error(
                    `Bạn không có quyền đổi trạng thái duyệt của bản ghi ID ${update.id}.`
                );
                error.code = "KTHP_APPROVAL_FORBIDDEN";
                throw error;
            }
            if (Number(existing.khoa_duyet) !== update.khoa_duyet
                || Number(existing.khao_thi_duyet) !== update.khao_thi_duyet) {
                changedUpdates.push(update);
            }
        }
        const updatedCount = await repo.updateBatchApproval(connection, changedUpdates);
        if (updatedCount !== changedUpdates.length) {
            const error = new Error("Một hoặc nhiều bản ghi duyệt không tồn tại.");
            error.code = "KTHP_APPROVAL_CONFLICT";
            throw error;
        }
        await connection.commit();
        await safeLog(
            userId,
            userName,
            "Batch Duyệt KTHP",
            `Cập nhật trạng thái duyệt cho ${updatedCount} bản ghi`
        );
        return res.status(200).json({
            success: true,
            message: `Đã cập nhật ${updatedCount} bản ghi.`,
            updated: updatedCount,
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error("[KTHP] Rollback approval thất bại:", rollbackError);
            }
        }
        console.error("[KTHP] Lỗi batch duyệt:", error);
        const status = error.code === "KTHP_APPROVAL_FORBIDDEN"
            ? 403
            : error.code === "KTHP_APPROVAL_CONFLICT" ? 409 : 500;
        return res.status(status).json({
            success: false,
            code: error.code,
            message: error.message,
        });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    getTableData,
    edit,
    delete: deleteRecord,
    batchApprove,
};
