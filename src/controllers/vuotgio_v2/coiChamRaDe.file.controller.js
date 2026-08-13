"use strict";

const importService = require("../../services/vuotgio_v2/kthpImport.service");
const {
    KTHP_SOURCES,
} = require("../../services/vuotgio_v2/kthp-import/dto/kthpImport.dto");

const getActor = (req) => ({
    id: req.session?.userId,
    userName: req.session?.TenNhanVien || req.session?.username || "Unknown",
});

const getContext = (req) => {
    // Manual input keeps metadata under input.common; flatten it into the
    // preview context so commit-time data-lock validation can read namHoc.
    const source = {
        ...(req.body?.input?.common || {}),
        ...(req.body?.context || {}),
        ...(req.body || {}),
    };
    return {
        academicYear: source.academicYear || source.namHoc || source.Nam || source.nam,
        semester: source.semester || source.hocKy || source.Ki || source.ki,
        round: source.round || source.dot,
        educationSystemId: source.educationSystemId || source.heDaoTaoId,
        educationSystemName: source.educationSystemName || source.heDaoTao,
        fileName: req.file?.originalname || null,
        allowedDepartment: req.khoaFilter?.isAdmin
            ? null
            : (req.khoaFilter?.MaPhongBan || null),
    };
};

const statusForError = (error) => {
    if (error.code === "UNAUTHENTICATED") return 401;
    if (error.code === "PREVIEW_TOKEN_FORBIDDEN") return 403;
    if (error.code?.startsWith("PREVIEW_TOKEN")) return 409;
    return 400;
};

const previewExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Không có file được tải lên." });
        }
        if (!/\.xlsx?$/iu.test(req.file.originalname || "")) {
            return res.status(400).json({
                success: false,
                message: "Định dạng file không hợp lệ; chỉ chấp nhận .xlsx hoặc .xls.",
            });
        }
        const result = await importService.preview({
            source: KTHP_SOURCES.EXCEL,
            input: req.file,
            context: getContext(req),
            actor: getActor(req),
        });
        return res.json({ success: true, ...result });
    } catch (error) {
        console.error("[KTHP] Preview Excel thất bại:", error);
        return res.status(statusForError(error)).json({
            success: false,
            code: error.code,
            message: error.message || "Không thể preview file KTHP.",
        });
    }
};

const previewData = async (req, res) => {
    try {
        const source = req.body?.source;
        if (!Object.values(KTHP_SOURCES).includes(source)) {
            return res.status(400).json({
                success: false,
                code: "KTHP_SOURCE_UNSUPPORTED",
                message: "Nguồn dữ liệu KTHP không hợp lệ.",
            });
        }
        const result = await importService.preview({
            source,
            input: req.body?.input,
            context: getContext(req),
            actor: getActor(req),
        });
        return res.json({ success: true, ...result });
    } catch (error) {
        console.error("[KTHP] Preview dữ liệu thất bại:", error);
        return res.status(statusForError(error)).json({
            success: false,
            code: error.code,
            message: error.message || "Không thể preview dữ liệu KTHP.",
        });
    }
};

// Một endpoint preview dùng chung cho cả upload Excel và dữ liệu JSON.
// Multer chỉ xử lý multipart; request JSON sẽ đi thẳng vào previewData.
const preview = (req, res) => (req.file ? previewExcel(req, res) : previewData(req, res));

const commitPreview = async (req, res) => {
    try {
        const result = await importService.commit({
            previewToken: req.body?.previewToken,
            actor: getActor(req),
        });
        return res.json({
            success: true,
            ...result,
            message: `Đã lưu ${result.saved} bản ghi`
                + (result.skipped ? `, bỏ qua ${result.skipped} bản ghi trùng.` : "."),
        });
    } catch (error) {
        console.error("[KTHP] Commit preview thất bại:", error);
        return res.status(statusForError(error)).json({
            success: false,
            code: error.code,
            message: error.message || "Không thể lưu dữ liệu KTHP.",
        });
    }
};

const attachPreviewContext = (req, res, next) => {
    try {
        const context = importService.getPreviewContext(
            req.body?.previewToken,
            getActor(req)
        );
        req.body.namHoc = context.academicYear;
        req.body.NamHoc = context.academicYear;
        return next();
    } catch (error) {
        return res.status(statusForError(error)).json({
            success: false,
            code: error.code,
            message: error.message,
        });
    }
};

const getSuggestions = async (req, res) => {
    let connection;
    try {
        const createPoolConnection = require("../../config/databasePool");
        connection = await createPoolConnection();
        const [rows] = await connection.execute(
            "SELECT id_User, TenNhanVien, MaPhongBan FROM nhanvien ORDER BY TenNhanVien"
        );
        return res.json(rows);
    } catch (error) {
        console.error("[KTHP] Không tải được danh sách giảng viên:", error);
        return res.status(500).json({ success: false, message: "Không tải được danh sách giảng viên." });
    } finally {
        if (connection) connection.release();
    }
};

module.exports = {
    preview,
    previewExcel,
    previewData,
    commitPreview,
    attachPreviewContext,
    getSuggestions,
};
