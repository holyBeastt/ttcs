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

// Các giá trị này chỉ được dùng khi người dùng xác nhận fallback trên giao diện.
// Không tự động áp dụng ở backend để tránh biến dữ liệu thiếu thành dữ liệu hợp lệ
// mà người dùng không biết.
const FALLBACK_VALUES = Object.freeze({
  SoTinChi: 0,
  LL: 0,
  SoSinhVien: 0,
  HeSoLopDong: 1,
  HeSoT7CN: 1,
  QuyChuan: 0,
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

const isMissingValue = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '');

/**
 * Áp dụng fallback đã được client xác nhận.
 * Chỉ cho phép các field có trong FALLBACK_VALUES và chỉ áp dụng khi field
 * đang thiếu (hoặc đang là 0 đối với các fallback bằng 0).
 */
const applyConfirmedFallbacks = (record) => {
  const requestedFields = new Set(
    Array.isArray(record.fallbackFields) ? record.fallbackFields : []
  );
  const normalized = { ...record };
  const fallbacksApplied = [];

  for (const [field, fallbackValue] of Object.entries(FALLBACK_VALUES)) {
    if (!requestedFields.has(field)) continue;

    const currentValue = normalized[field];
    const canApply = isMissingValue(currentValue) ||
      (fallbackValue === 0 && Number(currentValue) === 0);

    if (canApply) {
      normalized[field] = fallbackValue;
      fallbacksApplied.push({ field, value: fallbackValue });
    }
  }

  normalized.fallbacksApplied = fallbacksApplied;
  return normalized;
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

const validateSoTinChi = (value, { allowFallback = false } = {}) => {
  const n = Number(value);
  if (
    isNaN(n) ||
    !Number.isInteger(n) ||
    (n < LIMITS.SO_TIN_CHI.min && !(allowFallback && n === 0)) ||
    n > LIMITS.SO_TIN_CHI.max
  ) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_SO_TIN_CHI,
      `Số tín chỉ phải là số nguyên trong khoảng [${LIMITS.SO_TIN_CHI.min}, ${LIMITS.SO_TIN_CHI.max}].`,
      'SoTinChi'
    );
  }
};

const validateLL = (value, { allowFallback = false } = {}) => {
  if (!isPositiveFloat(value) && !(allowFallback && Number(value) === 0)) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_LL,
      'Số tiết lên lớp (LL) phải là số thực dương, tối đa 2 chữ số thập phân.',
      'LL'
    );
  }
};

const validateQuyChuan = (value, { allowFallback = false } = {}) => {
  if (!isPositiveFloat(value) && !(allowFallback && Number(value) === 0)) {
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

const validateSoSinhVien = (value) => {
  const n = Number(value);
  if (value === undefined || value === null || isNaN(n) || !Number.isInteger(n) || n < 0) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_SO_SINH_VIEN,
      'Số sinh viên phải là số nguyên lớn hơn hoặc bằng 0.',
      'SoSinhVien'
    );
  }
};

const validateHeSoLopDong = (value) => {
  const n = parseFloat(value);
  if (value === undefined || value === null || isNaN(n) || n < 0) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_HE_SO_LOP_DONG,
      'Hệ số lớp đông phải là số lớn hơn hoặc bằng 0.',
      'HeSoLopDong'
    );
  }
};

const validateHeSoT7CN = (value) => {
  const n = parseFloat(value);
  if (value === undefined || value === null || isNaN(n) || n < 0) {
    throw new ValidationError(
      ERROR_CODES.VALIDATION.INVALID_HE_SO_T7CN,
      'Hệ số ngoài giờ phải là số lớn hơn hoặc bằng 0.',
      'HeSoT7CN'
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
  const normalizedRecord = applyConfirmedFallbacks(record);
  const appliedFields = new Set(
    normalizedRecord.fallbacksApplied.map(({ field }) => field)
  );

  validateId(normalizedRecord.id);
  validateLopHocPhan(normalizedRecord.LopHocPhan);
  validateTenLop(normalizedRecord.TenLop);
  validateSoTinChi(normalizedRecord.SoTinChi, {
    allowFallback: appliedFields.has('SoTinChi'),
  });
  validateLL(normalizedRecord.LL, {
    allowFallback: appliedFields.has('LL'),
  });
  validateQuyChuan(normalizedRecord.QuyChuan, {
    allowFallback: appliedFields.has('QuyChuan'),
  });
  validateGiaoVien(normalizedRecord.GiaoVien);
  validateKhoa(normalizedRecord.Khoa);
  validateVersion(normalizedRecord.version);
  validateSoSinhVien(normalizedRecord.SoSinhVien);
  validateHeSoLopDong(normalizedRecord.HeSoLopDong);
  validateHeSoT7CN(normalizedRecord.HeSoT7CN);

  // Trả về record đã sanitize
  return {
    id: parseInt(normalizedRecord.id, 10),
    updatedField: normalizedRecord.updatedField,
    LopHocPhan: sanitizeString(normalizedRecord.LopHocPhan),
    TenLop: sanitizeString(normalizedRecord.TenLop),
    SoTinChi: parseInt(normalizedRecord.SoTinChi, 10),
    GiaoVien: sanitizeString(normalizedRecord.GiaoVien),
    Khoa: sanitizeString(normalizedRecord.Khoa),
    LL: parseFloat(normalizedRecord.LL),
    QuyChuan: parseFloat(normalizedRecord.QuyChuan),
    SoSinhVien: parseInt(normalizedRecord.SoSinhVien, 10),
    HeSoLopDong: parseFloat(normalizedRecord.HeSoLopDong),
    HeSoT7CN: parseFloat(normalizedRecord.HeSoT7CN),
    version: parseInt(normalizedRecord.version, 10),
    fallbacksApplied: normalizedRecord.fallbacksApplied,
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
  FALLBACK_VALUES,
  isMissingValue,
};
