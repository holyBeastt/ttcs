/**
 * Data Lock Middleware
 * Middleware kiểm tra trạng thái khóa dữ liệu theo năm học.
 * Chặn mọi thao tác ghi (POST/PUT/DELETE) khi dữ liệu đã bị khóa.
 * Cho phép GET đi qua bình thường.
 */

const dataLockService = require("../services/vuotgio_v2/dataLock.service");

/**
 * Trích xuất namHoc từ request theo thứ tự ưu tiên:
 * 1. Route params (req.params.NamHoc || req.params.namHoc)
 * 2. Query params (req.query.NamHoc || req.query.namHoc || req.query.nam_hoc)
 * 3. Request body (req.body.NamHoc || req.body.namHoc || req.body.nam_hoc)
 * @param {object} req - Express request object
 * @returns {string|null}
 */
const extractNamHoc = (req) => {
    // Priority 1: Route params
    const fromParams = req.params.NamHoc || req.params.namHoc;
    if (fromParams) return fromParams;

    // Priority 2: Query params
    const fromQuery = req.query.NamHoc || req.query.namHoc || req.query.nam_hoc;
    if (fromQuery) return fromQuery;

    // Priority 3: Request body (object)
    if (req.body && !Array.isArray(req.body)) {
        const fromBody = req.body.NamHoc || req.body.namHoc || req.body.nam_hoc;
        if (fromBody) return fromBody;
    }

    // Priority 4: Request body (array) — lấy từ phần tử đầu tiên
    if (Array.isArray(req.body) && req.body.length > 0) {
        const first = req.body[0];
        const fromArray = first.NamHoc || first.namHoc || first.nam_hoc;
        if (fromArray) return fromArray;
    }

    return null;
};

/**
 * Middleware kiểm tra trạng thái khóa dữ liệu
 * - Cho phép GET đi qua (gọi next() ngay)
 * - Chặn POST/PUT/DELETE khi năm học đã bị khóa
 * - Fail-closed: lỗi DB/unexpected → trả về HTTP 500
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Express next function
 */
const checkDataLock = async (req, res, next) => {
    // Cho phép GET đi qua
    if (req.method === "GET") {
        return next();
    }

    // Chỉ kiểm tra khi method là POST, PUT, DELETE
    if (!["POST", "PUT", "DELETE"].includes(req.method)) {
        return next();
    }

    // Trích xuất namHoc
    const namHoc = extractNamHoc(req);

    if (!namHoc) {
        // Không tìm thấy namHoc → chặn write để an toàn (fail-closed)
        console.warn(`[DataLockMiddleware] Không tìm thấy namHoc trong request ${req.method} ${req.originalUrl}`);
        return res.status(400).json({
            success: false,
            message: "Không xác định được năm học để kiểm tra trạng thái khóa",
        });
    }

    try {
        const locked = await dataLockService.isLocked(namHoc);

        if (locked) {
            return res.status(403).json({
                success: false,
                message: `Dữ liệu năm học ${namHoc} đã được lưu, không thể thực hiện thao tác`,
            });
        }

        next();
    } catch (error) {
        console.error("[DataLockMiddleware] Error:", error);
        // Fail-closed: nếu không kiểm tra được → chặn write để an toàn
        return res.status(500).json({
            success: false,
            message: "Lỗi kiểm tra trạng thái khóa",
        });
    }
};

module.exports = { checkDataLock };
