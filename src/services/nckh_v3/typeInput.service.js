const createPoolConnection = require("../../config/databasePool");
const LogService = require("../logService");

const nckhChungRepo = require("../../repositories/nckh_v3/nckhChung.repo");
const nckhSoTietRepo = require("../../repositories/nckh_v3/nckhSoTiet.repo");
const nhanVienRepo = require("../../repositories/nckh_v3/nhanVien.repo");
const phongBanRepo = require("../../repositories/nckh_v3/phongBan.repo");
const responseMapper = require("../../mappers/nckh_v3/response.mapper");

const formulaService = require("./formula.service");
const validator = require("../../validators/nckh_v3/typeInput.validator");
const quyDinhService = require("./quyDinh.service");
const NCKHImportStrategyFactory = require("./import/strategy.factory");
const NCKHSaveService = require("./import/save.service");

const HOI_DONG_ROLES = new Set(["chu_tich", "phan_bien", "uy_vien"]);

const getPhanLoaiOptions = async (loaiNckh) => {
  return quyDinhService.getQuyDinhSoGioByLoai(loaiNckh);
};

const createTypeInputService = ({ loaiNckh, mode, logLabel }) => {
  const assertRecordType = (record) => {
    if (!record || String(record.loai_nckh || "") !== String(loaiNckh)) {
      throw new Error("Không tìm thấy công trình");
    }
  };

  const create = async (payload, userContext) => {
    const strategy = NCKHImportStrategyFactory.getStrategy("MANUAL");
    const records = await strategy.process(payload, { loaiNckh, mode });
    const result = await NCKHSaveService.save(records, userContext, "single");
    return { id: result.savedIds[0] };
  };

  const update = async (id, payload, userContext) => {
    const strategy = NCKHImportStrategyFactory.getStrategy("MANUAL");
    const records = await strategy.process(payload, { loaiNckh, mode });
    const record = records[0];

    let connection;
    try {
      connection = await createPoolConnection();
      await connection.beginTransaction();

      const current = await nckhChungRepo.findById(connection, Number(id));
      assertRecordType(current);

      if (Number(current.vien_nc_duyet) === 1) {
        throw new Error("Không được sửa công trình đã được viện duyệt");
      }

      await nckhChungRepo.updateById(connection, Number(id), {
        tenCongTrinh: record.chung.tenCongTrinh,
        loaiNckh,
        phanLoai: record.chung.phanLoai,
        namHoc: record.chung.namHoc,
        tongSoTiet: record.chung.tongSoTiet,
        ngayNghiemThu: record.chung.ngayNghiemThu,
        xepLoai: record.chung.xepLoai,
        maSo: record.chung.maSo,
        soQuyetDinh: record.chung.soQuyetDinh,
        capNhiemVu: record.chung.capNhiemVu,
        kinhPhi: record.chung.kinhPhi,
        tenTapChi: record.chung.tenTapChi,
        soBao: record.chung.soBao,
        soTrichDan: record.chung.soTrichDan,
        coQuanChuTri: record.chung.coQuanChuTri,
        coQuanChuQuan: record.chung.coQuanChuQuan,
        thuocNhiemVu: record.chung.thuocNhiemVu,
        linhVucNghienCuu: record.chung.linhVucNghienCuu,
        kinhPhiNamNhat: record.chung.kinhPhiNamNhat,
        kinhPhiNamHai: record.chung.kinhPhiNamHai,
        kinhPhiNamBa: record.chung.kinhPhiNamBa,
        nguonKinhPhi: record.chung.nguonKinhPhi,
        ngayQuyetDinh: record.chung.ngayQuyetDinh,
      });

      await nckhSoTietRepo.deleteByNckhId(connection, Number(id));

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
        await nckhSoTietRepo.bulkInsert(connection, Number(id), participants);
      }

      const total = formulaService.round2(await nckhSoTietRepo.sumHours(connection, Number(id)));
      const expected = formulaService.round2(Number(record.chung.tongSoTiet));

      if (total !== expected) {
        throw new Error(`Tổng số tiết phân bổ (${total}) không khớp tổng số tiết công trình (${expected})`);
      }

      await connection.commit();

      try {
        await LogService.logChange(
          userContext.userId,
          userContext.userName,
          "NCKH V3",
          `Cập nhật ${logLabel} ID ${id}`
        );
      } catch (err) {
        console.error("[NCKH V3] Log failed:", err.message);
      }

      return { id: Number(id) };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  };

  const remove = async (id, userContext) => {
    let connection;
    try {
      connection = await createPoolConnection();
      await connection.beginTransaction();

      const current = await nckhChungRepo.findById(connection, Number(id));
      assertRecordType(current);

      if (Number(current.khoa_duyet) === 1 || Number(current.vien_nc_duyet) === 1) {
        throw new Error("Không được xóa công trình đã duyệt");
      }

      await nckhSoTietRepo.deleteByNckhId(connection, Number(id));
      await nckhChungRepo.deleteById(connection, Number(id));

      await connection.commit();

      try {
        await LogService.logChange(
          userContext.userId,
          userContext.userName,
          "NCKH V3",
          `Xóa ${logLabel} ID ${id}`
        );
      } catch (err) {
        console.error("[NCKH V3] Log failed:", err.message);
      }

      return { id: Number(id) };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  };

  const list = async (namHoc, khoaId) => {
    let connection;
    try {
      connection = await createPoolConnection();
      const rows = await nckhChungRepo.listByType(connection, loaiNckh, namHoc, khoaId);
      return responseMapper.mapListResponse(rows);
    } finally {
      if (connection) connection.release();
    }
  };

  const getById = async (id) => {
    let connection;
    try {
      connection = await createPoolConnection();
      const main = await nckhChungRepo.findById(connection, Number(id));
      if (!main || String(main.loai_nckh || "") !== String(loaiNckh)) {
        return null;
      }

      const participants = await nckhSoTietRepo.getByNckhId(connection, Number(id));
      return responseMapper.mapDetailResponse(main, participants);
    } finally {
      if (connection) connection.release();
    }
  };

  const getMetadata = async (khoaId = "ALL") => {
    let connection;
    try {
      connection = await createPoolConnection();

      const [khoaList, giangVienList, phanLoaiOptions] = await Promise.all([
        phongBanRepo.listKhoa(connection),
        nhanVienRepo.listByKhoaId(connection, khoaId),
        getPhanLoaiOptions(loaiNckh),
      ]);

      return { khoaList, giangVienList, phanLoaiOptions };
    } finally {
      if (connection) connection.release();
    }
  };

  return {
    create,
    update,
    remove,
    list,
    getById,
    getMetadata,
  };
};

module.exports = {
  createTypeInputService,
};
