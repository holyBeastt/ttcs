'use strict';

const {
  validateCoreInfoPayload,
  ValidationError,
} = require('../../validators/moigiang/adminCoreInfo.validator');

const adminCoreInfoService = require('../../services/moigiang/adminCoreInfo.service');
const { ERROR_CODES, getHttpStatus } = require('../../constants/moigiang/errorCodes.constant');

/**
 * Controller: Cập nhật thông tin lõi các bản ghi mời giảng (chỉ ADMIN)
 *
 * Route: PUT /api/v1/admin/moi-giang/core-info
 * Middleware trước: verifyToken → requireAdminRole
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
const updateCoreInfo = async (req, res) => {
  try {
    // 1. Validate và sanitize payload
    let sanitizedPayload;
    try {
      sanitizedPayload = validateCoreInfoPayload(req.body);
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(400).json({
          success: false,
          errorCode: err.errorCode,
          message: err.message,
          field: err.field,
        });
      }
      throw err;
    }

    // 2. Lấy thông tin người thực hiện từ session (server-side)
    const performedBy = req.session?.userId || req.user?.id || 'UNKNOWN_ADMIN';

    // 3. Gọi service
    const result = await adminCoreInfoService.updateCoreInfo(
      sanitizedPayload.records,
      performedBy
    );

    return res.status(200).json({
      success: true,
      message: `Cập nhật thành công ${result.updated.length} bản ghi.`,
      updated: result.updated,
    });
  } catch (err) {
    // Lỗi có mã định nghĩa sẵn (Optimistic lock, Not found...)
    if (err.errorCode) {
      const httpStatus = getHttpStatus(err.errorCode);
      return res.status(httpStatus).json({
        success: false,
        errorCode: err.errorCode,
        message: err.message,
        ...(err.recordId && { recordId: err.recordId }),
      });
    }

    // Lỗi không xác định
    console.error('[AdminCoreInfo] Unexpected error:', err);
    return res.status(500).json({
      success: false,
      errorCode: ERROR_CODES.SERVER.INTERNAL_ERROR,
      message: 'Đã có lỗi xảy ra trên server. Vui lòng thử lại sau.',
    });
  }
};

const renderAdminSite = (req, res) => {
  res.render("admin_moigiang_core_info.ejs");
};

module.exports = { updateCoreInfo, renderAdminSite };
