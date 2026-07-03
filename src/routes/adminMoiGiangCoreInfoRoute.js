'use strict';

const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/jwtMiddleware');
const { requireAdminRole } = require('../middlewares/adminRoleMiddleware');
const { updateCoreInfo, getCoreInfo, renderAdminSite, deleteCoreInfoRow } = require('../controllers/moigiang/adminCoreInfo.controller');

// Unified auth: if Authorization header is present, verify JWT. Else, rely on session auth in requireAdminRole.
const unifiedAuth = (req, res, next) => {
  if (req.headers['authorization']) {
    return verifyToken(req, res, next);
  }
  next();
};

/**
 * Route: GET /api/v1/admin/moi-giang/core-info/site
 * Trả về giao diện Admin chỉnh sửa thông tin mời giảng.
 *
 * Dùng session-based auth (requireAdminRole đọc req.session.role).
 * KHÔNG dùng verifyToken (JWT) vì browser không gửi Authorization header khi navigate trang thường.
 */
router.get('/core-info/site', requireAdminRole, renderAdminSite);

/**
 * Route: POST /api/v1/admin/moi-giang/core-info/data
 * Lấy dữ liệu bảng mời giảng cho Admin.
 * Admin có thể lọc theo Khoa (không bị giới hạn bởi session.isKhoa như role thường).
 */
router.post('/core-info/data', requireAdminRole, getCoreInfo);

/**
 * Route: PUT /api/v1/admin/moi-giang/core-info
 *
 * Mục đích: Cho phép ADMIN cập nhật thông tin lõi (Lớp học phần, Tên lớp, Số TC, ...)
 *           trong bảng thông tin giảng viên mời giảng.
 *
 * Middleware chain:
 *   1. verifyToken       - Xác thực JWT token
 *   2. requireAdminRole  - Kiểm tra role ADMIN từ server-side session/token
 *   3. updateCoreInfo    - Controller xử lý logic
 *
 * QUAN TRỌNG: Route file này hoàn toàn độc lập, KHÔNG import hay ảnh hưởng
 *             đến bất kỳ route file nào đang tồn tại trong hệ thống.
 */
router.put('/core-info', unifiedAuth, requireAdminRole, updateCoreInfo);

/**
 * Route: DELETE /api/v1/admin/moi-giang/core-info/delete-row
 * Xóa 1 record theo id.
 */
router.delete('/core-info/delete-row', requireAdminRole, deleteCoreInfoRow);

module.exports = router;
