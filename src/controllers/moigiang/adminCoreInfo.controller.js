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

/**
 * Controller: Lấy dữ liệu bảng mời giảng cho Admin (chỉ ADMIN)
 *
 * Route: POST /api/v1/admin/moi-giang/core-info/data
 * Khác với renderInfo của bên thường:
 *   - ADMIN được phép lấy tất cả khoa, không bị giới hạn bởi req.session.isKhoa
 *   - Lấy filter từ req.body: { Khoa, Dot, Ki, Nam, HeDaoTao }
 */
const getCoreInfo = async (req, res) => {
  const { Khoa, Dot, Ki, Nam, HeDaoTao } = req.body;

  if (!Dot || !Ki || !Nam) {
    return res.status(400).json({
      success: false,
      message: 'Thiếu tham số bắt buộc: Dot, Ki, Nam.',
    });
  }

  const TABLE_QC = process.env.DB_TABLE_QC || 'quychuan';
  const pool = require('../../config/Pool');

  try {
    let sql = `SELECT * FROM ${TABLE_QC} WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?`;
    const params = [Dot, Ki, Nam];

    // Lọc theo Khoa nếu admin chọn cụ thể (không phải ALL)
    if (Khoa && Khoa !== 'ALL' && Khoa !== '') {
      sql += ' AND Khoa = ?';
      params.push(Khoa);
    }

    // Lọc theo Hệ đào tạo nếu có
    if (HeDaoTao && HeDaoTao !== 'ALL') {
      sql += ' AND he_dao_tao = ?';
      params.push(HeDaoTao);
    }

    const [results] = await pool.query(sql, params);

    return res.status(200).json({
      success: true,
      results,
      total: results.length,
    });
  } catch (err) {
    console.error('[AdminCoreInfo] getCoreInfo error:', err);
    return res.status(500).json({
      success: false,
      message: 'Đã có lỗi xảy ra trên server.',
    });
  }
};

/**
 * Controller: Xóa 1 bản ghi trong bảng quychuan (chỉ ADMIN)
 * 
 * Route: DELETE /api/v1/admin/moi-giang/core-info/delete-row
 */
const deleteCoreInfoRow = async (req, res) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, message: 'ID không hợp lệ.' });
  }

  try {
    const result = await adminCoreInfoService.deleteCoreInfo(id);

    if (!result) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy dữ liệu để xóa.' });
    }

    return res.json({ success: true, message: 'Dòng dữ liệu đã được xóa thành công.' });
  } catch (error) {
    console.error('[AdminCoreInfo] deleteCoreInfoRow error:', error);
    return res.status(500).json({ success: false, message: 'Đã xảy ra lỗi khi xóa dữ liệu.' });
  }
};

module.exports = { updateCoreInfo, getCoreInfo, renderAdminSite, deleteCoreInfoRow };
