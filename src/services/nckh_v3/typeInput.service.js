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
    if (payload.maSo) {
      let connection;
      try {
        connection = await createPoolConnection();
        const isDuplicate = await nckhChungRepo.checkDuplicateMaSo(connection, payload.maSo, loaiNckh, payload.namHoc);
        if (isDuplicate) {
          throw new Error(`Mã số "${payload.maSo}" đã tồn tại trong năm học này.`);
        }
      } finally {
        if (connection) connection.release();
      }
    }

    const strategy = NCKHImportStrategyFactory.getStrategy("MANUAL");
    const records = await strategy.process(payload, { loaiNckh, mode });
    const result = await NCKHSaveService.save(records, userContext, "single");
    return { id: result.savedIds[0] };
  };

  const update = async (id, payload, userContext) => {
    let connection;
    try {
      connection = await createPoolConnection();
      await connection.beginTransaction();

      const current = await nckhChungRepo.findById(connection, Number(id));
      assertRecordType(current);

      if (Number(current.vien_nc_duyet) === 1) {
        throw new Error("Không được sửa công trình đã được viện duyệt");
      }

      const currentParticipants = await nckhSoTietRepo.getByNckhId(connection, Number(id));
      const currentDuration = Math.max(
        1,
        ...currentParticipants.map((item) => Number(item.nam_thuc_hien || 1))
      );
      const incomingPayload = payload || {};
      const hasField = (field) => Object.prototype.hasOwnProperty.call(incomingPayload, field);
      const valueOrCurrent = (field, currentValue) =>
        hasField(field) ? incomingPayload[field] : currentValue;
      const effectivePayload = {
        ...incomingPayload,
        tenCongTrinh: valueOrCurrent("tenCongTrinh", current.ten_cong_trinh),
        loaiNckh,
        phanLoai: valueOrCurrent("phanLoai", current.phan_loai),
        namHoc: valueOrCurrent("namHoc", current.nam_hoc),
        tongSoTiet: valueOrCurrent("tongSoTiet", current.tong_so_tiet),
        ngayNghiemThu: valueOrCurrent("ngayNghiemThu", current.ngay_nghiem_thu),
        xepLoai: valueOrCurrent("xepLoai", current.xep_loai),
        maSo: valueOrCurrent("maSo", current.ma_so),
        soQuyetDinh: valueOrCurrent("soQuyetDinh", current.so_quyet_dinh),
        capNhiemVu: valueOrCurrent("capNhiemVu", current.cap_nhiem_vu),
        kinhPhi: valueOrCurrent("kinhPhi", current.kinh_phi),
        tenTapChi: valueOrCurrent("tenTapChi", current.ten_tap_chi),
        soBao: valueOrCurrent("soBao", current.so_bao),
        soTrichDan: valueOrCurrent("soTrichDan", current.so_trich_dan),
        issnIsbn: valueOrCurrent("issnIsbn", current.issn_isbn),
        doi: valueOrCurrent("doi", current.doi),
        linkMinhChung: valueOrCurrent("linkMinhChung", current.link_minh_chung),
        volumn: valueOrCurrent("volumn", current.volumn),
        number: valueOrCurrent("number", current.number),
        page: valueOrCurrent("page", current.page),
        coQuanChuTri: valueOrCurrent("coQuanChuTri", current.co_quan_chu_tri),
        coQuanChuQuan: valueOrCurrent("coQuanChuQuan", current.co_quan_chu_quan),
        thuocNhiemVu: valueOrCurrent("thuocNhiemVu", current.thuoc_nhiem_vu),
        linhVucNghienCuu: valueOrCurrent("linhVucNghienCuu", current.linh_vuc_nghien_cuu),
        kinhPhiNamNhat: valueOrCurrent("kinhPhiNamNhat", current.kinh_phi_nam_nhat),
        kinhPhiNamHai: valueOrCurrent("kinhPhiNamHai", current.kinh_phi_nam_hai),
        kinhPhiNamBa: valueOrCurrent("kinhPhiNamBa", current.kinh_phi_nam_ba),
        nguonKinhPhi: valueOrCurrent("nguonKinhPhi", current.nguon_kinh_phi),
        ngayQuyetDinh: valueOrCurrent("ngayQuyetDinh", current.ngay_quyet_dinh),
        soNamThucHien: valueOrCurrent("soNamThucHien", currentDuration),
      };

      const strategy = NCKHImportStrategyFactory.getStrategy("MANUAL");
      const records = await strategy.process(effectivePayload, { loaiNckh, mode });
      const record = records[0];

      if (record.chung.maSo) {
        const isDuplicate = await nckhChungRepo.checkDuplicateMaSo(
          connection,
          record.chung.maSo,
          loaiNckh,
          record.chung.namHoc,
          id
        );
        if (isDuplicate) {
          throw new Error(`Mã số "${record.chung.maSo}" đã tồn tại trong năm học này.`);
        }
      }

      const updateData = {
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
        issnIsbn: record.chung.issnIsbn,
        doi: record.chung.doi,
        linkMinhChung: record.chung.linkMinhChung,
        volumn: record.chung.volumn,
        number: record.chung.number,
        page: record.chung.page,
        coQuanChuTri: record.chung.coQuanChuTri,
        coQuanChuQuan: record.chung.coQuanChuQuan,
        thuocNhiemVu: record.chung.thuocNhiemVu,
        linhVucNghienCuu: record.chung.linhVucNghienCuu,
        kinhPhiNamNhat: record.chung.kinhPhiNamNhat,
        kinhPhiNamHai: record.chung.kinhPhiNamHai,
        kinhPhiNamBa: record.chung.kinhPhiNamBa,
        nguonKinhPhi: record.chung.nguonKinhPhi,
        ngayQuyetDinh: record.chung.ngayQuyetDinh,
      };

      await nckhChungRepo.updateById(connection, Number(id), updateData);

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
