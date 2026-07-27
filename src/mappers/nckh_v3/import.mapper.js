/**
 * NCKH Import Mapper
 * Transforms raw Excel row objects → standardized DB-ready objects
 * for each of the 8 supported NCKH types.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

const trimStr = (v) => (v === null || v === undefined ? "" : String(v).trim());
const toIntOrNull = (v) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
};
const toFloatOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  let str = String(v).trim();
  // If it contains both dot and comma (e.g. 1.500,50), remove dot, replace comma with dot
  if (str.includes('.') && str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } 
  // If it only contains comma (e.g. 150,5), replace it with dot
  else if (str.includes(',') && !str.includes('.')) {
    str = str.replace(',', '.');
  }
  // If it only contains dot (e.g. 150.5), we leave it alone. 
  // (Assumes no thousand separator with dots like 1.500 without decimals)
  
  const n = parseFloat(str);
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

  // Pattern: Excel serial date (e.g. 45432 or 45432.5)
  if (/^\d{5}(\.\d+)?$/.test(str)) {
    const excelDate = parseFloat(str);
    const d = new Date((excelDate - 25569) * 86400 * 1000);
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${year}-${month}-${day}`;
  }

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
 * Split a list of names by comma, semicolon, or newline.
 * Do NOT split by spaces because name parts contain spaces.
 */
const splitNames = (str) =>
  trimStr(str)
    .split(/[,;，；\r\n\t]+/)
    .map((s) => s.trim())
    .filter(Boolean);

// ─── Type-specific Mappers ──────────────────────────────────────────────────

/**
 * File 1: Bài báo khoa học
 */
const mapBaiBaoKhoaHoc = (row) => {
  const rawTacGia = row["Tác giả chính"];
  const rawThanhVien = row["Thành viên "] || row["Thành viên"];
  const rawTacGiaLienHe = row["Tác giả liên hệ"] || row["Tác giả liên lạc"] || row["Tác giả gửi bài"] || row["Corresponding Author"] || row["Người liên hệ"];

  const tacGiaLienHeNames = splitNames(rawTacGiaLienHe);
  const tacGiaNames = splitNames(rawTacGia).filter((name) => !tacGiaLienHeNames.includes(name));
  const dongTacGiaNames = splitNames(rawThanhVien).filter((name) => !tacGiaLienHeNames.includes(name));

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
      tacGiaNames,
      thanhVienNames: dongTacGiaNames,
      tacGiaLienHeNames,
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
  const lop = trimStr(row["Lớp"]);

  // Build external participants (sinh viên)
  const ngoaiList = [];
  const truongNhom = trimStr(row["Trưởng nhóm thực hiện"] || row["Trưởng nhóm"]);
  if (truongNhom) {
    ngoaiList.push({ ten: truongNhom, donVi: lop || "Chưa rõ", vaiTro: "thanh_vien" });
  }

  const thanhVienStr = trimStr(row["Các thành viên khác"] || row["Các thành viên"]);
  if (thanhVienStr) {
    thanhVienStr.split(/[,;\r\n\t]+/).forEach((name) => {
      const n = name.trim();
      if (n) ngoaiList.push({ ten: n, donVi: lop || "Chưa rõ", vaiTro: "thanh_vien" });
    });
  }

  const rawCbhd = row["Cán bộ hướng dẫn"];
  const cbhdNames = splitNames(rawCbhd);
  const tacGiaNames = [];
  const thanhVienNames = [];
  if (cbhdNames.length > 0) {
    tacGiaNames.push(cbhdNames[0]);
    thanhVienNames.push(...cbhdNames.slice(1));
  }

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
      tacGiaNames,
      thanhVienNames,
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
  const tacGiaNames = splitNames(row["Chủ nhiệm nhiệm vụ"]);
  const thanhVien = splitNames(row["Các thành viên khác"]);

  const ngayNghiemThu = parseMySQLDate(row["Ngày kết thúc"]) || null;

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
      tacGiaNames,
      thanhVienNames: thanhVien,
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
  // Collect all role-name pairs
  const rolePairs = [];

  const addRole = (nameCol, vaiTro) => {
    const name = trimStr(row[nameCol]);
    if (name) rolePairs.push({ name, vaiTro });
  };

  const addRolesList = (nameCol, vaiTro) => {
    const names = splitNames(row[nameCol]);
    names.forEach(name => rolePairs.push({ name, vaiTro }));
  };

  addRole("Chủ tịch", "chu_tich");
  addRole("Phó Chủ tịch", "chu_tich");
  addRole("Thư ký", "thu_ky");
  addRolesList("Phản biện", "phan_bien");
  addRolesList("Ủy viên", "uy_vien");

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
      tongSoTiet: 0,
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

/**
 * File 5: Sách / Giáo trình
 * tongSoTiet = 0 → hệ thống tự tính dựa theo phanLoai
 */
const mapSachGiaoTrinh = (row) => {
  const tacGiaChinh = splitNames(row["Chủ biên"]);
  const dongTacGia = splitNames(row["Đồng tác giả"]);

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên sách/giáo trình"]),
      loaiNckh: "SACHGIAOTRINH",
      phanLoai: trimStr(row["Phân loại sách"]) || null,
      namHoc: null, // Sẽ được lấy từ UI select
      maSo: trimStr(row["Mã số sách"]) || null,
      soQuyetDinh: trimStr(row["Số quyết định"]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      coQuanChuQuan: trimStr(row["Nhà xuất bản"]) || null,
      coQuanChuTri: trimStr(row["Cơ quan chủ trì"]) || null,
      tongSoTiet: 0,
      capNhiemVu: null,
      kinhPhi: null,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      ngayNghiemThu: null,
      xepLoai: null,
    },
    participants: {
      tacGiaNames: tacGiaChinh,
      thanhVienNames: dongTacGia,
      ngoaiList: [],
    },
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

/**
 * File 6: Sáng kiến
 * tongSoTiet = 0 → hệ thống tự tính dựa theo phanLoai
 */
const mapSangKien = (row) => {
  const tacGiaChinh = splitNames(row["Tác giả chính"]);
  const dongTacGia = splitNames(row["Đồng tác giả"]);

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên sáng kiến"]),
      loaiNckh: "SANGKIEN",
      phanLoai: trimStr(row["Cấp sáng kiến"]) || null,
      namHoc: null, // Sẽ được lấy từ UI select
      maSo: trimStr(row["Mã số sáng kiến"]) || null,
      xepLoai: trimStr(row["Kết quả đánh giá"]) || null,
      coQuanChuTri: trimStr(row["Cơ quan chủ trì"]) || null,
      soQuyetDinh: trimStr(row["Số quyết định"]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      tongSoTiet: 0,
      capNhiemVu: null,
      kinhPhi: null,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      ngayNghiemThu: null,
    },
    participants: {
      tacGiaNames: tacGiaChinh,
      thanhVienNames: dongTacGia,
      ngoaiList: [],
    },
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

/**
 * File 7: Giải thưởng
 * tongSoTiet = 0 → hệ thống tự tính dựa theo phanLoai
 */
const mapGiaiThuong = (row) => {
  const tacGiaChinh = splitNames(row["Người đạt giải chính"]);
  const dongTacGia = splitNames(row["Thành viên khác"]);

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên giải thưởng"]),
      loaiNckh: "GIAITHUONG",
      phanLoai: trimStr(row["Cấp giải thưởng"]) || null,
      namHoc: null, // Sẽ được lấy từ UI select
      xepLoai: trimStr(row["Thứ hạng giải"]) || null,
      coQuanChuTri: trimStr(row["Cơ quan chủ trì"]) || null,
      soQuyetDinh: trimStr(row["Số quyết định"]) || null,
      ngayQuyetDinh: parseMySQLDate(row["Ngày quyết định"]) || null,
      tongSoTiet: 0,
      maSo: null,
      capNhiemVu: null,
      kinhPhi: null,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      ngayNghiemThu: null,
    },
    participants: {
      tacGiaNames: tacGiaChinh,
      thanhVienNames: dongTacGia,
      ngoaiList: [],
    },
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

/**
 * File 8: Đề xuất nghiên cứu
 * tongSoTiet = 0 → hệ thống tự tính dựa theo phanLoai
 */
const mapDeXuatNghienCuu = (row) => {
  const tacGiaChinh = splitNames(row["Chủ nhiệm đề xuất"]);
  const dongTacGia = splitNames(row["Thành viên khác"]);

  return {
    chung: {
      tenCongTrinh: trimStr(row["Tên đề xuất nghiên cứu"]),
      loaiNckh: "DEXUAT",
      phanLoai: trimStr(row["Phân loại đề xuất"]) || null,
      namHoc: null, // Sẽ được lấy từ UI select
      xepLoai: trimStr(row["Kết quả"]) || null,
      coQuanChuTri: trimStr(row["Cơ quan chủ trì"]) || null,
      tongSoTiet: 0,
      maSo: null,
      soQuyetDinh: null,
      ngayQuyetDinh: null,
      capNhiemVu: null,
      kinhPhi: null,
      tenTapChi: null,
      soBao: null,
      soTrichDan: null,
      ngayNghiemThu: null,
    },
    participants: {
      tacGiaNames: tacGiaChinh,
      thanhVienNames: dongTacGia,
      ngoaiList: [],
    },
    namThucHien: toIntOrNull(row["Năm thực hiện"]) || 1,
    mode: "standard",
  };
};

// ─── Main Dispatcher ────────────────────────────────────────────────────────

const MAPPER_MAP = {
  "bai-bao-khoa-hoc": mapBaiBaoKhoaHoc,
  "huong-dan-sv-nckh": mapHuongDanSvNckh,
  "de-tai-du-an": mapDeTaiDuAn,
  "thanh-vien-hoi-dong": mapThanhVienHoiDong,
  "sach-giao-trinh": mapSachGiaoTrinh,
  "sang-kien": mapSangKien,
  "giai-thuong": mapGiaiThuong,
  "de-xuat-nghien-cuu": mapDeXuatNghienCuu,
};

/**
 * Map a single raw Excel row to a standardized record object.
 * @param {string} type - One of the 8 type keys
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
  { value: "sach-giao-trinh", label: "Sách giáo trình" },
  { value: "sang-kien", label: "Sáng kiến" },
  { value: "giai-thuong", label: "Giải thưởng" },
  { value: "de-xuat-nghien-cuu", label: "Đề xuất nghiên cứu" },
];

module.exports = {
  mapRow,
  IMPORT_TYPES,
  MAPPER_MAP,
};
