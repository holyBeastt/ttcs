'use strict';

const { ERROR_CODES } = require('../constants/moigiang/errorCodes.constant');

/**
 * Middleware xác thực role ADMIN cho tính năng chỉnh sửa thông tin lõi mời giảng.
 *
 * Đọc role từ server-side (req.session.role hoặc req.user.role từ JWT đã decode).
 * KHÔNG tin bất kỳ giá trị nào từ body, query, hay header do client tự gửi.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
const requireAdminRole = (req, res, next) => {
  try {
    // Ưu tiên đọc role từ session (nếu dùng session-based auth),
    // sau đó fallback sang req.user (nếu dùng JWT middleware trước đó)
    const role = req.session?.role || req.user?.role;

    if (!role) {
      return res.status(401).json({
        success: false,
        errorCode: ERROR_CODES.AUTH.UNAUTHORIZED,
        message: 'Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại.',
      });
    }

    if (role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        errorCode: ERROR_CODES.AUTH.FORBIDDEN,
        message: 'Bạn không có quyền thực hiện thao tác này. Chỉ ADMIN mới được phép truy cập.',
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      errorCode: ERROR_CODES.SERVER.INTERNAL_ERROR,
      message: 'Lỗi server trong quá trình xác thực quyền truy cập.',
    });
  }
};

module.exports = { requireAdminRole };
