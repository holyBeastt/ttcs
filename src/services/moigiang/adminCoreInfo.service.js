'use strict';

const adminCoreInfoRepository = require('../../repositories/moigiang/adminCoreInfo.repository');
const tkbServices = require('../tkbServices');
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
    // Tải rules tính hệ số 1 lần ngoài vòng lặp
    const bonusRules = await tkbServices.getBonusRules();

    for (const record of records) {
      // 1. Auto-calculate QuyChuan nếu có field ảnh hưởng thay đổi
      if (record.updatedField === 'SoSinhVien') {
        record.HeSoLopDong = tkbServices.calculateStudentBonus(record.SoSinhVien, bonusRules);
        record.QuyChuan = record.LL * record.HeSoT7CN * record.HeSoLopDong;
      } else if (['LL', 'HeSoT7CN', 'HeSoLopDong'].includes(record.updatedField)) {
        record.QuyChuan = record.LL * record.HeSoT7CN * record.HeSoLopDong;
      }

      // Làm tròn QuyChuan 2 chữ số thập phân nếu cần
      record.QuyChuan = Math.round(record.QuyChuan * 100) / 100;

      // 2. Thực hiện UPDATE với điều kiện version (Optimistic Locking)
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

      // 3. Ghi audit log
      await adminCoreInfoRepository.insertAuditLog(
        {
          recordId: record.id,
          changedBy: performedBy,
          changedAt: new Date(),
          newVersion,
          changes: {
            updatedField: record.updatedField,
            LopHocPhan: record.LopHocPhan,
            TenLop: record.TenLop,
            SoTinChi: record.SoTinChi,
            GiaoVien: record.GiaoVien,
            Khoa: record.Khoa,
            LL: record.LL,
            SoSinhVien: record.SoSinhVien,
            HeSoLopDong: record.HeSoLopDong,
            HeSoT7CN: record.HeSoT7CN,
            QuyChuan: record.QuyChuan,
          },
        },
        trx
      );

      updatedList.push({ id: record.id, version: newVersion, QuyChuan: record.QuyChuan, HeSoLopDong: record.HeSoLopDong });
    }
  });

  return { updated: updatedList };
};

/**
 * Xóa một record theo ID.
 *
 * @param {number} id
 * @returns {Promise<boolean>}
 */
const deleteCoreInfo = async (id) => {
  const affectedRows = await adminCoreInfoRepository.deleteRecord(id);
  return affectedRows > 0;
};

module.exports = { updateCoreInfo, deleteCoreInfo, DomainError };
