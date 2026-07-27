const createPoolConnection = require("../../../config/databasePool");
const nhanVienRepo = require("../../../repositories/nckh_v3/nhanVien.repo");
const formulaService = require("../formula.service");
const NCKHImportStrategy = require("./strategy.interface");
const validator = require("../../../validators/nckh_v3/typeInput.validator");

const HOI_DONG_ROLES = new Set(["chu_tich", "phan_bien", "uy_vien"]);

class ManualInputStrategy extends NCKHImportStrategy {
  async assertNhanVienExist(connection, participants) {
    const ids = participants
      .filter((item) => item.nhanvienId !== null && item.nhanvienId !== undefined)
      .map((item) => Number(item.nhanvienId));

    if (ids.length === 0) return;

    const rows = await nhanVienRepo.getByIds(connection, ids);
    if (rows.length !== ids.length) {
      throw new Error("Có giảng viên không tồn tại trong danh sách tham gia");
    }
  }

  async process(payload, options = {}) {
    const { loaiNckh, mode } = options;

    validator.validateMainPayload(payload);

    const tacGiaIds = Array.isArray(payload.tacGiaIds) ? payload.tacGiaIds : [];
    const thanhVienIds = Array.isArray(payload.thanhVienIds) ? payload.thanhVienIds : [];
    const tacGiaLienHeIds = Array.isArray(payload.tacGiaLienHeIds) ? payload.tacGiaLienHeIds : [];

    const tacGiaNgoai = Array.isArray(payload.tacGiaNgoai) ? payload.tacGiaNgoai : [];
    const thanhVienNgoai = Array.isArray(payload.thanhVienNgoai) ? payload.thanhVienNgoai : [];
    const tacGiaLienHeNgoai = Array.isArray(payload.tacGiaLienHeNgoai) ? payload.tacGiaLienHeNgoai : [];

    validator.validatePeopleInput(
      tacGiaIds,
      thanhVienIds,
      tacGiaNgoai,
      thanhVienNgoai,
      tacGiaLienHeIds,
      tacGiaLienHeNgoai
    );

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

    const calculatedParticipants = formulaService.buildParticipantsByMode(
      mode,
      Number(payload.tongSoTiet),
      tacGiaIds,
      thanhVienIds,
      tacGiaNgoai,
      thanhVienNgoai,
      soNamThucHien,
      vaiTroHoiDong,
      tacGiaLienHeIds,
      tacGiaLienHeNgoai
    );

    // Verify employee IDs exist in database
    let connection;
    try {
      connection = await createPoolConnection();
      await this.assertNhanVienExist(connection, calculatedParticipants);
    } finally {
      if (connection) connection.release();
    }

    const errors = [];
    const warnings = [];

    const unifiedRecord = {
      chung: {
        tenCongTrinh: payload.tenCongTrinh,
        loaiNckh: loaiNckh,
        phanLoai: payload.phanLoai,
        namHoc: payload.namHoc,
        tongSoTiet: Number(payload.tongSoTiet),
        ngayNghiemThu: payload.ngayNghiemThu || null,
        xepLoai: payload.xepLoai || null,
        maSo: payload.maSo || null,
        // Extended attributes supported by DB schema
        soQuyetDinh: payload.soQuyetDinh || null,
        capNhiemVu: payload.capNhiemVu || null,
        kinhPhi: payload.kinhPhi || null,
        tenTapChi: payload.tenTapChi || null,
        soBao: payload.soBao || null,
        soTrichDan: payload.soTrichDan ?? null,
        coQuanChuTri: payload.coQuanChuTri || null,
        coQuanChuQuan: payload.coQuanChuQuan || null,
        thuocNhiemVu: payload.thuocNhiemVu || null,
        linhVucNghienCuu: payload.linhVucNghienCuu || null,
        kinhPhiNamNhat: payload.kinhPhiNamNhat || null,
        kinhPhiNamHai: payload.kinhPhiNamHai || null,
        kinhPhiNamBa: payload.kinhPhiNamBa || null,
        nguonKinhPhi: payload.nguonKinhPhi || null,
        ngayQuyetDinh: payload.ngayQuyetDinh || null,
      },
      participants: calculatedParticipants,
      mode: mode,
      namThucHien: soNamThucHien,
      status: "ok",
      errors,
      warnings,
    };

    return [unifiedRecord];
  }
}

module.exports = ManualInputStrategy;
