'use strict';

/**
 * Unit Test: adminCoreInfo.validator.js
 *
 * Test thuần hàm validation — không cần DB, không cần server.
 * Framework: Jest (hoặc Mocha/Chai tùy project đã cài)
 */

const {
  validateCoreInfoPayload,
  validateSingleRecord,
  ValidationError,
  sanitizeString,
} = require('../../../src/validators/moigiang/adminCoreInfo.validator');

const { ERROR_CODES } = require('../../../src/constants/moigiang/errorCodes.constant');

// ─── Fixture: Record hợp lệ ──────────────────────────────────────────────────

const validRecord = () => ({
  id: 1,
  LopHocPhan: 'ATTT101',
  TenLop: 'ATTT101.1',
  SoTinChi: 3,
  GiaoVien: 'Nguyễn Văn A',
  Khoa: 'ATTT',
  LL: 45,
  QuyChuan: 45.0,
  version: 0,
});

// ─── Helper ─────────────────────────────────────────────────────────────────

const expectValidationError = (fn, expectedCode, expectedField = null) => {
  try {
    fn();
    throw new Error('Expected ValidationError but none was thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.errorCode).toBe(expectedCode);
    if (expectedField) {
      expect(err.field).toBe(expectedField);
    }
  }
};

// ─── Test: sanitizeString ────────────────────────────────────────────────────

describe('sanitizeString', () => {
  it('trim leading/trailing whitespace', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('escape HTML special characters', () => {
    expect(sanitizeString('<script>alert("XSS")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
    );
  });

  it('escape ampersand', () => {
    expect(sanitizeString('A & B')).toBe('A &amp; B');
  });

  it('return empty string for non-string input', () => {
    expect(sanitizeString(null)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
    expect(sanitizeString(123)).toBe('');
  });
});

// ─── Test: validateSingleRecord — field `id` ─────────────────────────────────

describe('validateSingleRecord — field: id', () => {
  it('throw MG_VAL_001 when id is null', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), id: null }),
      ERROR_CODES.VALIDATION.MISSING_ID,
      'id'
    );
  });

  it('throw MG_VAL_001 when id is 0', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), id: 0 }),
      ERROR_CODES.VALIDATION.MISSING_ID
    );
  });

  it('throw MG_VAL_001 when id is negative', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), id: -5 }),
      ERROR_CODES.VALIDATION.MISSING_ID
    );
  });

  it('throw MG_VAL_001 when id is string text', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), id: 'abc' }),
      ERROR_CODES.VALIDATION.MISSING_ID
    );
  });
});

// ─── Test: validateSingleRecord — field `LopHocPhan` ─────────────────────────

describe('validateSingleRecord — field: LopHocPhan', () => {
  it('throw MG_VAL_002 when LopHocPhan is empty string', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), LopHocPhan: '' }),
      ERROR_CODES.VALIDATION.INVALID_LOP_HOC_PHAN,
      'LopHocPhan'
    );
  });

  it('throw MG_VAL_002 when LopHocPhan is whitespace only', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), LopHocPhan: '   ' }),
      ERROR_CODES.VALIDATION.INVALID_LOP_HOC_PHAN
    );
  });

  it('throw MG_VAL_002 when LopHocPhan exceeds 100 characters', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), LopHocPhan: 'A'.repeat(101) }),
      ERROR_CODES.VALIDATION.INVALID_LOP_HOC_PHAN
    );
  });

  it('accept LopHocPhan at exactly 100 characters', () => {
    expect(() =>
      validateSingleRecord({ ...validRecord(), LopHocPhan: 'A'.repeat(100) })
    ).not.toThrow();
  });
});

// ─── Test: validateSingleRecord — field `TenLop` ─────────────────────────────

describe('validateSingleRecord — field: TenLop', () => {
  it('throw MG_VAL_003 when TenLop is empty', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), TenLop: '' }),
      ERROR_CODES.VALIDATION.INVALID_TEN_LOP,
      'TenLop'
    );
  });

  it('throw MG_VAL_003 when TenLop exceeds 200 characters', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), TenLop: 'A'.repeat(201) }),
      ERROR_CODES.VALIDATION.INVALID_TEN_LOP
    );
  });
});

// ─── Test: validateSingleRecord — field `SoTinChi` ───────────────────────────

describe('validateSingleRecord — field: SoTinChi', () => {
  it('throw MG_VAL_004 when SoTinChi = 0', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), SoTinChi: 0 }),
      ERROR_CODES.VALIDATION.INVALID_SO_TIN_CHI,
      'SoTinChi'
    );
  });

  it('throw MG_VAL_004 when SoTinChi = 11 (over max)', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), SoTinChi: 11 }),
      ERROR_CODES.VALIDATION.INVALID_SO_TIN_CHI
    );
  });

  it('throw MG_VAL_004 when SoTinChi is negative', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), SoTinChi: -1 }),
      ERROR_CODES.VALIDATION.INVALID_SO_TIN_CHI
    );
  });

  it('throw MG_VAL_004 when SoTinChi is a string text', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), SoTinChi: 'ba' }),
      ERROR_CODES.VALIDATION.INVALID_SO_TIN_CHI
    );
  });

  it('throw MG_VAL_004 when SoTinChi is a float', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), SoTinChi: 2.5 }),
      ERROR_CODES.VALIDATION.INVALID_SO_TIN_CHI
    );
  });

  it('accept SoTinChi at boundary values 1 and 10', () => {
    expect(() => validateSingleRecord({ ...validRecord(), SoTinChi: 1 })).not.toThrow();
    expect(() => validateSingleRecord({ ...validRecord(), SoTinChi: 10 })).not.toThrow();
  });
});

// ─── Test: validateSingleRecord — field `LL` ─────────────────────────────────

describe('validateSingleRecord — field: LL', () => {
  it('throw MG_VAL_005 when LL = 0', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), LL: 0 }),
      ERROR_CODES.VALIDATION.INVALID_LL,
      'LL'
    );
  });

  it('throw MG_VAL_005 when LL is negative', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), LL: -10 }),
      ERROR_CODES.VALIDATION.INVALID_LL
    );
  });

  it('throw MG_VAL_005 when LL has more than 2 decimal places', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), LL: 45.123 }),
      ERROR_CODES.VALIDATION.INVALID_LL
    );
  });

  it('accept LL with 2 decimal places', () => {
    expect(() => validateSingleRecord({ ...validRecord(), LL: 45.50 })).not.toThrow();
  });
});

// ─── Test: validateSingleRecord — field `version` ────────────────────────────

describe('validateSingleRecord — field: version', () => {
  it('throw MG_VAL_009 when version is undefined', () => {
    const rec = validRecord();
    delete rec.version;
    expectValidationError(
      () => validateSingleRecord(rec),
      ERROR_CODES.VALIDATION.MISSING_VERSION,
      'version'
    );
  });

  it('throw MG_VAL_009 when version is negative', () => {
    expectValidationError(
      () => validateSingleRecord({ ...validRecord(), version: -1 }),
      ERROR_CODES.VALIDATION.MISSING_VERSION
    );
  });

  it('accept version = 0 (initial state)', () => {
    expect(() => validateSingleRecord({ ...validRecord(), version: 0 })).not.toThrow();
  });
});

// ─── Test: validateCoreInfoPayload ───────────────────────────────────────────

describe('validateCoreInfoPayload', () => {
  it('throw MG_VAL_010 when records is not an array', () => {
    expectValidationError(
      () => validateCoreInfoPayload({ records: 'not-an-array' }),
      ERROR_CODES.VALIDATION.INVALID_RECORDS
    );
  });

  it('throw MG_VAL_010 when records is empty array', () => {
    expectValidationError(
      () => validateCoreInfoPayload({ records: [] }),
      ERROR_CODES.VALIDATION.INVALID_RECORDS
    );
  });

  it('return sanitized records for valid payload', () => {
    const result = validateCoreInfoPayload({ records: [validRecord()] });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].id).toBe(1);
  });

  it('include index in error message for invalid nested record', () => {
    try {
      validateCoreInfoPayload({ records: [{ ...validRecord(), SoTinChi: -1 }] });
    } catch (err) {
      expect(err.message).toContain('[records[0]');
    }
  });

  it('ignore extra fields in the record payload', () => {
    // Giả lập AG Grid gửi lên các trường disabled (SoSinhVien, NgayBatDau, HeSoLopDong...)
    const recordWithExtraFields = {
      ...validRecord(),
      SoSinhVien: 100,
      NgayBatDau: '2023-01-01',
      HeSoLopDong: 1.5,
      BoMon: 'Unknown'
    };
    
    // Validator vẫn phải pass thành công và bỏ qua những trường thừa này ở service (service tự destructure)
    const result = validateCoreInfoPayload({ records: [recordWithExtraFields] });
    expect(result.records).toHaveLength(1);
    expect(result.records[0].LopHocPhan).toBe('ATTT101');
  });
});

