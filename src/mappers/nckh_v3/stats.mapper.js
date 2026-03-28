const { NCKH_TYPE_OPTIONS } = require("../../config/nckh_v3/types");

const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const typeMetaByLoai = new Map(
  (NCKH_TYPE_OPTIONS || []).map((item) => [String(item.loaiNckh || ""), item])
);

const mapTypeMeta = (loaiNckh) => {
  const normalized = String(loaiNckh || "").trim().toUpperCase();
  const meta = typeMetaByLoai.get(normalized) || null;
  return {
    loaiNckh: normalized,
    typeSlug: meta ? meta.value : null,
    loaiNckhLabel: meta ? meta.label : (normalized || "N/A"),
  };
};
const mapRoleLabel = (role) => {
  const r = String(role || "").toLowerCase();
  if (r === "tac_gia") return "Tác giả";
  if (r === "thanh_vien") return "Thành viên";
  return role || "";
};

const mapLecturerSummaryRow = (row) => ({
  lecturerId: Number(row.lecturer_id),
  tenNhanVien: row.TenNhanVien || "",
  maPhongBan: row.MaPhongBan || null,
  lecturerKhoaId:
    row.lecturer_khoa_id !== null && row.lecturer_khoa_id !== undefined
      ? Number(row.lecturer_khoa_id)
      : null,
  lecturerKhoaName: row.lecturer_khoa_name || null,
  soCongTrinh: Number(row.cong_trinh_count || 0),
  tongSoTietGiangVien: round2(Number(row.tong_so_tiet_giang_vien || 0)),
});

const mapCommonRecordRow = (row) => ({
  id: Number(row.id),
  ...mapTypeMeta(row.loai_nckh),
  phanLoai: row.phan_loai || "",
  tenCongTrinh: row.ten_cong_trinh || "",
  namHoc: row.nam_hoc || "",
  tongSoTietCongTrinh: round2(Number(row.tong_so_tiet || 0)),
  khoaId: row.khoa_id !== null && row.khoa_id !== undefined ? Number(row.khoa_id) : null,
  maPhongBan: row.MaPhongBan || null,
  tenPhongBan: row.TenPhongBan || null,
  ngayNghiemThu: row.ngay_nghiem_thu || null,
  xepLoai: row.xep_loai || null,
  maSo: row.ma_so || null,
  tacGiaChinh: row.tac_gia_chinh || "",
  thanhVien: row.thanh_vien || "",
});

const mapLecturerRecordRow = (row) => ({
  ...mapCommonRecordRow(row),
  vaiTroGiangVien: mapRoleLabel(row.vai_tro_giang_vien),
  soTietGiangVien: round2(Number(row.so_tiet_giang_vien || 0)),
});

const mapFacultySummaryRow = (row) => ({
  khoaId: row.khoa_id !== null && row.khoa_id !== undefined ? Number(row.khoa_id) : null,
  maPhongBan: row.MaPhongBan || null,
  tenPhongBan: row.TenPhongBan || "Cấp Học viện",
  soCongTrinh: Number(row.cong_trinh_count || 0),
  tongSoTiet: round2(Number(row.tong_so_tiet || 0)),
});

const mapInstituteOverview = (overviewRow, lecturerRow) => ({
  tongCongTrinh: Number(overviewRow?.tong_cong_trinh || 0),
  tongSoTiet: round2(Number(overviewRow?.tong_so_tiet || 0)),
  tongGiangVienNoiBo: Number(lecturerRow?.tong_giang_vien_noi_bo || 0),
});

const mapInstituteTypeRow = (row) => ({
  ...mapTypeMeta(row.loai_nckh),
  soCongTrinh: Number(row.cong_trinh_count || 0),
  tongSoTiet: round2(Number(row.tong_so_tiet || 0)),
});

module.exports = {
  mapLecturerSummaryRow,
  mapCommonRecordRow,
  mapLecturerRecordRow,
  mapFacultySummaryRow,
  mapInstituteOverview,
  mapInstituteTypeRow,
};