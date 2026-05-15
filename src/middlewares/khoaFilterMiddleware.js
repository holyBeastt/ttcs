/**
 * Khoa Filter Middleware
 * Middleware phân quyền theo khoa cho các trang vượt giờ (LNQC, KTHP, HDTQ).
 * 
 * Logic:
 * - Nếu user đăng nhập có isKhoa = 1 (thuộc khoa), tự động ép filter Khoa = MaPhongBan của user.
 *   → User chỉ xem và thao tác với bản ghi của khoa mình.
 * - Nếu user không phải khoa (isKhoa != 1), không can thiệp → xem được tất cả.
 */

/**
 * Middleware enforce filter khoa.
 * Áp dụng cho cả GET (xem dữ liệu) và POST/PUT/DELETE (thao tác dữ liệu).
 * 
 * Cách hoạt động:
 * - Kiểm tra session.isKhoa === 1
 * - Nếu đúng: ghi đè Khoa trong params, query, và body = session.MaPhongBan
 * - Gắn req.khoaFilter = { isKhoa, MaPhongBan } để service layer có thể sử dụng
 */
const enforceKhoaFilter = (req, res, next) => {
    const isKhoa = req.session?.isKhoa;
    const maPhongBan = req.session?.MaPhongBan;

    // Gắn thông tin khoa vào request để các layer phía sau sử dụng
    req.khoaFilter = {
        isKhoa: isKhoa === 1 || isKhoa === "1",
        MaPhongBan: maPhongBan || null,
    };

    // Nếu user thuộc khoa → ép filter
    if (req.khoaFilter.isKhoa && maPhongBan) {
        // Override route params
        if (req.params.Khoa !== undefined) {
            req.params.Khoa = maPhongBan;
        }

        // Override query params
        if (req.query.Khoa !== undefined) {
            req.query.Khoa = maPhongBan;
        }
        if (req.query.khoa !== undefined) {
            req.query.khoa = maPhongBan;
        }

        // Override body (cho các thao tác POST)
        if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
            if (req.body.Khoa !== undefined) {
                req.body.Khoa = maPhongBan;
            }
            if (req.body.khoa !== undefined) {
                req.body.khoa = maPhongBan;
            }
            if (req.body.major !== undefined) {
                req.body.major = maPhongBan;
            }
        }
    }

    next();
};

/**
 * Middleware kiểm tra quyền thao tác trên bản ghi cụ thể.
 * Dùng cho các route edit/delete cần verify bản ghi thuộc khoa của user.
 * 
 * @param {Function} getRecordKhoa - Async function(req) trả về mã khoa của bản ghi
 *   Ví dụ: async (req) => { ... query DB ... return record.khoa }
 */
const verifyRecordBelongsToKhoa = (getRecordKhoa) => {
    return async (req, res, next) => {
        const isKhoa = req.session?.isKhoa;
        const maPhongBan = req.session?.MaPhongBan;

        // Nếu không phải user khoa → cho qua
        if (!(isKhoa === 1 || isKhoa === "1") || !maPhongBan) {
            return next();
        }

        try {
            const recordKhoa = await getRecordKhoa(req);

            if (!recordKhoa) {
                // Không tìm thấy bản ghi → để controller xử lý 404
                return next();
            }

            if (recordKhoa !== maPhongBan) {
                return res.status(403).json({
                    success: false,
                    message: "Bạn không có quyền thao tác trên bản ghi của khoa khác.",
                });
            }

            next();
        } catch (error) {
            console.error("[KhoaFilterMiddleware] Error verifying record:", error);
            return res.status(500).json({
                success: false,
                message: "Lỗi kiểm tra quyền truy cập.",
            });
        }
    };
};

module.exports = { enforceKhoaFilter, verifyRecordBelongsToKhoa };
