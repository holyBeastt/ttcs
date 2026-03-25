const round2 = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const mapDetailResponse = (mainRow, participantRows) => ({
  id: mainRow.id,
  tenCongTrinh: mainRow.ten_cong_trinh,
  loaiNckh: mainRow.loai_nckh,
  phanLoai: mainRow.phan_loai,
  namHoc: mainRow.nam_hoc,
  tongSoTiet: round2(Number(mainRow.tong_so_tiet || 0)),
  khoaId: mainRow.khoa_id,
  maPhongBan: mainRow.MaPhongBan || null,
  tenPhongBan: mainRow.TenPhongBan || null,
  khoaDuyet: Number(mainRow.khoa_duyet || 0),
  vienNcDuyet: Number(mainRow.vien_nc_duyet || 0),
  ngayNghiemThu: mainRow.ngay_nghiem_thu,
  xepLoai: mainRow.xep_loai,
  maSo: mainRow.ma_so,
  createdAt: mainRow.created_at,
  participants: participantRows.map((row) => ({
    id: row.id,
    nhanvienId: row.nhanvien_id,
    tenNhanVien: row.TenNhanVien || row.ten_ngoai,
    tenNgoai: row.ten_ngoai || null,
    donViNgoai: row.don_vi_ngoai || null,
    maPhongBan: row.MaPhongBan,
    vaiTro: row.vai_tro,
    soTiet: round2(Number(row.so_tiet || 0)),
    namThucHien: Number(row.nam_thuc_hien || 1),
  })),
});

const mapListResponse = (rows) => rows.map((row) => ({
  id: row.id,
  tenCongTrinh: row.ten_cong_trinh,
  loaiNckh: row.loai_nckh,
  phanLoai: row.phan_loai,
  namHoc: row.nam_hoc,
  tongSoTiet: round2(Number(row.tong_so_tiet || 0)),
  khoaId: row.khoa_id,
  maPhongBan: row.MaPhongBan || null,
  tenPhongBan: row.TenPhongBan || null,
  khoaDuyet: Number(row.khoa_duyet || 0),
  vienNcDuyet: Number(row.vien_nc_duyet || 0),
  ngayNghiemThu: row.ngay_nghiem_thu,
  xepLoai: row.xep_loai,
  maSo: row.ma_so,
  createdAt: row.created_at,
}));

module.exports = {
  mapDetailResponse,
  mapListResponse,
};
