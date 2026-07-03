'use strict';

/**
 * Error Codes - Module Mời Giảng (Admin Core Info)
 * Cấu trúc mã: MG_[NHÓM]_[3 CHỮ SỐ]
 *
 * Nhóm:
 *   AUTH - Xác thực & phân quyền
 *   VAL  - Validation đầu vào
 *   DB   - Lỗi tầng cơ sở dữ liệu
 *   SRV  - Lỗi server không xác định
 */

const ERROR_CODES = Object.freeze({
  AUTH: Object.freeze({
    /** 401 - Chưa đăng nhập hoặc session hết hạn */
    UNAUTHORIZED: 'MG_AUTH_001',
    /** 403 - Không đủ quyền, yêu cầu role ADMIN */
    FORBIDDEN: 'MG_AUTH_002',
  }),

  VALIDATION: Object.freeze({
    /** 400 - Thiếu ID bản ghi hoặc ID không hợp lệ */
    MISSING_ID: 'MG_VAL_001',
    /** 400 - LopHocPhan rỗng hoặc vượt giới hạn 100 ký tự */
    INVALID_LOP_HOC_PHAN: 'MG_VAL_002',
    /** 400 - TenLop rỗng hoặc vượt giới hạn 200 ký tự */
    INVALID_TEN_LOP: 'MG_VAL_003',
    /** 400 - SoTinChi không phải số nguyên trong khoảng [1, 10] */
    INVALID_SO_TIN_CHI: 'MG_VAL_004',
    /** 400 - LL (số tiết lên lớp) không phải số thực dương */
    INVALID_LL: 'MG_VAL_005',
    /** 400 - QuyChuan (số tiết quy chuẩn) không phải số thực dương */
    INVALID_QUY_CHUAN: 'MG_VAL_006',
    /** 400 - GiaoVien rỗng hoặc vượt giới hạn 200 ký tự */
    INVALID_GIAO_VIEN: 'MG_VAL_007',
    /** 400 - Khoa rỗng hoặc vượt giới hạn 50 ký tự */
    INVALID_KHOA: 'MG_VAL_008',
    /** 400 - Thiếu trường version (dùng cho optimistic locking) */
    MISSING_VERSION: 'MG_VAL_009',
    /** 400 - Mảng records rỗng hoặc không phải array */
    INVALID_RECORDS: 'MG_VAL_010',
  }),

  DATABASE: Object.freeze({
    /** 409 - Xung đột optimistic lock: bản ghi đã bị sửa bởi phiên khác */
    OPTIMISTIC_LOCK_CONFLICT: 'MG_DB_001',
    /** 404 - Không tìm thấy bản ghi với ID đã cho */
    RECORD_NOT_FOUND: 'MG_DB_002',
    /** 500 - Lỗi database không xác định */
    UNKNOWN_DB_ERROR: 'MG_DB_003',
  }),

  SERVER: Object.freeze({
    /** 500 - Lỗi server không xác định */
    INTERNAL_ERROR: 'MG_SRV_001',
  }),
});

/**
 * Mapping từ error code sang HTTP status code mặc định
 */
const HTTP_STATUS_MAP = Object.freeze({
  [ERROR_CODES.AUTH.UNAUTHORIZED]: 401,
  [ERROR_CODES.AUTH.FORBIDDEN]: 403,
  [ERROR_CODES.VALIDATION.MISSING_ID]: 400,
  [ERROR_CODES.VALIDATION.INVALID_LOP_HOC_PHAN]: 400,
  [ERROR_CODES.VALIDATION.INVALID_TEN_LOP]: 400,
  [ERROR_CODES.VALIDATION.INVALID_SO_TIN_CHI]: 400,
  [ERROR_CODES.VALIDATION.INVALID_LL]: 400,
  [ERROR_CODES.VALIDATION.INVALID_QUY_CHUAN]: 400,
  [ERROR_CODES.VALIDATION.INVALID_GIAO_VIEN]: 400,
  [ERROR_CODES.VALIDATION.INVALID_KHOA]: 400,
  [ERROR_CODES.VALIDATION.MISSING_VERSION]: 400,
  [ERROR_CODES.VALIDATION.INVALID_RECORDS]: 400,
  [ERROR_CODES.DATABASE.OPTIMISTIC_LOCK_CONFLICT]: 409,
  [ERROR_CODES.DATABASE.RECORD_NOT_FOUND]: 404,
  [ERROR_CODES.DATABASE.UNKNOWN_DB_ERROR]: 500,
  [ERROR_CODES.SERVER.INTERNAL_ERROR]: 500,
});

/**
 * Lấy HTTP status code từ error code
 * @param {string} errorCode
 * @returns {number}
 */
const getHttpStatus = (errorCode) => HTTP_STATUS_MAP[errorCode] || 500;

module.exports = {
  ERROR_CODES,
  HTTP_STATUS_MAP,
  getHttpStatus,
};
