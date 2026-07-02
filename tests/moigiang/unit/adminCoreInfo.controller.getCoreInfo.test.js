'use strict';

/**
 * Unit Test: AdminCoreInfo Controller — getCoreInfo
 *
 * Mục tiêu:
 *   - Đảm bảo getCoreInfo trả về 400 khi thiếu params bắt buộc
 *   - Đảm bảo query SQL được build đúng theo filter (Khoa, HeDaoTao)
 *   - Đảm bảo trả về 200 với results khi thành công
 *   - Đảm bảo trả về 500 khi DB error
 *
 * Phương pháp: Mock pool.query để không phụ thuộc DB thực tế.
 */

jest.mock('../../../src/config/Pool', () => ({
  query: jest.fn(),
}));

const pool = require('../../../src/config/Pool');
const { getCoreInfo } = require('../../../src/controllers/moigiang/adminCoreInfo.controller');

// Helper tạo mock req/res
const mockReq = (body = {}) => ({ body });
const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.DB_TABLE_QC = 'quychuan_test';
});

// ─── 1. Validation params bắt buộc ───────────────────────────────────────────

describe('getCoreInfo — validation tham số bắt buộc', () => {
  test('Thiếu Dot → 400', async () => {
    const req = mockReq({ Ki: '1', Nam: '2024 - 2025' });
    const res = mockRes();
    await getCoreInfo(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });

  test('Thiếu Ki → 400', async () => {
    const req = mockReq({ Dot: '1', Nam: '2024 - 2025' });
    const res = mockRes();
    await getCoreInfo(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('Thiếu Nam → 400', async () => {
    const req = mockReq({ Dot: '1', Ki: '1' });
    const res = mockRes();
    await getCoreInfo(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('Thiếu tất cả → 400', async () => {
    const req = mockReq({});
    const res = mockRes();
    await getCoreInfo(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ─── 2. Query được build đúng ─────────────────────────────────────────────────

describe('getCoreInfo — query SQL được build đúng', () => {
  test('Không có Khoa, không có HeDaoTao → query cơ bản', async () => {
    pool.query.mockResolvedValue([[{ ID: 1 }]]);

    const req = mockReq({ Dot: '1', Ki: '1', Nam: '2024 - 2025' });
    const res = mockRes();
    await getCoreInfo(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('WHERE Dot = ? AND KiHoc = ? AND NamHoc = ?');
    expect(sql).not.toContain('AND Khoa');
    expect(sql).not.toContain('AND he_dao_tao');
    expect(params).toEqual(['1', '1', '2024 - 2025']);
  });

  test('Khoa = "ALL" → không thêm filter Khoa vào query', async () => {
    pool.query.mockResolvedValue([[{ ID: 1 }]]);

    const req = mockReq({ Dot: '1', Ki: '1', Nam: '2024 - 2025', Khoa: 'ALL' });
    const res = mockRes();
    await getCoreInfo(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).not.toContain('AND Khoa');
    expect(params).toHaveLength(3);
  });

  test('Khoa = "" (rỗng) → không thêm filter Khoa', async () => {
    pool.query.mockResolvedValue([[{ ID: 1 }]]);

    const req = mockReq({ Dot: '1', Ki: '1', Nam: '2024 - 2025', Khoa: '' });
    const res = mockRes();
    await getCoreInfo(req, res);

    const [sql] = pool.query.mock.calls[0];
    expect(sql).not.toContain('AND Khoa');
  });

  test('Khoa = "CNTT" → thêm AND Khoa = ? vào query', async () => {
    pool.query.mockResolvedValue([[{ ID: 1 }, { ID: 2 }]]);

    const req = mockReq({ Dot: '1', Ki: '1', Nam: '2024 - 2025', Khoa: 'CNTT' });
    const res = mockRes();
    await getCoreInfo(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('AND Khoa = ?');
    expect(params).toContain('CNTT');
  });

  test('HeDaoTao != "ALL" → thêm AND he_dao_tao = ?', async () => {
    pool.query.mockResolvedValue([[{ ID: 1 }]]);

    const req = mockReq({ Dot: '1', Ki: '1', Nam: '2024 - 2025', HeDaoTao: '2' });
    const res = mockRes();
    await getCoreInfo(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('AND he_dao_tao = ?');
    expect(params).toContain('2');
  });

  test('HeDaoTao = "ALL" → không thêm filter he_dao_tao', async () => {
    pool.query.mockResolvedValue([[{ ID: 1 }]]);

    const req = mockReq({ Dot: '1', Ki: '1', Nam: '2024 - 2025', HeDaoTao: 'ALL' });
    const res = mockRes();
    await getCoreInfo(req, res);

    const [sql] = pool.query.mock.calls[0];
    expect(sql).not.toContain('AND he_dao_tao');
  });

  test('Cả Khoa cụ thể + HeDaoTao cụ thể → có cả 2 filter', async () => {
    pool.query.mockResolvedValue([[{ ID: 1 }]]);

    const req = mockReq({ Dot: '2', Ki: '2', Nam: '2024 - 2025', Khoa: 'ATTT', HeDaoTao: '3' });
    const res = mockRes();
    await getCoreInfo(req, res);

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toContain('AND Khoa = ?');
    expect(sql).toContain('AND he_dao_tao = ?');
    expect(params).toContain('ATTT');
    expect(params).toContain('3');
  });
});

// ─── 3. Response format ───────────────────────────────────────────────────────

describe('getCoreInfo — response format', () => {
  test('Trả về 200 với success=true và results', async () => {
    const mockData = [{ ID: 1, LopHocPhan: 'CS101' }, { ID: 2, LopHocPhan: 'CS102' }];
    pool.query.mockResolvedValue([mockData]);

    const req = mockReq({ Dot: '1', Ki: '1', Nam: '2024 - 2025' });
    const res = mockRes();
    await getCoreInfo(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      results: mockData,
      total: 2,
    }));
  });

  test('DB trả về mảng rỗng → 200 với results=[]', async () => {
    pool.query.mockResolvedValue([[]]);

    const req = mockReq({ Dot: '1', Ki: '1', Nam: '2024 - 2025' });
    const res = mockRes();
    await getCoreInfo(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      results: [],
      total: 0,
    }));
  });
});

// ─── 4. Xử lý lỗi DB ─────────────────────────────────────────────────────────

describe('getCoreInfo — xử lý lỗi DB', () => {
  test('pool.query ném exception → trả về 500', async () => {
    pool.query.mockRejectedValue(new Error('DB connection lost'));

    const req = mockReq({ Dot: '1', Ki: '1', Nam: '2024 - 2025' });
    const res = mockRes();
    await getCoreInfo(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
