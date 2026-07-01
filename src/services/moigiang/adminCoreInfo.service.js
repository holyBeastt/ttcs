'use strict';

const adminCoreInfoRepository = require('../../repositories/moigiang/adminCoreInfo.repository');
const { ERROR_CODES } = require('../../constants/moigiang/errorCodes.constant');

/**
 * Lỗi có mã lỗi cụ thể — dùng để phân biệt với Error thông thường
 */
class DomainError extends Error {
  constructor(errorCode, message, extra = {}) {
    super(message);
    this.name = 'DomainError';
    this.errorCode = errorCode;
    Object.assign(this, extra);
  }
}

/**
 * Cập nhật thông tin lõi cho danh sách bản ghi.
 * Thực hiện trong một transaction; nếu bất kỳ record nào bị xung đột version → rollback toàn bộ.
 *
 * @param {object[]} records - Danh sách records đã được validate & sanitize
 * @param {string|number} performedBy - userId của ADMIN thực hiện
 * @returns {Promise<{ updated: Array<{ id: number, version: number }> }>}
 * @throws {DomainError} nếu optimistic lock conflict hoặc record không tìm thấy
 */
const updateCoreInfo = async (records, performedBy) => {
  const updatedList = [];

  await adminCoreInfoRepository.runInTransaction(async (trx) => {
    for (const record of records) {
      // 1. Thực hiện UPDATE với điều kiện version (Optimistic Locking)
      const affectedRows = await adminCoreInfoRepository.updateRecord(record, trx);

      if (affectedRows === 0) {
        // Kiểm tra xem record có tồn tại không
        const exists = await adminCoreInfoRepository.recordExists(record.id, trx);
        if (!exists) {
          throw new DomainError(
            ERROR_CODES.DATABASE.RECORD_NOT_FOUND,
            `Không tìm thấy bản ghi với ID ${record.id}.`,
            { recordId: record.id }
          );
        }
        // Tồn tại nhưng version không khớp → Optimistic Lock Conflict
        throw new DomainError(
          ERROR_CODES.DATABASE.OPTIMISTIC_LOCK_CONFLICT,
          `Bản ghi ID ${record.id} đã bị thay đổi bởi phiên khác. Vui lòng tải lại dữ liệu và thử lại.`,
          { recordId: record.id }
        );
      }

      const newVersion = record.version + 1;

      // 2. Ghi audit log
      await adminCoreInfoRepository.insertAuditLog(
        {
          recordId: record.id,
          changedBy: performedBy,
          changedAt: new Date(),
          newVersion,
          changes: {
            LopHocPhan: record.LopHocPhan,
            TenLop: record.TenLop,
            SoTinChi: record.SoTinChi,
            GiaoVien: record.GiaoVien,
            Khoa: record.Khoa,
            LL: record.LL,
            QuyChuan: record.QuyChuan,
          },
        },
        trx
      );

      updatedList.push({ id: record.id, version: newVersion });
    }
  });

  return { updated: updatedList };
};

module.exports = { updateCoreInfo, DomainError };
