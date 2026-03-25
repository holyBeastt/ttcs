const createPoolConnection = require("../../config/databasePool");

const { NCKH_TYPE_OPTIONS } = require("../../config/nckh_v3/types");
const { validateApprovalValue } = require("../../validators/nckh_v3/approval.validator");

const nckhChungRepo = require("../../repositories/nckh_v3/nckhChung.repo");
const nckhSoTietRepo = require("../../repositories/nckh_v3/nckhSoTiet.repo");
const phongBanRepo = require("../../repositories/nckh_v3/phongBan.repo");

const typeMetaByLoai = new Map(
  (NCKH_TYPE_OPTIONS || []).map((item) => [String(item.loaiNckh || ""), item])
);

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const toParticipantDisplay = (participant) => {
  const isExternal = participant.nhanvien_id === null || participant.nhanvien_id === undefined;
  const soTiet = round2(Number(participant.so_tiet || 0)).toFixed(2);

  if (isExternal) {
    const ten = String(participant.ten_ngoai || "").trim() || "Không rõ tên";
    const donViNgoai = String(participant.don_vi_ngoai || "").trim() || "Chưa có";
    return {
      key: `ngoai:${ten.toLowerCase()}|${donViNgoai.toLowerCase()}|${participant.vai_tro || ""}`,
      nameOnly: ten,
      display: `${ten} - ${donViNgoai} (${soTiet} tiết)`,
      sortId: Number(participant.id || 0),
      hours: Number(participant.so_tiet || 0),
    };
  }

  const tenNhanVien = String(participant.TenNhanVien || "").trim() || "Không rõ tên";
  const khoa = String(participant.MaPhongBan || "").trim() || "Chưa có";
  const nhanVienId = Number(participant.nhanvien_id || 0);

  return {
    key: `noi:${nhanVienId}|${participant.vai_tro || ""}`,
    nameOnly: tenNhanVien,
    display: `${tenNhanVien} - ${khoa} (${soTiet} tiết)`,
    sortId: Number(participant.id || 0),
    hours: Number(participant.so_tiet || 0),
  };
};

const mergeParticipantsByRole = (participantRows, role) => {
  const map = new Map();

  for (const row of participantRows) {
    if (String(row.vai_tro || "") !== role) continue;

    const normalized = toParticipantDisplay(row);
    if (!map.has(normalized.key)) {
      map.set(normalized.key, normalized);
      continue;
    }

    const current = map.get(normalized.key);
    const nextHours = round2(Number(current.hours || 0) + Number(normalized.hours || 0));
    const displayBase = current.display.replace(/ \([0-9]+(?:\.[0-9]+)? tiết\)$/u, "");

    map.set(normalized.key, {
      ...current,
      hours: nextHours,
      sortId: Math.min(Number(current.sortId || 0), Number(normalized.sortId || 0)),
      display: `${displayBase} (${nextHours.toFixed(2)} tiết)`,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.sortId - b.sortId);
};

const toSummaryRecord = (row) => {
  const meta = typeMetaByLoai.get(String(row.loai_nckh || "")) || null;
  const rawId = row.id ?? row.ID;

  return {
    id: Number(rawId),
    loaiNckh: row.loai_nckh,
    typeSlug: meta ? meta.value : null,
    loaiNckhLabel: meta ? meta.label : row.loai_nckh,
    phanLoai: row.phan_loai || "",
    tenCongTrinh: row.ten_cong_trinh || "",
    tacGiaChinh: row.tac_gia_chinh || "",
    thanhVien: row.thanh_vien || "",
    namHoc: row.nam_hoc,
    tongSoTiet: round2(Number(row.tong_so_tiet || 0)),
    khoaId: row.khoa_id !== null && row.khoa_id !== undefined ? Number(row.khoa_id) : null,
    maPhongBan: row.MaPhongBan || null,
    tenPhongBan: row.TenPhongBan || null,
    khoaDuyet: Number(row.khoa_duyet || 0),
    vienNcDuyet: Number(row.vien_nc_duyet || 0),
    createdAt: row.created_at || null,
  };
};

const list = async (namHoc, khoaId) => {
  if (!namHoc) {
    throw new Error("Thiếu năm học");
  }

  const safeKhoaId = String(khoaId || "ALL").trim() || "ALL";

  let connection;
  try {
    connection = await createPoolConnection();
    const rows = await nckhChungRepo.listUnified(connection, String(namHoc).trim(), safeKhoaId);
    const records = rows.map(toSummaryRecord);

    if (!records.length) {
      return records;
    }

    const participants = await nckhSoTietRepo.getByNckhIds(connection, records.map((item) => item.id));
    const participantsByRecordId = new Map();

    for (const participant of participants) {
      const recordId = Number(participant.nckh_id || 0);
      if (!participantsByRecordId.has(recordId)) {
        participantsByRecordId.set(recordId, []);
      }
      participantsByRecordId.get(recordId).push(participant);
    }

    return records.map((record) => {
      const recordParticipants = participantsByRecordId.get(record.id) || [];
      const tacGia = mergeParticipantsByRole(recordParticipants, "tac_gia");
      const thanhVien = mergeParticipantsByRole(recordParticipants, "thanh_vien");

      return {
        ...record,
        tacGiaChinh: tacGia.map((item) => item.nameOnly).join(", "),
        thanhVien: thanhVien.map((item) => item.nameOnly).join(", "),
        tacGiaChinhDisplay: tacGia.map((item) => item.display).join("\n"),
        thanhVienDisplay: thanhVien.map((item) => item.display).join("\n"),
      };
    });
  } finally {
    if (connection) connection.release();
  }
};

const detail = async (id) => {
  let connection;
  try {
    connection = await createPoolConnection();

    const main = await nckhChungRepo.findById(connection, Number(id));
    if (!main) return null;

    const participants = await nckhSoTietRepo.getByNckhId(connection, Number(id));
    const meta = typeMetaByLoai.get(String(main.loai_nckh || "")) || null;

    const rawId = main.id ?? main.ID;

    return {
      id: Number(rawId),
      loaiNckh: main.loai_nckh,
      typeSlug: meta ? meta.value : null,
      loaiNckhLabel: meta ? meta.label : main.loai_nckh,
      phanLoai: main.phan_loai || "",
      tenCongTrinh: main.ten_cong_trinh || "",
      namHoc: main.nam_hoc,
      tongSoTiet: round2(Number(main.tong_so_tiet || 0)),
      khoaId: main.khoa_id !== null && main.khoa_id !== undefined ? Number(main.khoa_id) : null,
      maPhongBan: main.MaPhongBan || null,
      tenPhongBan: main.TenPhongBan || null,
      khoaDuyet: Number(main.khoa_duyet || 0),
      vienNcDuyet: Number(main.vien_nc_duyet || 0),
      participants: participants.map((item) => ({
        id: item.id,
        vaiTro: item.vai_tro,
        tenNhanVien: item.TenNhanVien || item.ten_ngoai || "",
        tenNgoai: item.ten_ngoai || null,
        donViNgoai: item.don_vi_ngoai || null,
        soTiet: round2(Number(item.so_tiet || 0)),
      })),
    };
  } finally {
    if (connection) connection.release();
  }
};

const updateKhoaApproval = async (id, value) => {
  const khoaDuyet = validateApprovalValue(value, "khoaDuyet");

  let connection;
  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    const current = await nckhChungRepo.findById(connection, Number(id));
    if (!current) throw new Error("Không tìm thấy công trình");

    if (khoaDuyet === 0 && Number(current.vien_nc_duyet) === 1) {
      throw new Error("Không thể bỏ duyệt khoa khi viện đã duyệt");
    }

    if (khoaDuyet === 0) {
      await nckhChungRepo.setKhoaApproval(connection, Number(id), 0, 0);
    } else {
      await nckhChungRepo.setKhoaApproval(connection, Number(id), 1);
    }

    await connection.commit();
    return { id: Number(id), khoaDuyet };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

const updateVienApproval = async (id, value) => {
  const vienNcDuyet = validateApprovalValue(value, "vienNcDuyet");

  let connection;
  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    const current = await nckhChungRepo.findById(connection, Number(id));
    if (!current) throw new Error("Không tìm thấy công trình");

    if (vienNcDuyet === 1 && current.khoa_id !== null && Number(current.khoa_duyet) !== 1) {
      throw new Error("Không thể duyệt viện khi khoa chưa duyệt");
    }

    if (vienNcDuyet === 0) {
      await nckhChungRepo.setVienApproval(connection, Number(id), 0, 0);
    } else {
      await nckhChungRepo.setVienApproval(connection, Number(id), 1);
    }

    await connection.commit();
    return { id: Number(id), vienNcDuyet };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

const getFilters = async () => {
  let connection;
  try {
    connection = await createPoolConnection();
    const khoaList = await phongBanRepo.listKhoa(connection);
    return { khoaList };
  } finally {
    if (connection) connection.release();
  }
};

const updateBulkApprovals = async (updates) => {
  if (!Array.isArray(updates) || updates.length === 0) {
    throw new Error("Danh sách cập nhật không hợp lệ");
  }

  let connection;
  try {
    connection = await createPoolConnection();
    await connection.beginTransaction();

    // Validate each update and check constraints
    for (const update of updates) {
      const { id, khoaDuyet, vienNcDuyet } = update;

      if (!id) {
        throw new Error("ID công trình không hợp lệ");
      }

      const current = await nckhChungRepo.findById(connection, Number(id));
      if (!current) {
        throw new Error(`Không tìm thấy công trình với ID ${id}`);
      }

      // Validate khoa approval constraints
      if (khoaDuyet === 0 && Number(current.vien_nc_duyet) === 1) {
        throw new Error(`Không thể bỏ duyệt khoa của công trình "${current.ten_cong_trinh}" khi viện đã duyệt`);
      }

      // Validate vien approval constraints
      if (vienNcDuyet === 1 && Number(current.khoa_duyet) !== 1) {
        throw new Error(`Không thể duyệt viện của công trình "${current.ten_cong_trinh}" khi khoa chưa duyệt`);
      }
    }

    // All validations passed, proceed with updates
    await nckhChungRepo.bulkUpdateApprovals(connection, updates);
    await connection.commit();

    return {
      success: true,
      message: `Cập nhật thành công ${updates.length} công trình`,
      count: updates.length,
    };
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  list,
  detail,
  updateKhoaApproval,
  updateVienApproval,
  updateBulkApprovals,
  getFilters,
};
