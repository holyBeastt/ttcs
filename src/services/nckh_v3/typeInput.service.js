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

const HOI_DONG_ROLES = new Set(["chu_tich", "phan_bien", "uy_vien"]);

const getPhanLoaiOptions = async (loaiNckh) => {
  return quyDinhService.getQuyDinhSoGioByLoai(loaiNckh);
};

const assertNhanVienExist = async (connection, participants) => {
  const ids = participants
    .filter((item) => item.nhanvienId !== null && item.nhanvienId !== undefined)
    .map((item) => Number(item.nhanvienId));

  if (ids.length === 0) return;

  const rows = await nhanVienRepo.getByIds(connection, ids);

  if (rows.length !== ids.length) {
    throw new Error("Có giảng viên không tồn tại trong danh sách tham gia");
  }
};


const createTypeInputService = ({ loaiNckh, mode, logLabel }) => {
  const assertRecordType = (record) => {
    if (!record || String(record.loai_nckh || "") !== String(loaiNckh)) {
      throw new Error("Không tìm thấy công trình");
    }
  };

  const create = async (payload, userContext) => {
    validator.validateMainPayload(payload);

    const tacGiaIds = Array.isArray(payload.tacGiaIds) ? payload.tacGiaIds : [];
    const thanhVienIds = Array.isArray(payload.thanhVienIds) ? payload.thanhVienIds : [];
    const tacGiaNgoai = Array.isArray(payload.tacGiaNgoai) ? payload.tacGiaNgoai : [];
    const thanhVienNgoai = Array.isArray(payload.thanhVienNgoai) ? payload.thanhVienNgoai : [];

    validator.validatePeopleInput(tacGiaIds, thanhVienIds, tacGiaNgoai, thanhVienNgoai);
    const soNamThucHien = Number(payload.soNamThucHien || 1);
    const vaiTroHoiDong = mode === "fixed" ? String(payload.vaiTro || "").trim() : null;

    if (mode === "fixed") {
      if (!vaiTroHoiDong) {
        throw new Error("Thiếu vai trò hội đồng");
      }
      if (!HOI_DONG_ROLES.has(vaiTroHoiDong)) {
        throw new Error("Vai trò hội đồng không hợp lệ");
      }
    }

    let connection;
    try {
      connection = await createPoolConnection();
      await connection.beginTransaction();

      const participants = formulaService.buildParticipantsByMode(
        mode,
        Number(payload.tongSoTiet),
        tacGiaIds,
        thanhVienIds,
        tacGiaNgoai,
        thanhVienNgoai,
        soNamThucHien,
        vaiTroHoiDong
      );

      await assertNhanVienExist(connection, participants);

      const nckhId = await nckhChungRepo.insert(connection, {
        tenCongTrinh: payload.tenCongTrinh,
        loaiNckh,
        phanLoai: payload.phanLoai,
        namHoc: payload.namHoc,
        tongSoTiet: Number(payload.tongSoTiet),
        khoaDuyet: 0,
        vienNcDuyet: 0,
        ngayNghiemThu: payload.ngayNghiemThu,
        xepLoai: payload.xepLoai,
        maSo: payload.maSo,
      });

      await nckhSoTietRepo.bulkInsert(connection, nckhId, participants);

      const total = formulaService.round2(await nckhSoTietRepo.sumHours(connection, nckhId));
      const expected = formulaService.round2(Number(payload.tongSoTiet));

      if (total !== expected) {
        throw new Error(`Tổng số tiết phân bổ (${total}) không khớp tổng số tiết công trình (${expected})`);
      }

      await connection.commit();

      try {
        await LogService.logChange(
          userContext.userId,
          userContext.userName,
          "NCKH V3",
          `Thêm ${logLabel}: \"${payload.tenCongTrinh}\" (ID: ${nckhId})`
        );
      } catch (err) {
        console.error("[NCKH V3] Log failed:", err.message);
      }

      return { id: nckhId };
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) connection.release();
    }
  };

  const update = async (id, payload, userContext) => {
    validator.validateMainPayload(payload);

    const tacGiaIds = Array.isArray(payload.tacGiaIds) ? payload.tacGiaIds : [];
    const thanhVienIds = Array.isArray(payload.thanhVienIds) ? payload.thanhVienIds : [];
    const tacGiaNgoai = Array.isArray(payload.tacGiaNgoai) ? payload.tacGiaNgoai : [];
    const thanhVienNgoai = Array.isArray(payload.thanhVienNgoai) ? payload.thanhVienNgoai : [];

    validator.validatePeopleInput(tacGiaIds, thanhVienIds, tacGiaNgoai, thanhVienNgoai);
    const soNamThucHien = Number(payload.soNamThucHien || 1);
    const vaiTroHoiDong = mode === "fixed" ? String(payload.vaiTro || "").trim() : null;

    if (mode === "fixed") {
      if (!vaiTroHoiDong) {
        throw new Error("Thiếu vai trò hội đồng");
      }
      if (!HOI_DONG_ROLES.has(vaiTroHoiDong)) {
        throw new Error("Vai trò hội đồng không hợp lệ");
      }
    }

    let connection;
    try {
      connection = await createPoolConnection();
      await connection.beginTransaction();

      const current = await nckhChungRepo.findById(connection, Number(id));
      assertRecordType(current);

      if (Number(current.vien_nc_duyet) === 1) {
        throw new Error("Không được sửa công trình đã được viện duyệt");
      }

      const participants = formulaService.buildParticipantsByMode(
        mode,
        Number(payload.tongSoTiet),
        tacGiaIds,
        thanhVienIds,
        tacGiaNgoai,
        thanhVienNgoai,
        soNamThucHien,
        vaiTroHoiDong
      );

      await assertNhanVienExist(connection, participants);

      await nckhChungRepo.updateById(connection, Number(id), {
        tenCongTrinh: payload.tenCongTrinh,
        loaiNckh,
        phanLoai: payload.phanLoai,
        namHoc: payload.namHoc,
        tongSoTiet: Number(payload.tongSoTiet),
        ngayNghiemThu: payload.ngayNghiemThu,
        xepLoai: payload.xepLoai,
        maSo: payload.maSo,
      });

      await nckhSoTietRepo.deleteByNckhId(connection, Number(id));
      await nckhSoTietRepo.bulkInsert(connection, Number(id), participants);


      const total = formulaService.round2(await nckhSoTietRepo.sumHours(connection, Number(id)));
      const expected = formulaService.round2(Number(payload.tongSoTiet));

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
