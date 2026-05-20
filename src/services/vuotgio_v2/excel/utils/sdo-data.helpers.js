const { classifyHeDaoTao, normalizeDoiTuongLabel, getLabel } = require("../normalizers/training-system.normalizer");

const toNum = (v) => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(typeof v === "string" ? v.replace(",", ".") : v);
  return Number.isFinite(n) ? n : 0;
};

const normDate = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// ── Hệ đào tạo classification ──────────────────────────────────────────────

const vungMienLabel = (v) => {
  return getLabel(v === "viet_nam" ? "vn" : v);
};

// ── A1: Giảng dạy ──────────────────────────────────────────────────────────

const filterA1 = (summary, hocKy, isMatMa) => {
  const all = [...(summary?.raw?.giangDay || []), ...(summary?.raw?.lopNgoaiQC || [])];
  return all.filter((r) => {
    const hk = Number(r.HocKy ?? r.hoc_ky ?? 1);
    const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "";
    const { isMatMa: mm } = classifyHeDaoTao(ten);
    return hk === hocKy && mm === isMatMa;
  });
};

const mapA1Row = (r) => {
  const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "";
  const doiTuongLabel = normalizeDoiTuongLabel(ten);
  return {
    cells: [
      0, // stt placeholder
      r.TenHocPhan || r.ten_hoc_phan || "",
      toNum(r.SoTC ?? r.so_tc),
      r.Lop || r.lop || r.ten_lop || r.lop_hoc_phan || "",
      doiTuongLabel,
      toNum(r.SoTietCTDT ?? r.so_tiet_ctdt ?? r.SoTiet ?? r.so_tiet ?? r.ll),
      toNum(r.QuyChuan ?? r.quy_chuan),
    ],
  };
};

// ── A2: KTHP ────────────────────────────────────────────────────────────────

const filterA2 = (summary, hocKy, isMatMa) => {
  const all = summary?.raw?.kthp || [];
  return all.filter((r) => {
    const hk = Number(r.hoc_ky ?? r.HocKy ?? 1);
    const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "";
    const { isMatMa: mm } = classifyHeDaoTao(ten);
    return hk === hocKy && mm === isMatMa;
  });
};

const mapA2Row = (r) => {
  const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "";
  const doiTuongLabel = normalizeDoiTuongLabel(ten);
  return {
    cells: [
      0,
      r.ten_hoc_phan || r.TenHocPhan || "",
      r.hinh_thuc || r.HinhThuc || "",
      r.lop_hoc_phan || r.Lop || r.ten_lop || "",
      doiTuongLabel,
      toNum(r.so_sv ?? r.tong_so ?? r.SoSV),
      toNum(r.quy_chuan ?? r.QuyChuan),
    ],
  };
};

// ── B: Đồ án ────────────────────────────────────────────────────────────────

const filterB = (summary, filterFn) => {
  const all = summary?.raw?.doAn || [];
  return all.filter(filterFn);
};

const bFilterMatMa = (vungMien) => (r) => {
  const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || r.doi_tuong || r.DoiTuong || "";
  const c = classifyHeDaoTao(ten);
  return c.isMatMa && c.vungMien === vungMien;
};

const bFilterDongHP = (r) => {
  const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || r.doi_tuong || r.DoiTuong || "";
  return !classifyHeDaoTao(ten).isMatMa;
};

const mapBRow = (r) => ({
  cells: [
    0,
    r.TenSinhVien || r.SinhVien || r.ten_sinh_vien || "",
    r.Khoa || r.khoa_sinh_vien || "",
    r.SoQD || r.so_quyet_dinh || "",
    toNum(r.SoNguoi ?? r.so_nguoi),
    r.loai_huong_dan || (r.isHdChinh ? "HD Chính" : "HD Phụ"),
    toNum(r.SoTiet ?? r.so_tiet),
  ],
});

// ── C: Hướng dẫn tham quan ──────────────────────────────────────────────────

const filterC = (summary, filterFn) => {
  const all = summary?.raw?.huongDanThamQuan || summary?.raw?.hdtq || [];
  return all.filter(filterFn);
};

const cFilterMatMa = (vungMien) => (r) => {
  const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "";
  const c = classifyHeDaoTao(ten);
  return c.isMatMa && c.vungMien === vungMien;
};

const cFilterDongHP = (r) => {
  const ten = r.ten_he_dao_tao || r.he_dao_tao || r.HeDaoTao || "";
  return !classifyHeDaoTao(ten).isMatMa;
};

const mapCRow = (r) => ({
  cells: [
    0,
    r.mo_ta_hoat_dong || "",
    r.nganh_hoc || "",
    r.theo_qd || "",
    toNum(r.so_ngay),
    toNum(r.so_ngay),
    toNum(r.so_tiet_quy_doi),
  ],
});

// ── D: NCKH ─────────────────────────────────────────────────────────────────

const NCKH_BUCKET_MAP = {
  "de-tai-du-an": "D1",
  "sang-kien": "D2",
  "giai-thuong": "D3",
  "de-xuat-nghien-cuu": "D4",
  "sach-giao-trinh": "D5",
  "bai-bao-khoa-hoc": "D6",
  "huong-dan-sv-nckh": "D7",
  "thanh-vien-hoi-dong": "D8",
};

const filterD = (summary, bucketKey) => {
  const all = summary?.raw?.nckhRecords || [];
  if (bucketKey === "D9") {
    return all.filter((r) => !NCKH_BUCKET_MAP[String(r.typeSlug || "").trim()]);
  }
  const slugs = Object.entries(NCKH_BUCKET_MAP)
    .filter(([, v]) => v === bucketKey)
    .map(([k]) => k);
  return all.filter((r) => slugs.includes(String(r.typeSlug || "").trim()));
};

const countAuthors = (r) => {
  const c1 = r.tacGiaChinh ? r.tacGiaChinh.split(",").filter((s) => s.trim()).length : 0;
  const c2 = r.thanhVien ? r.thanhVien.split(",").filter((s) => s.trim()).length : 0;
  return c1 + c2;
};

const mapDRow = (bucketKey, r) => {
  const base = {
    ten: r.tenCongTrinh || "",
    vaiTro: r.vaiTroGiangVien || "",
    phanLoai: r.phanLoai || "",
    ngay: normDate(r.ngayNghiemThu || ""),
    xepLoai: r.xepLoai || "",
    maSo: r.maSo || "",
    soNguoi: countAuthors(r),
    soTiet: toNum(r.soTietGiangVien),
  };

  const cellsByBucket = {
    D1: [0, base.ten, base.vaiTro, base.phanLoai, base.ngay, base.xepLoai, base.soTiet],
    D2: [0, base.ten, base.vaiTro, base.phanLoai, base.ngay, base.xepLoai, base.soTiet],
    D3: [0, base.ten, base.maSo, base.ngay, base.soNguoi, base.vaiTro, base.soTiet],
    D4: [0, base.ten, base.vaiTro, base.phanLoai, base.ngay, base.xepLoai, base.soTiet],
    D5: [0, base.ten, base.maSo, null, base.soNguoi, base.vaiTro, base.soTiet],
    D6: [0, base.ten, base.phanLoai, base.maSo, base.soNguoi, base.vaiTro, base.soTiet],
    D7: [0, base.ten, base.maSo, base.ngay, base.phanLoai, base.phanLoai, base.soTiet],
    D8: [0, base.ten, base.phanLoai, base.phanLoai, base.vaiTro, base.maSo, base.soTiet],
    D9: [0, base.ten, base.maSo, "", base.phanLoai, base.phanLoai, base.soTiet],
  };

  return { cells: cellsByBucket[bucketKey] || cellsByBucket.D9 };
};

// ── Ensure minimum rows ─────────────────────────────────────────────────────

const EMPTY_ROWS = 2;

const ensureRows = (rows) => {
  if (rows.length) return rows;
  return Array.from({ length: EMPTY_ROWS }, (_, i) => ({
    cells: [i + 1, "", "", "", "", "", 0],
  }));
};

const numberRows = (rows) =>
  rows.map((r, i) => ({ ...r, cells: [i + 1, ...r.cells.slice(1)] }));

module.exports = {
  toNum,
  normDate,
  classifyHeDaoTao,
  vungMienLabel,
  filterA1,
  mapA1Row,
  filterA2,
  mapA2Row,
  filterB,
  bFilterMatMa,
  bFilterDongHP,
  mapBRow,
  filterC,
  cFilterMatMa,
  cFilterDongHP,
  mapCRow,
  filterD,
  mapDRow,
  ensureRows,
  numberRows,
};
