'use strict';

/**
 * Regression Test: Đảm bảo các API CŨ không bị ảnh hưởng sau khi thêm tính năng mới.
 *
 * Framework: Jest + Supertest
 *
 * Mỗi test case gọi một endpoint hiện có và xác nhận nó vẫn phản hồi đúng.
 * Các test này KHÔNG test business logic mới, chỉ test "không phá vỡ gì cũ".
 */

const request = require('supertest');
const app = require('../../../src/server');

// Token hợp lệ để các API cũ hoạt động
const VALID_TOKEN = process.env.TEST_ADMIN_JWT || 'REPLACE_WITH_VALID_JWT';
const authHeader = { Authorization: `Bearer ${VALID_TOKEN}` };

describe('Regression: Các API cũ không bị ảnh hưởng', () => {

  // ── Kiểm tra routing không xung đột ──

  it('Route mới PUT /api/v1/admin/moi-giang/core-info không ảnh hưởng GET /api/v1/qc/thong-tin-giang-day', async () => {
    const res = await request(app)
      .post('/api/v1/qc/thong-tin-giang-day')
      .set(authHeader)
      .send({ Dot: '1', Ki: '1', Nam: '2024-2025', HeDaoTao: 'ALL' });

    // Phải trả về 200 hoặc 404 (nếu không có dữ liệu), KHÔNG phải 500
    expect([200, 404, 204]).toContain(res.status);
  });

  it('POST /check-teaching vẫn hoạt động bình thường', async () => {
    const res = await request(app)
      .post('/check-teaching')
      .set(authHeader)
      .send([]); // gửi mảng rỗng để test kết nối

    // Phải có response hợp lệ, không bị crash hay 500
    expect(res.status).not.toBe(500);
  });

  it('POST /updateDateAll vẫn hoạt động bình thường', async () => {
    const res = await request(app)
      .post('/updateDateAll')
      .set(authHeader)
      .send([]);

    expect(res.status).not.toBe(500);
  });

  // ── Kiểm tra route mới không bị nhầm lẫn với route cũ ──

  it('GET /api/v1/admin/moi-giang/core-info trả về 404 (chỉ có PUT)', async () => {
    const res = await request(app)
      .get('/api/v1/admin/moi-giang/core-info')
      .set(authHeader);

    expect(res.status).toBe(404);
  });

  it('POST /api/v1/admin/moi-giang/core-info trả về 404 (chỉ có PUT)', async () => {
    const res = await request(app)
      .post('/api/v1/admin/moi-giang/core-info')
      .set(authHeader);

    expect(res.status).toBe(404);
  });

  // ── Kiểm tra admin routes cũ không bị ảnh hưởng ──

  it('GET /api/v1/admin/he-so-lop-dong vẫn hoạt động bình thường', async () => {
    const res = await request(app)
      .get('/api/v1/admin/he-so-lop-dong')
      .set(authHeader);

    expect([200, 401, 403]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

  it('GET /api/gvm/v1/he-moi-giang vẫn hoạt động bình thường', async () => {
    const res = await request(app)
      .get('/api/gvm/v1/he-moi-giang')
      .set(authHeader);

    expect([200, 401, 403]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });
});
