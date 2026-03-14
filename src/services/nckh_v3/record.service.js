const createPoolConnection = require("../../config/databasePool");

const { NCKH_TYPE_OPTIONS } = require("../../config/nckh_v3/types");
const { validateApprovalValue } = require("../../validators/nckh_v3/approval.validator");

const nckhChungRepo = require("../../repositories/nckh_v3/nckhChung.repo");
const nckhSoTietRepo = require("../../repositories/nckh_v3/nckhSoTiet.repo");
const phongBanRepo = require("../../repositories/nckh_v3/phongBan.repo");

const typeMetaByLoai = new Map(
  (NCKH_TYPE_OPTIONS || []).map((item) => [String(item.loaiNckh || ""), item])
);

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
    tongSoTiet: Number(row.tong_so_tiet || 0),
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
    return rows.map(toSummaryRecord);
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
      tongSoTiet: Number(main.tong_so_tiet || 0),
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
        soTiet: Number(item.so_tiet || 0),
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

    if (vienNcDuyet === 1 && Number(current.khoa_duyet) !== 1) {
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

module.exports = {
  list,
  detail,
  updateKhoaApproval,
  updateVienApproval,
  getFilters,
};
