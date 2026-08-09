'use strict';

/**
 * Integration Test: PUT /api/v1/admin/moi-giang/core-info
 *
 * Test API thực tế với server chạy thật.
 * Framework: Jest + Supertest
 *
 * --- Pattern: AUTO-SAVE (giống TKB) ---
 * Mỗi request tương ứng 1 lần ADMIN sửa 1 ô trong AG Grid.
 * onCellValueChanged gọi PUT ngay lập tức với 1 record duy nhất.
 * Không có batch submit / nút "Cập nhật".
 *
 * Yêu cầu:
 *   - Server phải khởi động được (có DB test hoặc mock DB)
 *   - Có token JWT hợp lệ cho role ADMIN
 *   - Có token JWT hợp lệ cho role khác (VD: GV)
 *
 * NOTE: Thay ADMIN_TOKEN và GV_TOKEN bằng token thực
 *       hoặc mock jwt.verify trong beforeAll.
 */

const request = require('supertest');
const app = require('../../../src/server'); // Express app instance
const { ERROR_CODES } = require('../../../src/constants/moigiang/errorCodes.constant');

// ─── Token helpers (thay bằng cách tạo JWT thực tế trong project) ─────────────

const ADMIN_TOKEN = process.env.TEST_ADMIN_JWT || 'REPLACE_WITH_VALID_ADMIN_JWT';
const GV_TOKEN = process.env.TEST_GV_JWT || 'REPLACE_WITH_VALID_GV_JWT';

const authHeader = (token) => ({ Authorization: `Bearer ${token}` });

// ─── Fixture ─────────────────────────────────────────────────────────────────

const validRecord = (overrides = {}) => ({
  id: 1,
  LopHocPhan: 'ATTT101',
  TenLop: 'ATTT101.1',
  SoTinChi: 3,
  GiaoVien: 'Nguyễn Văn A',
  Khoa: 'ATTT',
  LL: 45,
  QuyChuan: 45.0,
  version: 0,
  ...overrides,
});

const endpoint = '/api/v1/admin/moi-giang/core-info';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe(`Integration: PUT ${endpoint}`, () => {

  // ── Authentication ──

  it('401 — no Authorization header', async () => {
    const res = await request(app)
      .put(endpoint)
      .send({ records: [validRecord()] });

    expect(res.status).toBe(401);
  });

  it('401 — invalid/expired token', async () => {
    const res = await request(app)
      .put(endpoint)
      .set('Authorization', 'Bearer INVALID_TOKEN')
      .send({ records: [validRecord()] });

    expect(res.status).toBe(401);
  });

  // ── Authorization ──

  it('403 MG_AUTH_002 — valid token but role is GV (not ADMIN)', async () => {
    const res = await request(app)
      .put(endpoint)
      .set(authHeader(GV_TOKEN))
      .send({ records: [validRecord()] });

    expect(res.status).toBe(403);
    expect(res.body.errorCode).toBe(ERROR_CODES.AUTH.FORBIDDEN);
  });

  // ── Validation (ADMIN token) ──

  it('400 MG_VAL_010 — records is not an array', async () => {
    const res = await request(app)
      .put(endpoint)
      .set(authHeader(ADMIN_TOKEN))
      .send({ records: 'invalid' });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe(ERROR_CODES.VALIDATION.INVALID_RECORDS);
  });

  it('400 MG_VAL_010 — records is empty array', async () => {
    const res = await request(app)
      .put(endpoint)
      .set(authHeader(ADMIN_TOKEN))
      .send({ records: [] });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe(ERROR_CODES.VALIDATION.INVALID_RECORDS);
  });

  it('400 MG_VAL_001 — missing id in record', async () => {
    const { id, ...withoutId } = validRecord();
    const res = await request(app)
      .put(endpoint)
      .set(authHeader(ADMIN_TOKEN))
      .send({ records: [withoutId] });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe(ERROR_CODES.VALIDATION.MISSING_ID);
  });

  it('400 MG_VAL_004 — SoTinChi = -1', async () => {
    const res = await request(app)
      .put(endpoint)
      .set(authHeader(ADMIN_TOKEN))
      .send({ records: [validRecord({ SoTinChi: -1 })] });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe(ERROR_CODES.VALIDATION.INVALID_SO_TIN_CHI);
  });

  it('400 MG_VAL_009 — missing version', async () => {
    const { version, ...withoutVersion } = validRecord();
    const res = await request(app)
      .put(endpoint)
      .set(authHeader(ADMIN_TOKEN))
      .send({ records: [withoutVersion] });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe(ERROR_CODES.VALIDATION.MISSING_VERSION);
  });

  // ── Business logic ──

  it('409 MG_DB_001 — optimistic lock conflict (wrong version)', async () => {
    // Giả định record id=1 có version=2 trong DB, ta gửi version=999
    const res = await request(app)
      .put(endpoint)
      .set(authHeader(ADMIN_TOKEN))
      .send({ records: [validRecord({ version: 999 })] });

    // Nếu record id=1 tồn tại trong DB test → 409
    // Nếu không tồn tại → 404
    expect([409, 404]).toContain(res.status);
    if (res.status === 409) {
      expect(res.body.errorCode).toBe(ERROR_CODES.DATABASE.OPTIMISTIC_LOCK_CONFLICT);
    }
  });

  // ── Happy path (yêu cầu DB test có dữ liệu) ──

  it.skip('200 — successful update with valid ADMIN token and correct version', async () => {
    // Cần DB test thực tế với record id=1, version=0
    const res = await request(app)
      .put(endpoint)
      .set(authHeader(ADMIN_TOKEN))
      .send({ records: [validRecord({ id: 1, version: 0 })] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.updated[0]).toMatchObject({ id: 1 });
    expect(res.body.updated[0].version).toBe(1); // version tăng lên
  });
});
