const TABLE_CHUNG = "nckh_chung";

/**
 * Insert a record into nckh_chung with extended import fields.
 * Returns the insertId.
 */
const insertChungExtended = async (connection, data) => {
  const query = `
    INSERT INTO ${TABLE_CHUNG} (
      ten_cong_trinh,
      loai_nckh,
      phan_loai,
      nam_hoc,
      tong_so_tiet,
      khoa_duyet,
      vien_nc_duyet,
      ngay_nghiem_thu,
      xep_loai,
      ma_so,
      so_quyet_dinh,
      cap_nhiem_vu,
      kinh_phi,
      ten_tap_chi,
      so_bao,
      so_trich_dan,
      co_quan_chu_tri,
      co_quan_chu_quan,
      thuoc_nhiem_vu,
      linh_vuc_nghien_cuu,
      kinh_phi_nam_nhat,
      kinh_phi_nam_hai,
      kinh_phi_nam_ba,
      nguon_kinh_phi,
      ngay_quyet_dinh
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    data.tenCongTrinh,
    data.loaiNckh,
    data.phanLoai || null,
    data.namHoc,
    data.tongSoTiet,
    data.khoaDuyet ?? 0,
    data.vienNcDuyet ?? 0,
    data.ngayNghiemThu || null,
    data.xepLoai || null,
    data.maSo || null,
    data.soQuyetDinh || null,
    data.capNhiemVu || null,
    data.kinhPhi || null,
    data.tenTapChi || null,
    data.soBao || null,
    data.soTrichDan ?? null,
    data.coQuanChuTri || null,
    data.coQuanChuQuan || null,
    data.thuocNhiemVu || null,
    data.linhVucNghienCuu || null,
    data.kinhPhiNamNhat || null,
    data.kinhPhiNamHai || null,
    data.kinhPhiNamBa || null,
    data.nguonKinhPhi || null,
    data.ngayQuyetDinh || null,
  ];

  const [result] = await connection.execute(query, params);
  return result.insertId;
};

/**
 * Check for duplicate records by ma_so.
 * Returns an array of existing ma_so values from the provided list.
 */
const findExistingMaSo = async (connection, maSoList) => {
  if (!maSoList.length) return [];

  const filtered = maSoList.filter((m) => m !== null && m !== undefined && String(m).trim() !== "");
  if (!filtered.length) return [];

  const placeholders = filtered.map(() => "?").join(", ");
  const query = `SELECT ma_so FROM ${TABLE_CHUNG} WHERE ma_so IN (${placeholders})`;
  const [rows] = await connection.execute(query, filtered);
  return rows.map((r) => r.ma_so);
};

/**
 * Lookup nhanvien by MaSoCanBo codes.
 * Returns rows with id_User and MaSoCanBo.
 */
const findNhanVienByMaCodes = async (connection, maCodes) => {
  if (!maCodes.length) return [];

  const filtered = [...new Set(maCodes.filter((m) => m && String(m).trim()))];
  if (!filtered.length) return [];

  const placeholders = filtered.map(() => "?").join(", ");
  const query = `SELECT id_User, MaSoCanBo, TenNhanVien FROM nhanvien WHERE MaSoCanBo IN (${placeholders})`;
  const [rows] = await connection.execute(query, filtered);
  return rows;
};

module.exports = {
  insertChungExtended,
  findExistingMaSo,
  findNhanVienByMaCodes,
};
