'use strict';

const express = require('express');
const router = express.Router();

const verifyToken = require('../middlewares/jwtMiddleware');
const { requireAdminRole } = require('../middlewares/adminRoleMiddleware');
const { updateCoreInfo, renderAdminSite } = require('../controllers/moigiang/adminCoreInfo.controller');

/**
 * Route: GET /api/v1/admin/moi-giang/core-info/site
 * Trả về giao diện Admin chỉnh sửa thông tin mời giảng
 */
router.get('/core-info/site', verifyToken, requireAdminRole, renderAdminSite);

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
router.put('/core-info', verifyToken, requireAdminRole, updateCoreInfo);

module.exports = router;
