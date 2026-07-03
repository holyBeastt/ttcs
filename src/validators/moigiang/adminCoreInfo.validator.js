'use strict';

const { ERROR_CODES } = require('../../constants/moigiang/errorCodes.constant');

// ─── Giới hạn độ dài chuỗi ────────────────────────────────────────────────────
const LIMITS = Object.freeze({
  LOP_HOC_PHAN: { min: 1, max: 100 },
  TEN_LOP:       { min: 1, max: 200 },
  GIAO_VIEN:     { min: 1, max: 200 },
  KHOA:          { min: 1, max: 50  },
  SO_TIN_CHI:    { min: 1, max: 10  },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Kiểm tra chuỗi có hợp lệ về độ dài không
 * @param {*} value
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
const isValidString = (value, min, max) => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length >= min && trimmed.length <= max;
};

/**
 * Sanitize chuỗi: trim và escape các ký tự HTML nguy hiểm (phòng XSS)
 * @param {string} value
 * @returns {string}
 */
const sanitizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value
    .trim()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Kiểm tra một số là số thực dương (> 0), tối đa 2 chữ số thập phân
 * @param {*} value
 * @returns {boolean}
 */
const isPositiveFloat = (value) => {
  const n = parseFloat(value);
  if (isNaN(n) || n <= 0) return false;
  // Kiểm tra tối đa 2 chữ số thập phân
  return /^\d+(\.\d{1,2})?$/.test(String(n));
};

// ─── Lỗi Validation Có Cấu Trúc ─────────────────────────────────────────────

class ValidationError extends Error {
  /**
   * @param {string} errorCode - Mã lỗi từ ERROR_CODES.VALIDATION
   * @param {string} message   - Mô tả người dùng đọc được
   * @param {string|null} field - Field gây lỗi
   */
  constructor(errorCode, message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.errorCode = errorCode;
    this.field = field;
  }
}

// ─── Validate từng field ──────────────────────────────────────────────────────

const validateId = (id) => {
  const n = parseInt(id, 10);
  if (!id || isNaN(n) || n <= 0) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.MISSING_ID,
      'ID bản ghi không hợp lệ hoặc bị thiếu.',
      'id'
    );
  }
};

const validateLopHocPhan = (value) => {
  if (!isValidString(value, LIMITS.LOP_HOC_PHAN.min, LIMITS.LOP_HOC_PHAN.max)) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_LOP_HOC_PHAN,
      `Lớp học phần không được rỗng và không vượt quá ${LIMITS.LOP_HOC_PHAN.max} ký tự.`,
      'LopHocPhan'
    );
  }
};

const validateTenLop = (value) => {
  if (!isValidString(value, LIMITS.TEN_LOP.min, LIMITS.TEN_LOP.max)) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_TEN_LOP,
      `Tên lớp không được rỗng và không vượt quá ${LIMITS.TEN_LOP.max} ký tự.`,
      'TenLop'
    );
  }
};

const validateSoTinChi = (value) => {
  const n = Number(value);
  if (
    isNaN(n) ||
    !Number.isInteger(n) ||
    n < LIMITS.SO_TIN_CHI.min ||
    n > LIMITS.SO_TIN_CHI.max
  ) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_SO_TIN_CHI,
      `Số tín chỉ phải là số nguyên trong khoảng [${LIMITS.SO_TIN_CHI.min}, ${LIMITS.SO_TIN_CHI.max}].`,
      'SoTinChi'
    );
  }
};

const validateLL = (value) => {
  if (!isPositiveFloat(value)) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_LL,
      'Số tiết lên lớp (LL) phải là số thực dương, tối đa 2 chữ số thập phân.',
      'LL'
    );
  }
};

const validateQuyChuan = (value) => {
  if (!isPositiveFloat(value)) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_QUY_CHUAN,
      'Số tiết quy chuẩn (QC) phải là số thực dương, tối đa 2 chữ số thập phân.',
      'QuyChuan'
    );
  }
};

const validateGiaoVien = (value) => {
  if (!isValidString(value, LIMITS.GIAO_VIEN.min, LIMITS.GIAO_VIEN.max)) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_GIAO_VIEN,
      `Tên giảng viên theo TKB không được rỗng và không vượt quá ${LIMITS.GIAO_VIEN.max} ký tự.`,
      'GiaoVien'
    );
  }
};

const validateKhoa = (value) => {
  if (!isValidString(value, LIMITS.KHOA.min, LIMITS.KHOA.max)) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_KHOA,
      `Khoa không được rỗng và không vượt quá ${LIMITS.KHOA.max} ký tự.`,
      'Khoa'
    );
  }
};

const validateVersion = (value) => {
  const n = parseInt(value, 10);
  if (value === undefined || value === null || isNaN(n) || n < 0) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.MISSING_VERSION,
      'Thiếu hoặc không hợp lệ trường version (dùng cho optimistic locking).',
      'version'
    );
  }
};

// ─── Validate toàn bộ một record ─────────────────────────────────────────────

/**
 * Validate và sanitize một record trong payload
 * @param {object} record
 * @returns {object} Record đã sanitize
 * @throws {ValidationError}
 */
const validateSingleRecord = (record) => {
  validateId(record.id);
  validateLopHocPhan(record.LopHocPhan);
  validateTenLop(record.TenLop);
  validateSoTinChi(record.SoTinChi);
  validateLL(record.LL);
  validateQuyChuan(record.QuyChuan);
  validateGiaoVien(record.GiaoVien);
  validateKhoa(record.Khoa);
  validateVersion(record.version);

  // Trả về record đã sanitize
  return {
    id: parseInt(record.id, 10),
    LopHocPhan: sanitizeString(record.LopHocPhan),
    TenLop: sanitizeString(record.TenLop),
    SoTinChi: parseInt(record.SoTinChi, 10),
    GiaoVien: sanitizeString(record.GiaoVien),
    Khoa: sanitizeString(record.Khoa),
    LL: parseFloat(record.LL),
    QuyChuan: parseFloat(record.QuyChuan),
    version: parseInt(record.version, 10),
  };
};

/**
 * Validate toàn bộ payload request
 * @param {object} body - req.body
 * @returns {{ records: object[] }} Danh sách records đã sanitize
 * @throws {ValidationError}
 */
const validateCoreInfoPayload = (body) => {
  const { records } = body;

  if (!Array.isArray(records) || records.length === 0) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_RECORDS,
      'Danh sách records không hợp lệ hoặc rỗng.',
      'records'
    );
  }

  const sanitizedRecords = records.map((record, index) => {
    try {
      return validateSingleRecord(record);
    } catch (err) {
      // Bọc lỗi để trả về thông tin index
      if (err instanceof ValidationError) {
        err.message = `[records[${index}].${err.field}] ${err.message}`;
      }
      throw err;
    }
  });

  return { records: sanitizedRecords };
};

module.exports = {
  validateCoreInfoPayload,
  validateSingleRecord,
  ValidationError,
  sanitizeString,
  LIMITS,
};
