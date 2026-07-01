'use strict';

require('dotenv').config();
const pool = require('../../config/Pool');

// Tên bảng lấy từ biến môi trường (giống pattern các controller đã có)
const TABLE_QC = process.env.DB_TABLE_QC || 'quychuan';

/**
 * Cập nhật một record theo ID và version (Optimistic Locking).
 * Sử dụng Parameterized Query để phòng chống SQL Injection.
 *
 * @param {object} record - Record đã được validate và sanitize
 * @param {object|null} trx - Connection trong transaction (hoặc null để dùng pool)
 * @returns {Promise<number>} Số dòng bị ảnh hưởng (affectedRows)
 */
const updateRecord = async (record, trx = null) => {
  const conn = trx || pool;
  const sql = `
    UPDATE ??
    SET
      LopHocPhan = ?,
      TenLop     = ?,
      SoTinChi   = ?,
      GiaoVien   = ?,
      Khoa       = ?,
      LL         = ?,
      QuyChuan   = ?,
      version    = version + 1
    WHERE ID = ? AND version = ?
  `;
  const params = [
    TABLE_QC,
    record.LopHocPhan,
    record.TenLop,
    record.SoTinChi,
    record.GiaoVien,
    record.Khoa,
    record.LL,
    record.QuyChuan,
    record.id,
    record.version,
  ];

  const [result] = await conn.query(sql, params);
  return result.affectedRows;
};

/**
 * Kiểm tra một record có tồn tại theo ID không.
 *
 * @param {number} id
 * @param {object|null} trx
 * @returns {Promise<boolean>}
 */
const recordExists = async (id, trx = null) => {
  const conn = trx || pool;
  const [rows] = await conn.query(
    'SELECT 1 FROM ?? WHERE ID = ? LIMIT 1',
    [TABLE_QC, id]
  );
  return rows.length > 0;
};

/**
 * Ghi audit log sau mỗi lần UPDATE thành công.
 *
 * @param {object} logData
 * @param {number} logData.recordId
 * @param {string|number} logData.changedBy
 * @param {Date} logData.changedAt
 * @param {number} logData.newVersion
 * @param {object} logData.changes - JSON các trường đã thay đổi
 * @param {object|null} trx
 */
const insertAuditLog = async (logData, trx = null) => {
  const conn = trx || pool;
  const sql = `
    INSERT INTO audit_log_moi_giang_core
      (record_id, changed_by, changed_at, new_version, changes_json)
    VALUES (?, ?, ?, ?, ?)
  `;
  await conn.query(sql, [
    logData.recordId,
    String(logData.changedBy),
    logData.changedAt,
    logData.newVersion,
    JSON.stringify(logData.changes),
  ]);
};

/**
 * Thực thi callback trong một transaction.
 * Tự động commit nếu callback thành công, rollback nếu callback throw.
 *
 * @param {function(conn: object): Promise<void>} callback
 * @throws Ném lại lỗi sau khi đã rollback
 */
const runInTransaction = async (callback) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await callback(conn);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = {
  updateRecord,
  recordExists,
  insertAuditLog,
  runInTransaction,
  TABLE_QC, // export để dùng trong test
};
