const createPoolConnection = require("../../../config/databasePool");
const LogService = require("../../logService");
const importRepo = require("../../../repositories/nckh_v3/nckhImport.repo");
const nckhSoTietRepo = require("../../../repositories/nckh_v3/nckhSoTiet.repo");
const formulaService = require("../formula.service");

/**
 * Unified NCKH Save Service
 */
class NCKHSaveService {
  /**
   * Save a single NCKH Unified Record to the database using an active transaction connection.
   */
  static async saveSingleRecord(connection, record) {
    const chung = record.chung;

    const nckhId = await importRepo.insertChungExtended(connection, {
      tenCongTrinh: chung.tenCongTrinh,
      loaiNckh: chung.loaiNckh,
      phanLoai: chung.phanLoai || null,
      namHoc: chung.namHoc,
      tongSoTiet: chung.tongSoTiet || 0,
      khoaDuyet: 0,
      vienNcDuyet: 0,
      ngayNghiemThu: chung.ngayNghiemThu || null,
      xepLoai: chung.xepLoai || null,
      maSo: chung.maSo || null,
      soQuyetDinh: chung.soQuyetDinh || null,
      capNhiemVu: chung.capNhiemVu || null,
      kinhPhi: chung.kinhPhi || null,
      tenTapChi: chung.tenTapChi || null,
      soBao: chung.soBao || null,
      soTrichDan: chung.soTrichDan ?? null,
      coQuanChuTri: chung.coQuanChuTri || null,
      coQuanChuQuan: chung.coQuanChuQuan || null,
      thuocNhiemVu: chung.thuocNhiemVu || null,
      linhVucNghienCuu: chung.linhVucNghienCuu || null,
      kinhPhiNamNhat: chung.kinhPhiNamNhat || null,
      kinhPhiNamHai: chung.kinhPhiNamHai || null,
      kinhPhiNamBa: chung.kinhPhiNamBa || null,
      nguonKinhPhi: chung.nguonKinhPhi || null,
      ngayQuyetDinh: chung.ngayQuyetDinh || null,
    });

    const participants = (record.participants || [])
      .filter((p) => p.nhanvienId || p.tenNgoai)
      .map((p) => ({
        nhanvienId: p.nhanvienId || null,
        tenNgoai: p.tenNgoai || null,
        donViNgoai: p.donViNgoai || null,
        vaiTro: p.vaiTro || "thanh_vien",
        soTiet: p.soTiet || 0,
        namThucHien: p.namThucHien || 1,
      }));

    if (participants.length > 0) {
      await nckhSoTietRepo.bulkInsert(connection, nckhId, participants);
    }

    // Post-calculation integrity check
    const total = formulaService.round2(await nckhSoTietRepo.sumHours(connection, nckhId));
    const expected = formulaService.round2(Number(chung.tongSoTiet));

    if (total !== expected) {
      throw new Error(`Tổng số tiết phân bổ (${total}) không khớp tổng số tiết công trình (${expected})`);
    }

    return nckhId;
  }

  /**
   * Save multiple records.
   * @param {Array<Object>} records - Unified records
   * @param {Object} userContext - Log context
   * @param {string} transactionMode - 'single' (all-or-nothing) or 'per-record' (for batch Excel)
   */
  static async save(records, userContext, transactionMode = "per-record") {
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error("Không có dữ liệu để lưu.");
    }

    let savedCount = 0;
    const failedRecords = [];
    const savedIds = [];

    if (transactionMode === "single") {
      let connection;
      try {
        connection = await createPoolConnection();
        await connection.beginTransaction();

        for (const record of records) {
          if (record.status === "error") {
            throw new Error(record.errors.join("; "));
          }
          const nckhId = await NCKHSaveService.saveSingleRecord(connection, record);
          savedIds.push(nckhId);
          savedCount += 1;
        }

        await connection.commit();
      } catch (err) {
        if (connection) {
          try { await connection.rollback(); } catch (_) {}
        }
        throw err;
      } finally {
        if (connection) connection.release();
      }

      // Log success
      try {
        const firstRec = records[0];
        await LogService.logChange(
          userContext.userId,
          userContext.userName,
          "NCKH V3",
          `Thêm công trình NCKH: "${firstRec.chung.tenCongTrinh}" (ID: ${savedIds[0]})`
        );
      } catch (logErr) {
        console.error("[NCKH V3 Save] Log failed:", logErr.message);
      }

      return { savedCount, failedCount: 0, failedRecords, savedIds };
    } else {
      // per-record mode (batch import from excel)
      for (const record of records) {
        if (record.status === "error") continue;

        let connection;
        try {
          connection = await createPoolConnection();
          await connection.beginTransaction();

          const nckhId = await NCKHSaveService.saveSingleRecord(connection, record);
          savedIds.push(nckhId);
          await connection.commit();
          savedCount += 1;
        } catch (err) {
          if (connection) {
            try { await connection.rollback(); } catch (_) {}
          }
          const errorInfo = {
            tenCongTrinh: record.chung?.tenCongTrinh || "(không rõ)",
            loaiNckh: record.chung?.loaiNckh || null,
            error: err.message || String(err),
          };
          failedRecords.push(errorInfo);
          console.error("[NCKH V3 Save] Failed record:", errorInfo);
        } finally {
          if (connection) connection.release();
        }
      }

      // Log summary
      try {
        await LogService.logChange(
          userContext.userId,
          userContext.userName,
          "NCKH V3",
          `Import ${savedCount}/${records.length} công trình NCKH từ file Excel (${failedRecords.length} lỗi)`
        );
      } catch (logErr) {
        console.error("[NCKH V3 Save] Log failed:", logErr.message);
      }

      return { savedCount, failedCount: failedRecords.length, failedRecords, savedIds };
    }
  }
}

module.exports = NCKHSaveService;
