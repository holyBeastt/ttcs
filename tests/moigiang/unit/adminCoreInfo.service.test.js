'use strict';

/**
 * Unit Test: adminCoreInfo.service.js
 *
 * Test business logic với mock repository — không cần DB thực.
 * Framework: Jest
 */

const { updateCoreInfo, DomainError } = require('../../../src/services/moigiang/adminCoreInfo.service');
const { ERROR_CODES } = require('../../../src/constants/moigiang/errorCodes.constant');

// Mock toàn bộ repository module
jest.mock('../../../src/repositories/moigiang/adminCoreInfo.repository');

const adminCoreInfoRepository = require('../../../src/repositories/moigiang/adminCoreInfo.repository');

// ─── Fixture ─────────────────────────────────────────────────────────────────

const validRecord = () => ({
  id: 1,
  LopHocPhan: 'ATTT101',
  TenLop: 'ATTT101.1',
  SoTinChi: 3,
  GiaoVien: 'Nguyễn Văn A',
  Khoa: 'ATTT',
  LL: 45,
  QuyChuan: 45.0,
  version: 2,
});

// ─── Setup mock runInTransaction ─────────────────────────────────────────────

/**
 * runInTransaction gọi callback với một mock connection.
 * Ta cho nó thực thi callback ngay lập tức để unit test các hàm bên trong.
 */
const setupRunInTransactionMock = () => {
  adminCoreInfoRepository.runInTransaction.mockImplementation(async (callback) => {
    await callback({}); // pass mock connection object
  });
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('adminCoreInfo.service — updateCoreInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupRunInTransactionMock();
  });

  // ── Happy path ──

  it('should return updated list with incremented version on success', async () => {
    adminCoreInfoRepository.updateRecord.mockResolvedValue(1); // affectedRows = 1
    adminCoreInfoRepository.insertAuditLog.mockResolvedValue();

    const result = await updateCoreInfo([validRecord()], 'admin_user_1');

    expect(result.updated).toHaveLength(1);
    expect(result.updated[0]).toEqual({ id: 1, version: 3 }); // version+1
  });

  it('should call insertAuditLog once per record on success', async () => {
    adminCoreInfoRepository.updateRecord.mockResolvedValue(1);
    adminCoreInfoRepository.insertAuditLog.mockResolvedValue();

    const records = [validRecord(), { ...validRecord(), id: 2, version: 5 }];
    await updateCoreInfo(records, 'admin_user_1');

    expect(adminCoreInfoRepository.insertAuditLog).toHaveBeenCalledTimes(2);
  });

  // ── Optimistic lock conflict ──

  it('should throw MG_DB_001 when affectedRows = 0 and record exists', async () => {
    adminCoreInfoRepository.updateRecord.mockResolvedValue(0);   // conflict
    adminCoreInfoRepository.recordExists.mockResolvedValue(true); // record exists

    await expect(updateCoreInfo([validRecord()], 'admin_user_1'))
      .rejects
      .toMatchObject({
        errorCode: ERROR_CODES.DATABASE.OPTIMISTIC_LOCK_CONFLICT,
        recordId: 1,
      });
  });

  it('should throw MG_DB_002 when affectedRows = 0 and record does not exist', async () => {
    adminCoreInfoRepository.updateRecord.mockResolvedValue(0);
    adminCoreInfoRepository.recordExists.mockResolvedValue(false); // not found

    await expect(updateCoreInfo([validRecord()], 'admin_user_1'))
      .rejects
      .toMatchObject({
        errorCode: ERROR_CODES.DATABASE.RECORD_NOT_FOUND,
        recordId: 1,
      });
  });

  // ── Unexpected DB error ──

  it('should re-throw unexpected errors from repository', async () => {
    const dbError = new Error('Connection lost');
    adminCoreInfoRepository.updateRecord.mockRejectedValue(dbError);

    await expect(updateCoreInfo([validRecord()], 'admin_user_1'))
      .rejects
      .toThrow('Connection lost');
  });

  // ── Audit log ──

  it('should not call insertAuditLog when updateRecord fails', async () => {
    adminCoreInfoRepository.updateRecord.mockResolvedValue(0);
    adminCoreInfoRepository.recordExists.mockResolvedValue(true);

    try {
      await updateCoreInfo([validRecord()], 'admin_user_1');
    } catch {
      // expected
    }

    expect(adminCoreInfoRepository.insertAuditLog).not.toHaveBeenCalled();
  });

  it('should pass correct changedBy to insertAuditLog', async () => {
    adminCoreInfoRepository.updateRecord.mockResolvedValue(1);
    adminCoreInfoRepository.insertAuditLog.mockResolvedValue();

    await updateCoreInfo([validRecord()], 'admin_user_42');

    const callArg = adminCoreInfoRepository.insertAuditLog.mock.calls[0][0];
    expect(callArg.changedBy).toBe('admin_user_42');
  });
});
