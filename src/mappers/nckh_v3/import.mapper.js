/**
 * NCKH Import Mapper
 * Transforms raw Excel row objects → standardized DB-ready objects
 * for each of the 4 supported NCKH types.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

const trimStr = (v) => (v === null || v === undefined ? "" : String(v).trim());
const toIntOrNull = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};
const toFloatOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const cleaned = String(v).replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? null : n;
};

/**
 * Parses various date formats from Excel (e.g. DD/MM/YYYY, MM/YYYY, YYYY)
 * into MySQL compatible YYYY-MM-DD string.
 */
const parseMySQLDate = (v) => {
  if (!v) return null;
  const str = String(v).trim();
  if (!str) return null;

  // Pattern: DD/MM/YYYY or DD-MM-YYYY
  const regexDDMMYYYY = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/;
  const match1 = str.match(regexDDMMYYYY);
  if (match1) {
    const day = match1[1].padStart(2, "0");
    const month = match1[2].padStart(2, "0");
    const year = match1[3];
    return `${year}-${month}-${day}`;
  }

  // Pattern: MM/YYYY or MM-YYYY
  const regexMMYYYY = /^(\d{1,2})[\/\-](\d{4})$/;
  const match2 = str.match(regexMMYYYY);
  if (match2) {
    const month = match2[1].padStart(2, "0");
    const year = match2[2];
    return `${year}-${month}-01`;
  }

  // Pattern: YYYY
  const regexYYYY = /^(\d{4})$/;
  const match3 = str.match(regexYYYY);
  if (match3) {
    return `${str}-01-01`;
  }
  
  // Pattern: YYYY-MM-DD (already MySQL format)
  const regexYYYYMMDD = /^(\d{4})-(\d{2})-(\d{2})$/;
  if (regexYYYYMMDD.test(str)) {
    return str;
  }

  // Fallback to JS Date parser
  const d = new Date(str);
  if (!Number.isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }

  return null; // Return null if format is unrecognizable
};

/**
 * Split a comma-separated string of employee codes into an array.
 */
const splitCodes = (str) =>
  trimStr(str)
    .split(/[,;，；\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

// ─── Type-specific Mappers ──────────────────────────────────────────────────

/**
 * File 1: Bài báo khoa học
 */
const mapBaiBaoKhoaHoc = (row) => {
  // Support both old and new headers for backward compatibility
  const rawTacGia = row["Mã số TGC"] || row["Mã tác giả chính thuộc HV"];
  const rawThanhVien = row["Mã số TV"] || row["Mã các tác giả khác thuộc HV"];

  const tacGiaChinh = splitCodes(rawTacGia);
  const dongTacGia = splitCodes(rawThanhVien);

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên bài"]),
      loaiNckh: "BAIBAO",
      phanLoai: trimStr(row["Phân loại"]) || null,
      namHoc: null, // Sẽ được lấy từ UI
      maSo: trimStr(row["Mã bài báo"]) || null,
      tenTapChi: trimStr(row["Tên Tạp chí/Hội thảo"]) || null,
      soTrichDan: toIntOrNull(row["Số trích dẫn"]),
      soBao: trimStr(row["Số báo"]) || null,
      tongSoTiet: toFloatOrNull(row["Tổng số tiết"]) || 0,
      soQuyetDinh: trimStr(row["Số quyết định"] || row["Quyết định "]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      capNhiemVu: null,
      kinhPhi: null,
      ngayNghiemThu: parseMySQLDate(row["Ngày nghiệm thu"] || row["Ngày công bố"]),
      xepLoai: trimStr(row["Xếp loại"]) || null,
    },
    participants: {
      tacGiaMaCodes: tacGiaChinh,
      thanhVienMaCodes: dongTacGia,
      ngoaiList: [],
    },
    namThucHien: toIntOrNull(row["Năm công bố"] || row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

/**
 * File 2: Hướng dẫn sinh viên NCKH
 */
const mapHuongDanSvNckh = (row) => {
  const cbhd1 = trimStr(row["Mã CBHD1"]);
  const cbhd2 = trimStr(row["Mã CBHD2"]);
  const lop = trimStr(row["Lớp"]);

  // Build external participants (sinh viên)
  const ngoaiList = [];
  const truongNhom = trimStr(row["Trưởng nhóm thực hiện"] || row["Trưởng nhóm"]);
  if (truongNhom) {
    ngoaiList.push({ ten: truongNhom, donVi: lop || "Chưa rõ", vaiTro: "thanh_vien" });
  }

  const thanhVienStr = trimStr(row["Các thành viên khác"] || row["Các thành viên"]);
  if (thanhVienStr) {
    thanhVienStr.split(/[,;]+/).forEach((name) => {
      const n = name.trim();
      if (n) ngoaiList.push({ ten: n, donVi: lop || "Chưa rõ", vaiTro: "thanh_vien" });
    });
  }

  const tacGiaMaCodes = [];
  if (cbhd1) tacGiaMaCodes.push(cbhd1);

  const thanhVienMaCodes = [];
  if (cbhd2) thanhVienMaCodes.push(cbhd2);

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên đề tài"]),
      loaiNckh: "HUONGDAN",
      phanLoai: trimStr(row["Xếp loại đề tài"]) || null, // Map làm phân loại để tính số tiết
      namHoc: trimStr(row["Năm kết thúc"]),
      maSo: trimStr(row["Mã số đề tài"]) || null,
      xepLoai: trimStr(row["Kết quả"]) || null,
      soQuyetDinh: trimStr(row["Số quyết định"] || row["Quyết định giao"]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      tongSoTiet: toFloatOrNull(row["Tổng số tiết"]) || 0,
      capNhiemVu: null,
      kinhPhi: null,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      ngayNghiemThu: null,
      coQuanChuTri: trimStr(row["Cơ quan chủ trì"]) || null,
    },
    participants: {
      tacGiaMaCodes,
      thanhVienMaCodes,
      ngoaiList,
    },
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

/**
 * File 3: Đề tài dự án
 */
const mapDeTaiDuAn = (row) => {
  const chuNhiem = trimStr(row["Mã số cán bộ"]);
  const thanhVien = splitCodes(row["Mã các thành viên khác"] || row["Mã số các thành viên khác"] || row["Mã số thành viên"] || row["Mã thành viên"]);

  // Parse "Thời gian thực hiện" to get ngayNghiemThu
  let ngayNghiemThu = null;
  const thoiGian = trimStr(row["Thời gian thực hiện"]);
  if (thoiGian) {
    // Try to extract last date: "01/2024 - 12/2024" → "12/2024"
    const parts = thoiGian.split(/[-–~]/);
    const lastPart = (parts[parts.length - 1] || "").trim();
    if (lastPart) ngayNghiemThu = parseMySQLDate(lastPart);
  }

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên nhiệm vụ"]),
      loaiNckh: "DETAI_DUAN",
      phanLoai: trimStr(row["Phân loại nhiệm vụ"]) || null,
      namHoc: trimStr(row["Năm kết thúc"] || row["Năm"]),
      maSo: trimStr(row["Mã nhiệm vụ"]) || null,
      capNhiemVu: trimStr(row["Phân cấp nhiệm vụ"]) || null,
      soQuyetDinh: trimStr(row["Số quyết định"] || row["Quyết định giao"]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      kinhPhi: trimStr(row["Tổng kinh phí"]) || null,
      xepLoai: trimStr(row["Kết quả"]) || null,
      tongSoTiet: toFloatOrNull(row["Tổng số tiết"]) || 0,
      ngayNghiemThu,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      coQuanChuTri: trimStr(row["Cơ quan chủ trì"]) || null,
      coQuanChuQuan: trimStr(row["Cơ quan chủ quản"]) || null,
      thuocNhiemVu: trimStr(row["Thuộc nhiệm vụ"]) || null,
      linhVucNghienCuu: trimStr(row["Lĩnh vực nghiên cứu"]) || null,
      kinhPhiNamNhat: trimStr(row["Kinh phí năm nhất"]) || null,
      kinhPhiNamHai: trimStr(row["Kinh phí năm hai"]) || null,
      kinhPhiNamBa: trimStr(row["Kinh phí năm ba"]) || null,
      nguonKinhPhi: trimStr(row["Nguồn kinh phí"]) || null,
    },
    participants: {
      tacGiaMaCodes: chuNhiem ? [chuNhiem] : [],
      thanhVienMaCodes: thanhVien,
      ngoaiList: [],
    },
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

/**
 * File 4: Thành viên hội đồng
 * Each row generates MULTIPLE nckh_so_tiet entries (one per role).
 * Mode = "fixed" → each member gets a fixed amount of hours.
 */
const mapThanhVienHoiDong = (row) => {
  // Collect all role-code pairs
  const rolePairs = [];

  const addRole = (maCol, vaiTro) => {
    const ma = trimStr(row[maCol]);
    if (ma) rolePairs.push({ ma, vaiTro });
  };

  const addRolesList = (maCol, vaiTro) => {
    const codes = splitCodes(row[maCol]);
    codes.forEach(ma => rolePairs.push({ ma, vaiTro }));
  };

  // Support for old format columns
  addRole("Mã số chủ tịch", "chu_tich");
  addRole("Mã số phó chủ tịch", "chu_tich");
  addRole("Mã số phản biện 1", "phan_bien");
  addRole("Mã số phản biện 2", "phan_bien");
  for (let i = 1; i <= 5; i++) {
    addRole(`Mã số ủy viên ${i}`, "uy_vien");
  }

  // Support for new format columns (single column per role, separated by comma/semicolon)
  addRole("Mã số cán bộ CT", "chu_tich");
  addRole("Mã số cán bộ PCT", "chu_tich");
  addRolesList("Mã số cán bộ PB", "phan_bien");
  addRolesList("Mã số cán bộ UV", "uy_vien");

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên nhiệm vụ"]),
      loaiNckh: "HOIDONG",
      phanLoai: trimStr(row["Loại Hội đồng"]) || null,
      namHoc: trimStr(row["Năm"]),
      maSo: trimStr(row["Mã Hội đồng"]) || null,
      capNhiemVu: trimStr(row["Cấp Hội đồng"]) || null,
      soQuyetDinh: trimStr(row["Số Quyết định"] || row["Số quyết định"] || row["Quyết định giao"]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      xepLoai: trimStr(row["Kết quả"]) || null,
      tongSoTiet: toFloatOrNull(row["Tổng số tiết"]) || 0,
      kinhPhi: null,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      ngayNghiemThu: null,
    },
    hoiDongRoles: rolePairs,
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "fixed",
  };
};

// ─── Main Dispatcher ────────────────────────────────────────────────────────

const MAPPER_MAP = {
  "bai-bao-khoa-hoc": mapBaiBaoKhoaHoc,
  "huong-dan-sv-nckh": mapHuongDanSvNckh,
  "de-tai-du-an": mapDeTaiDuAn,
  "thanh-vien-hoi-dong": mapThanhVienHoiDong,
};

/**
 * Map a single raw Excel row to a standardized record object.
 * @param {string} type - One of the 4 type keys
 * @param {Object} row  - Raw row from XLSX
 * @returns {Object}    - Mapped record
 */
const mapRow = (type, row) => {
  const mapper = MAPPER_MAP[type];
  if (!mapper) {
    throw new Error(`Loại NCKH "${type}" không được hỗ trợ import.`);
  }
  return mapper(row);
};

/**
 * Get supported import types
 */
const IMPORT_TYPES = [
  { value: "bai-bao-khoa-hoc", label: "Bài báo khoa học" },
  { value: "huong-dan-sv-nckh", label: "Hướng dẫn SV NCKH" },
  { value: "de-tai-du-an", label: "Đề tài dự án" },
  { value: "thanh-vien-hoi-dong", label: "Thành viên hội đồng" },
];

module.exports = {
  mapRow,
  IMPORT_TYPES,
  MAPPER_MAP,
};
