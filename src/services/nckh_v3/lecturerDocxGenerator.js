const {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  TextRun,
  AlignmentType,
  VerticalAlign,
  TableLayoutType,
  PageOrientation,
} = require("docx");

const FONT_FAMILY = "Times New Roman";

// Chuyển chuỗi tiếng Việt có dấu thành không dấu (giữ nguyên hoa/thường cho tên tác giả bài báo)
function toNonAccentPreserveCase(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .trim();
}

// Chuẩn hóa chuỗi chữ thường không dấu để so khớp tên giảng viên
function normalizeText(str) {
  return toNonAccentPreserveCase(str).toLowerCase();
}

// Chuẩn hóa chuỗi năm học: "2025-2026" -> "2025 – 2026"
function formatNamHocText(namHoc) {
  if (!namHoc) return "";
  return String(namHoc).replace(/\s*[-–]\s*/g, " – ");
}

// Định dạng số giờ chuẩn (bỏ .00 nếu là số nguyên, giữ tối đa 2 chữ số thập phân)
function formatHoursNumber(val) {
  if (val === null || val === undefined || val === "") return "";
  const num = Number(val);
  if (isNaN(num) || num === 0) return "";
  return Number(num.toFixed(2)).toString();
}

// Định dạng ngày dd/mm/yyyy
function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Kiểu viền bảng
const borderThin = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const borderNone = { style: BorderStyle.NIL, size: 0, color: "auto" };

const tableCellBorders = {
  top: borderThin,
  bottom: borderThin,
  left: borderThin,
  right: borderThin,
};

const noBorders = {
  top: borderNone,
  bottom: borderNone,
  left: borderNone,
  right: borderNone,
  insideHorizontal: borderNone,
  insideVertical: borderNone,
};

// Độ rộng 5 cột chuẩn theo file mẫu A4 Landscape (Tổng = 14286 DXA)
const COL_WIDTHS = [590, 6606, 1096, 3726, 2268];
const TOTAL_TABLE_WIDTH = COL_WIDTHS.reduce((a, b) => a + b, 0);

/**
 * Danh sách Lãnh đạo đơn vị theo từng khoa / phòng ban
 * Dựa trên bảng lãnh đạo đơn vị và csdl nhanvien:
 * 1: ATTT -> Hoàng Đức Thọ (Chủ nhiệm Khoa)
 * 2: CNTT -> Phạm Văn Hưởng (Chủ nhiệm khoa)
 * 3: DAOTAO -> Nguyễn Quang Quân (Trưởng Ban Đào tạo)
 * 4: BGĐ -> Hoàng Văn Thức (Giám đốc học viện)
 * 5: NC&HTPT -> Nguyễn Chung Tiến (Viện trưởng)
 * 6: VP -> Đặng Thị Hồng Nhung (Trưởng phòng)
 * 7: ĐTVM -> Bùi Đức Trình (Chủ nhiệm Khoa)
 * 8: NCKH -> Nguyễn Chung Tiến (Viện trưởng)
 * 9: ĐTPH -> Phan Văn Đức (Chủ nhiệm khoa)
 * 10: KT&ĐBCL -> Nguyễn Tuấn Anh (Trưởng phòng KT&ĐBCL)
 * 11: CB -> Nguyễn Thị Thanh Vân (Chủ nhiệm Khoa)
 * 12: MM -> Nguyễn Thanh Tùng (Chủ nhiệm khoa)
 */
const DEPARTMENT_LEADERS = {
  BY_ID: {
    1: "Hoàng Đức Thọ",
    2: "Phạm Văn Hưởng",
    3: "Nguyễn Quang Quân",
    4: "Hoàng Văn Thức",
    5: "Nguyễn Chung Tiến",
    6: "Đặng Thị Hồng Nhung",
    7: "Bùi Đức Trình",
    8: "Nguyễn Chung Tiến",
    9: "Phan Văn Đức",
    10: "Nguyễn Tuấn Anh",
    11: "Nguyễn Thị Thanh Vân",
    12: "Nguyễn Thanh Tùng",
  },
  BY_CODE: {
    ATTT: "Hoàng Đức Thọ",
    CNTT: "Phạm Văn Hưởng",
    DAOTAO: "Nguyễn Quang Quân",
    BGD: "Hoàng Văn Thức",
    "BGĐ": "Hoàng Văn Thức",
    "NC&HTPT": "Nguyễn Chung Tiến",
    NCHTPT: "Nguyễn Chung Tiến",
    NCKH: "Nguyễn Chung Tiến",
    VP: "Đặng Thị Hồng Nhung",
    DTVM: "Bùi Đức Trình",
    "ĐTVM": "Bùi Đức Trình",
    DTPH: "Phan Văn Đức",
    "ĐTPH": "Phan Văn Đức",
    "KT&ĐBCL": "Nguyễn Tuấn Anh",
    "KT&DBCL": "Nguyễn Tuấn Anh",
    KTDBCL: "Nguyễn Tuấn Anh",
    CB: "Nguyễn Thị Thanh Vân",
    MM: "Nguyễn Thanh Tùng",
  },
  BY_NAME_KEYWORDS: [
    { pattern: /an\s*toan\s*thong\s*tin|attt/i, leader: "Hoàng Đức Thọ" },
    { pattern: /cong\s*nghe\s*thong\s*tin|cntt/i, leader: "Phạm Văn Hưởng" },
    { pattern: /dao\s*tao\s*tai\s*phan\s*hieu|dtph|phan\s*hieu/i, leader: "Phan Văn Đức" },
    { pattern: /dao\s*tao|ban\s*dao\s*tao|phong\s*dao\s*tao/i, leader: "Nguyễn Quang Quân" },
    { pattern: /ban\s*giam\s*doc|bgd/i, leader: "Hoàng Văn Thức" },
    { pattern: /hop\s*tac\s*phat\s*trien|vien\s*nghien\s*cuu|nchc|nckh/i, leader: "Nguyễn Chung Tiến" },
    { pattern: /van\s*phong/i, leader: "Đặng Thị Hồng Nhung" },
    { pattern: /dien\s*tu\s*vi\s*mach|dtvm/i, leader: "Bùi Đức Trình" },
    { pattern: /khao\s*thi|dam\s*bao\s*chat\s*luong|kt&dbcl/i, leader: "Nguyễn Tuấn Anh" },
    { pattern: /co\s*ban/i, leader: "Nguyễn Thị Thanh Vân" },
    { pattern: /mat\s*ma/i, leader: "Nguyễn Thanh Tùng" },
  ],
};

function getDepartmentLeader(lecturer = {}, reportData = {}) {
  if (reportData.lanhDaoDonVi && String(reportData.lanhDaoDonVi).trim()) {
    return String(reportData.lanhDaoDonVi).trim();
  }
  if (lecturer.lanhDaoDonVi && String(lecturer.lanhDaoDonVi).trim()) {
    return String(lecturer.lanhDaoDonVi).trim();
  }

  const pbId = lecturer.phongbanId || lecturer.phongban_id;
  if (pbId && DEPARTMENT_LEADERS.BY_ID[pbId]) {
    return DEPARTMENT_LEADERS.BY_ID[pbId];
  }

  const rawCode = String(lecturer.maPhongBan || "").trim();
  if (rawCode) {
    const codeUpper = rawCode.toUpperCase();
    if (DEPARTMENT_LEADERS.BY_CODE[codeUpper]) {
      return DEPARTMENT_LEADERS.BY_CODE[codeUpper];
    }
    const nonAccentCode = toNonAccentPreserveCase(codeUpper).replace(/[^A-Z0-9&]/g, "");
    if (DEPARTMENT_LEADERS.BY_CODE[nonAccentCode]) {
      return DEPARTMENT_LEADERS.BY_CODE[nonAccentCode];
    }
  }

  const normDeptName = normalizeText(lecturer.tenPhongBan || lecturer.maPhongBan || "");
  if (normDeptName) {
    for (const item of DEPARTMENT_LEADERS.BY_NAME_KEYWORDS) {
      if (item.pattern.test(normDeptName)) {
        return item.leader;
      }
    }
  }

  return "";
}

function formatDepartmentHeader(lecturer = {}) {
  if (typeof lecturer === "string") {
    lecturer = { tenPhongBan: lecturer };
  }
  const rawName = (lecturer.tenPhongBan || lecturer.maPhongBan || "KHOA CNTT").trim();
  const rawUpper = rawName.toUpperCase();
  const code = (lecturer.maPhongBan || "").trim().toUpperCase();
  const norm = normalizeText(rawName);

  // 1. Ưu tiên xử lý 3 đơn vị đặc thù theo yêu cầu
  if (
    code === "DAOTAO" ||
    rawUpper === "DAOTAO" ||
    norm === "dao tao" ||
    norm === "ban dao tao" ||
    norm === "phong dao tao"
  ) {
    return "PHÒNG ĐÀO TẠO";
  }

  if (
    code === "NC&HTPT" ||
    code === "NCHTPT" ||
    code === "NCKH" ||
    rawUpper === "NC&HTPT" ||
    norm.includes("nghien cuu va hop tac") ||
    norm.includes("nc&htpt")
  ) {
    return "VIỆN NGHIÊN CỨU VÀ HỢP TÁC PT";
  }

  if (
    code === "KT&ĐBCL" ||
    code === "KT&DBCL" ||
    code === "KTDBCL" ||
    rawUpper === "KT&ĐBCL" ||
    norm.includes("khao thi va dam bao") ||
    norm.includes("kt&dbcl")
  ) {
    return "PHÒNG KHẢO THÍ VÀ ĐẢM BẢO CL";
  }

  // 2. Các phòng ban đặc thù khác
  if (code === "BGĐ" || code === "BGD") {
    return "BAN GIÁM ĐỐC";
  }
  if (code === "VP") {
    return "VĂN PHÒNG";
  }

  // 3. Nếu đã có tiền tố đơn vị thì giữ nguyên
  if (
    rawUpper.startsWith("KHOA ") ||
    rawUpper.startsWith("PHÒNG ") ||
    rawUpper.startsWith("PHONG ") ||
    rawUpper.startsWith("BAN ") ||
    rawUpper.startsWith("VIỆN ") ||
    rawUpper.startsWith("VIEN ") ||
    rawUpper.startsWith("TRUNG TÂM ") ||
    rawUpper.startsWith("TRUNG TAM ")
  ) {
    return rawUpper;
  }

  // 4. Các Khoa đào tạo
  const isFaculty =
    lecturer.isKhoa === 1 ||
    ["ATTT", "CNTT", "ĐTVM", "DTVM", "ĐTPH", "DTPH", "CB", "MM"].includes(code);

  if (isFaculty) {
    return `KHOA ${rawUpper}`;
  }

  return rawUpper;
}

/**
 * Bảng Header Quốc hiệu - Tiêu ngữ (3 cột không viền chuẩn khổ ngang)
 */
function buildHeaderTable(khoaName) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  const deptUpper = (khoaName || "KHOA CNTT").toUpperCase();

  return new Table({
    width: { size: 14219, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          // Cột trái: Học viện & Khoa
          new TableCell({
            width: { size: 4739, type: WidthType.DXA },
            borders: noBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "HỌC VIỆN KỸ THUẬT MẬT MÃ",
                    font: FONT_FAMILY,
                    size: 27, // 13.5pt, không in đậm theo mẫu
                    bold: false,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: deptUpper,
                    font: FONT_FAMILY,
                    size: 27, // 13.5pt, in đậm
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
            ],
          }),
          // Cột giữa: Khoảng trống
          new TableCell({
            width: { size: 4016, type: WidthType.DXA },
            borders: noBorders,
            children: [new Paragraph({})],
          }),
          // Cột phải: Quốc hiệu, Tiêu ngữ, Ngày tháng
          new TableCell({
            width: { size: 5464, type: WidthType.DXA },
            borders: noBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
                    font: FONT_FAMILY,
                    size: 25, // 12.5pt
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: "Độc lập – Tự do – Hạnh phúc",
                    font: FONT_FAMILY,
                    size: 25, // 12.5pt
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `Hà Nội, ngày ${day} tháng ${month} năm ${year}`,
                    font: FONT_FAMILY,
                    size: 27, // 13.5pt
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

// Chuẩn hóa học vị sang dạng viết tắt chuẩn (Tiến sĩ -> TS., Thạc sĩ -> ThS., PGS.TS., GS.TS., ...)
function formatHocVi(hocVi) {
  if (!hocVi) return "";
  const s = String(hocVi).trim();
  const lower = s.toLowerCase();
  if (lower === "tiến sĩ" || lower === "ts" || lower === "ts.") return "TS.";
  if (lower === "thạc sĩ" || lower === "ths" || lower === "ths.") return "ThS.";
  if (
    (lower.includes("phó giáo sư") && lower.includes("tiến sĩ")) ||
    lower.includes("pgs.ts") || lower.includes("pgs. ts") || lower.includes("pgs-ts")
  ) {
    return "PGS.TS.";
  }
  if (
    (lower.includes("giáo sư") && lower.includes("tiến sĩ")) ||
    lower.includes("gs.ts") || lower.includes("gs. ts") || lower.includes("gs-ts")
  ) {
    return "GS.TS.";
  }
  if (lower.startsWith("phó giáo sư") || lower === "pgs" || lower === "pgs.") return "PGS.";
  if (lower.startsWith("giáo sư") || lower === "gs" || lower === "gs.") return "GS.";
  if (lower === "kỹ sư" || lower === "ks" || lower === "ks.") return "KS.";
  if (lower === "cử nhân" || lower === "cn" || lower === "cn.") return "CN.";
  return s.endsWith(".") ? s : `${s}.`;
}

// Trích xuất cấp thực hiện ngắn gọn chuẩn mẫu (Cơ sở, Quốc gia, Ban, Bộ, ...)
function extractCapNhiemVu(capNhiemVu, phanLoai) {
  if (capNhiemVu && String(capNhiemVu).trim()) {
    return String(capNhiemVu).trim();
  }
  const pl = String(phanLoai || "").trim();
  const lowerPl = pl.toLowerCase();
  if (lowerPl.includes("cơ sở") || lowerPl.includes("co so")) return "Cơ sở";
  if (lowerPl.includes("quốc gia") || lowerPl.includes("quoc gia")) return "Quốc gia";
  if (lowerPl.includes("ban, bộ") || lowerPl.includes("cấp bộ") || lowerPl.includes("cap bo")) return "Ban, Bộ";
  if (lowerPl.includes("học viện") || lowerPl.includes("hoc vien")) return "Học viện";
  if (lowerPl.includes("tỉnh") || lowerPl.includes("tinh")) return "Tỉnh";
  return pl || "Cơ sở";
}

/**
 * Mục 1: Đề tài, dự án
 * Mẫu:
 * 1. Nghiên cứu, thử nghiệm... (Mã số: 10/2025/CS) [không in đậm]
 *    \t- Chủ nhiệm đề tài: TS. Lê Đức Thuận
 *    \t- Thành viên: <Các thành viên khác (trừ chủ nhiệm đề tài)>
 *    \t- Tổng số thành viên: 03
 *    \t- Cấp thực hiện: Cơ sở
 *    \t- Năm thực hiện: 2025
 */
function buildDeTaiParagraphs(record, subIndex, lecturer = {}) {
  // 1. Xác định Chủ nhiệm đề tài
  let leader = null;
  if (record.participants && record.participants.length > 0) {
    leader =
      record.participants.find((p) =>
        ["tac_gia", "chu_nhiem", "tac_gia_chinh", "chu_tri"].includes(
          String(p.vaiTro || "").toLowerCase()
        )
      ) || record.participants[0];
  }

  let leaderName = leader
    ? (leader.tenNhanVien || leader.tenNgoai || "").trim()
    : (record.tacGiaChinh || "").trim();

  let rawLeaderHocVi = leader && leader.hocVi ? String(leader.hocVi).trim() : "";
  if (!rawLeaderHocVi && lecturer && lecturer.hocVi) {
    const leaderNorm = normalizeText(leaderName);
    const lectNorm = normalizeText(lecturer.tenNhanVien || "");
    const isSame =
      (leader && leader.nhanvienId && lecturer.idUser && Number(leader.nhanvienId) === Number(lecturer.idUser)) ||
      (leaderNorm && lectNorm && leaderNorm === lectNorm);
    if (isSame) {
      rawLeaderHocVi = String(lecturer.hocVi).trim();
    }
  }

  const leaderHocVi = formatHocVi(rawLeaderHocVi);
  if (leaderHocVi && leaderName) {
    leaderName = leaderName
      .replace(/^(tiến sĩ|thạc sĩ|phó giáo sư\. tiến sĩ|giáo sư\. tiến sĩ|phó giáo sư|giáo sư|kỹ sư|cử nhân)\s+/i, "")
      .trim();
    if (!leaderName.toLowerCase().startsWith(leaderHocVi.toLowerCase())) {
      leaderName = `${leaderHocVi} ${leaderName}`;
    }
  }

  // 2. Danh sách thành viên khác (trừ chủ nhiệm đề tài)
  const otherMembersList = [];
  const seenMemberKeys = new Set();

  if (leader) {
    if (leader.nhanvienId) {
      seenMemberKeys.add(`id:${leader.nhanvienId}`);
    }
    const lName = normalizeText(leader.tenNhanVien || leader.tenNgoai || "");
    if (lName) {
      seenMemberKeys.add(`name:${lName}`);
    }
  }

  if (record.participants && record.participants.length > 0) {
    record.participants.forEach((p) => {
      if (p === leader) return;
      const idKey = p.nhanvienId ? `id:${p.nhanvienId}` : null;
      const rawName = (p.tenNhanVien || p.tenNgoai || "").trim();
      const nameKey = rawName ? `name:${normalizeText(rawName)}` : null;

      if (idKey && seenMemberKeys.has(idKey)) return;
      if (nameKey && seenMemberKeys.has(nameKey)) return;

      if (idKey) seenMemberKeys.add(idKey);
      if (nameKey) seenMemberKeys.add(nameKey);

      if (rawName) {
        otherMembersList.push(rawName);
      }
    });
  }

  // Fallback nếu không có participants trong record (dùng record.thanhVien)
  if (!otherMembersList.length && record.thanhVien) {
    const rawThanhVien = String(record.thanhVien)
      .split(/[,;\r\n\t]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const leaderNorm = normalizeText(
      leader ? (leader.tenNhanVien || leader.tenNgoai || "") : (record.tacGiaChinh || "")
    );
    rawThanhVien.forEach((name) => {
      const norm = normalizeText(name);
      if (norm !== leaderNorm && !seenMemberKeys.has(`name:${norm}`)) {
        seenMemberKeys.add(`name:${norm}`);
        otherMembersList.push(name);
      }
    });
  }

  const thanhVienText = otherMembersList.join(", ");

  // 3. Tổng số thành viên
  const totalCount = leader
    ? 1 + otherMembersList.length
    : (otherMembersList.length || (record.participants ? record.participants.length : 1));
  const totalMembers = String(totalCount).padStart(2, "0");

  // 4. Cấp thực hiện
  const cap = extractCapNhiemVu(record.capNhiemVu, record.phanLoai);

  // 5. Năm thực hiện
  const nam = record.namHoc ? String(record.namHoc).split("-")[0].trim() : "";

  // 6. Tiêu đề công trình + mã số (tránh lặp lại mã số nếu trong tên đã có)
  let title = String(record.tenCongTrinh || "").trim();
  const rawMaSo = String(record.maSo || "").trim();
  if (rawMaSo) {
    const normTitle = normalizeText(title);
    const normMaSo = normalizeText(rawMaSo);
    if (!normTitle.includes(normMaSo) && !normTitle.includes("ma so")) {
      title = `${title} (Mã số: ${rawMaSo})`;
    }
  }

  const lines = [
    `${subIndex}. ${title}`,
    `\t- Chủ nhiệm đề tài: ${leaderName}`,
    `\t- Thành viên: ${thanhVienText}`,
    `\t- Tổng số thành viên: ${totalMembers}`,
    `\t- Cấp thực hiện: ${cap}`,
    `\t- Năm thực hiện: ${nam}`,
  ];

  return lines.map(
    (text) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text,
            font: FONT_FAMILY,
            size: 26, // 13pt
          }),
        ],
      })
  );
}

/**
 * Mục 5: Sách, giáo trình, tài liệu dạy học...
 * Mẫu:
 * Giáo trình: Trí tuệ nhân tạo trong chuyển đổi số
 * Loại sách: Bài giảng
 * Năm xuất bản: 2026
 * Vai trò: Chủ biên
 * Nhóm tác giả: Lê Đức Thuận, Cao Thanh Vinh
 */
function buildSachParagraphs(record, subIndex, totalRecords = 1) {
  const authors =
    record.participants && record.participants.length > 0
      ? record.participants
          .map((p) => p.tenNhanVien || p.tenNgoai)
          .filter(Boolean)
          .join(", ")
      : [record.tacGiaChinh, record.thanhVien].filter(Boolean).join(", ");

  const roleText = (() => {
    const rawRole = String(record.vaiTroGiangVien || "").toLowerCase();
    if (rawRole.includes("chu_bien") || rawRole.includes("chủ biên") || rawRole.includes("tac_gia_chinh")) {
      return "Chủ biên";
    }
    if (rawRole.includes("dong_chu_bien") || rawRole.includes("đồng chủ biên")) {
      return "Đồng chủ biên";
    }
    if (rawRole.includes("thanh_vien") || rawRole.includes("tham_gia")) {
      return "Thành viên";
    }
    return record.vaiTroGiangVien || "Chủ biên";
  })();

  const year = record.namXuatBan || (record.namHoc ? String(record.namHoc).split("-").pop().trim() : "");
  const prefix = totalRecords > 1 ? `${subIndex}. ` : "";

  const lines = [
    `${prefix}Giáo trình: ${record.tenCongTrinh || ""}`,
    `Loại sách: ${record.phanLoai || "Bài giảng"}`,
    `Năm xuất bản: ${year}`,
    `Vai trò: ${roleText}`,
    `Nhóm tác giả: ${authors}`,
  ];

  return lines.map(
    (text) =>
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { before: 40, after: 40 },
        children: [
          new TextRun({
            text,
            font: FONT_FAMILY,
            size: 26, // 13pt
          }),
        ],
      })
  );
}

// Kiểm tra vai trò có thuộc nhóm tác giả chính không
function isMainRole(role) {
  const r = String(role || "").toLowerCase().trim();
  if (r === "thanh_vien" || r.includes("dong_tac_gia") || r.includes("tham_gia")) {
    return false;
  }
  return (
    r === "tac_gia" ||
    r.includes("tac_gia_chinh") ||
    r.includes("tac_gia_lien_he") ||
    r.includes("chu_bien") ||
    r.includes("chu_nhiem") ||
    r.includes("chu_tri") ||
    r.includes("chinh")
  );
}

// Kiểm tra giảng viên kê khai có thuộc nhóm tác giả chính của bài báo không
function isLecturerMainAuthor(record, lecturerName) {
  if (!record) return false;
  const normLecturer = normalizeText(lecturerName);

  if (record.vaiTroGiangVien && isMainRole(record.vaiTroGiangVien)) {
    return true;
  }

  if (record.participants && record.participants.length > 0) {
    for (const p of record.participants) {
      const name = (p.tenNhanVien || p.tenNgoai || "").trim();
      if (!name) continue;
      const normName = normalizeText(name);
      const isLecturer =
        normLecturer &&
        (normName.includes(normLecturer) || normLecturer.includes(normName));

      if (isLecturer && isMainRole(p.vaiTro)) {
        return true;
      }
    }
  }

  if (record.tacGiaChinh && normLecturer) {
    const normTacGiaChinh = normalizeText(record.tacGiaChinh);
    if (normTacGiaChinh.includes(normLecturer) || normLecturer.includes(normTacGiaChinh)) {
      return true;
    }
  }

  return false;
}

/**
 * Mục 6: Bài báo, ấn phẩm khoa học
 * Tên tác giả chuyển sang không dấu; tên giảng viên kê khai in đậm & gạch chân.
 * - Nếu giảng viên thuộc nhóm tác giả chính: đưa lên đầu danh sách tác giả.
 * - Nếu không thuộc tác giả chính: đặt ngay sau nhóm tác giả chính.
 */
function buildBaiBaoParagraphs(record, subIndex, lecturerName) {
  const normLecturer = normalizeText(lecturerName);

  let mainAuthors = [];
  let otherAuthors = [];
  let lecturerFoundName = lecturerName || "";
  let lecturerIsMain = isLecturerMainAuthor(record, lecturerName);

  if (record.participants && record.participants.length > 0) {
    record.participants.forEach((p) => {
      const name = (p.tenNhanVien || p.tenNgoai || "").trim();
      if (!name) return;

      const normName = normalizeText(name);
      const isLecturer =
        normLecturer &&
        (normName.includes(normLecturer) || normLecturer.includes(normName));

      const isMain = isMainRole(p.vaiTro);

      if (isLecturer) {
        lecturerFoundName = name;
        if (isMain) {
          lecturerIsMain = true;
        }
      } else if (isMain) {
        mainAuthors.push(name);
      } else {
        otherAuthors.push(name);
      }
    });
  } else {
    // Fallback nếu không có participants (dùng tacGiaChinh, thanhVien)
    const rawMain = String(record.tacGiaChinh || "")
      .split(/[,;\r\n\t]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const rawOther = String(record.thanhVien || "")
      .split(/[,;\r\n\t]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    rawMain.forEach((name) => {
      const normName = normalizeText(name);
      if (normLecturer && (normName.includes(normLecturer) || normLecturer.includes(normName))) {
        lecturerFoundName = name;
        lecturerIsMain = true;
      } else {
        mainAuthors.push(name);
      }
    });

    rawOther.forEach((name) => {
      const normName = normalizeText(name);
      if (normLecturer && (normName.includes(normLecturer) || normLecturer.includes(normName))) {
        lecturerFoundName = name;
      } else {
        otherAuthors.push(name);
      }
    });
  }

  // Sắp xếp danh sách tác giả:
  // - Nếu giảng viên là tác giả chính: đưa lên đầu danh sách tác giả.
  // - Nếu giảng viên không phải tác giả chính: đặt ngay sau nhóm tác giả chính.
  let authorsList = [];
  if (lecturerIsMain) {
    if (lecturerFoundName) {
      authorsList.push(lecturerFoundName);
    }
    authorsList.push(...mainAuthors, ...otherAuthors);
  } else {
    authorsList.push(...mainAuthors);
    if (lecturerFoundName) {
      authorsList.push(lecturerFoundName);
    }
    authorsList.push(...otherAuthors);
  }

  if (!authorsList.length && lecturerName) {
    authorsList = [lecturerName];
  }

  const runs = [
    new TextRun({
      text: `${subIndex}. `,
      font: FONT_FAMILY,
      size: 26,
    }),
  ];

  authorsList.forEach((author, idx) => {
    const normAuthor = normalizeText(author);
    const isLecturer =
      normLecturer &&
      (normAuthor.includes(normLecturer) || normLecturer.includes(normAuthor));

    // Chuyển tên tác giả sang không dấu theo đúng chuẩn mẫu (VD: "Le Duc Thuan")
    const displayAuthor = toNonAccentPreserveCase(author);

    runs.push(
      new TextRun({
        text: displayAuthor,
        font: FONT_FAMILY,
        size: 26,
        bold: isLecturer ? true : undefined,
        underline: isLecturer ? {} : undefined,
      })
    );

    if (idx < authorsList.length - 1) {
      runs.push(
        new TextRun({
          text: ", ",
          font: FONT_FAMILY,
          size: 26,
        })
      );
    }
  });

  const title = record.tenCongTrinh || "";
  const journal = record.tenTapChi || "";
  const year = record.namXuatBan || (record.namHoc ? String(record.namHoc).split("-")[0].trim() : "");
  const issue = record.soBao ? `, ${record.soBao}` : "";
  const doi = record.maSo
    ? record.maSo.toLowerCase().startsWith("doi") || record.maSo.startsWith("http")
      ? record.maSo
      : `Doi: ${record.maSo}`
    : "";

  let citationTail = "";
  if (journal) citationTail += `, ${journal}`;
  if (year) citationTail += `, ${year}`;
  if (issue) citationTail += `${issue}`;
  if (doi) citationTail += `. ${doi}`;

  runs.push(
    new TextRun({
      text: `, “${title}”`,
      font: FONT_FAMILY,
      size: 26,
    })
  );

  if (citationTail) {
    runs.push(
      new TextRun({
        text: citationTail.endsWith(".") ? citationTail : `${citationTail}.`,
        font: FONT_FAMILY,
        size: 26,
      })
    );
  }

  return [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 40, after: 40 },
      children: runs,
    }),
  ];
}

/**
 * Phân tích kết quả đề tài Hướng dẫn SV NCKH (Mục 7)
 * Dựa trên cả xepLoai và phanLoai trong CSDL
 */
function parseHuongDanKetQua(xepLoai, phanLoai) {
  const xl = String(xepLoai || "").trim();
  const pl = String(phanLoai || "").trim();
  const lowerXl = xl.toLowerCase();
  const lowerPl = pl.toLowerCase();
  const normXl = normalizeText(xl);
  const normPl = normalizeText(pl);

  // 1. Kiểm tra giải Nhất
  if (
    lowerXl.includes("nhất") ||
    lowerPl.includes("nhất") ||
    normXl.includes("nhat") ||
    normPl.includes("nhat")
  ) {
    return { prefix: "Đề tài đạt giải ", bold: "Nhất" };
  }

  // 2. Kiểm tra giải Nhì
  if (
    lowerXl.includes("nhì") ||
    lowerPl.includes("nhì") ||
    normXl.includes("nhi") ||
    normPl.includes("nhi")
  ) {
    return { prefix: "Đề tài đạt giải ", bold: "Nhì" };
  }

  // 3. Sản phẩm tiêu biểu (nếu xếp loại ghi rõ và không chứa nhì)
  if (
    (lowerXl.includes("tiêu biểu") || normXl.includes("tieu bieu")) &&
    !lowerXl.includes("nhì") &&
    !normXl.includes("nhi")
  ) {
    return { prefix: "Đề tài đạt giải ", bold: "sản phẩm tiêu biểu" };
  }

  // 4. Giải Khuyến khích (nếu xếp loại ghi rõ khuyến khích, hoặc phân loại chỉ có khuyến khích không có ba)
  if (
    lowerXl.includes("khuyến khích") ||
    normXl.includes("khuyen khich") ||
    ((lowerPl.includes("khuyến khích") || normPl.includes("khuyen khich")) &&
      !lowerPl.includes("ba") &&
      !normPl.includes("ba"))
  ) {
    return { prefix: "Đề tài đạt giải ", bold: "Khuyến khích" };
  }

  // 5. Giải Ba
  if (
    lowerXl.includes("giải ba") ||
    lowerPl.includes("giải ba") ||
    lowerPl.includes("đạt giải ba") ||
    normXl.includes("giai ba") ||
    normPl.includes("giai ba") ||
    /\bba\b/i.test(lowerXl) ||
    lowerPl.includes("ba hoặc") ||
    normPl.includes("ba hoac")
  ) {
    return { prefix: "Đề tài đạt giải ", bold: "Ba" };
  }

  // 6. Đạt yêu cầu cấp khoa
  if (
    lowerXl.includes("cấp khoa") ||
    lowerPl.includes("cấp khoa") ||
    normXl.includes("cap khoa") ||
    normPl.includes("cap khoa") ||
    lowerXl.includes("yêu cầu") ||
    lowerPl.includes("yêu cầu") ||
    normXl.includes("yeu cau") ||
    normPl.includes("yeu cau")
  ) {
    return { prefix: "Đề tài ", bold: "đạt yêu cầu cấp khoa" };
  }

  // 7. Xếp loại khác (ví dụ "Giỏi", "Xuất sắc" nếu người dùng tự nhập)
  if (xl && lowerXl !== "đạt" && normXl !== "dat") {
    return { prefix: "Đề tài đạt ", bold: xl };
  }

  // Mặc định chuẩn cho Hướng dẫn NCKH
  return { prefix: "Đề tài ", bold: "đạt yêu cầu cấp khoa" };
}

/**
 * Thứ tự ưu tiên giải thưởng để sắp xếp Mục 7:
 * 1. Giải Nhất
 * 2. Giải Nhì
 * 3. Sản phẩm tiêu biểu
 * 4. Giải Ba
 * 5. Giải Khuyến khích
 * 6. Đạt yêu cầu cấp khoa
 * 7. Khác
 */
function getHuongDanRank(record) {
  if (!record) return 999;
  const { bold } = parseHuongDanKetQua(
    record.xepLoai || record.xep_loai,
    record.phanLoai || record.phan_loai
  );
  switch (bold) {
    case "Nhất":
      return 1;
    case "Nhì":
      return 2;
    case "sản phẩm tiêu biểu":
      return 3;
    case "Ba":
      return 4;
    case "Khuyến khích":
      return 5;
    case "đạt yêu cầu cấp khoa":
      return 6;
    default:
      return 7;
  }
}

/**
 * Mục 7: Hướng dẫn sinh viên nghiên cứu khoa học
 * Mẫu:
 * 1. Là đồng hướng dẫn đề tài NCKH của HVSV năm học 2025 – 2026 “...”
 *    \t- Cán bộ hướng dẫn: <liệt kê các cán bộ hướng dẫn>
 *    \t- Kết quả: Đề tài đạt giải Nhất. (chữ "Nhất" / "Nhì" / "đạt yêu cầu cấp khoa" in đậm)
 */
function buildHuongDanParagraphs(record, subIndex, lecturerName) {
  const numCount =
    record.participants && record.participants.length > 0
      ? record.participants.length
      : 1;

  const roleDesc = String(record.vaiTroGiangVien || "").toLowerCase();
  let roleText = "đồng hướng dẫn";
  if (roleDesc.includes("dong") || roleDesc.includes("đồng")) {
    roleText = "đồng hướng dẫn";
  } else if (roleDesc.includes("chinh") || roleDesc.includes("chính")) {
    roleText = "hướng dẫn chính";
  } else if (numCount > 1) {
    roleText = "đồng hướng dẫn";
  } else {
    roleText = "hướng dẫn chính";
  }

  const namHocFormatted = formatNamHocText(record.namHoc || "");

  let cbhdList = "";
  if (record.participants && record.participants.length > 0) {
    cbhdList = record.participants
      .map((p) => (p.tenNhanVien || p.tenNgoai || "").trim())
      .filter(Boolean)
      .join(", ");
  }
  if (!cbhdList && lecturerName) {
    cbhdList = lecturerName;
  }

  const { prefix: resultPrefix, bold: resultBold } = parseHuongDanKetQua(
    record.xepLoai || record.xep_loai,
    record.phanLoai || record.phan_loai
  );

  return [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 40, after: 40 },
      children: [
        new TextRun({
          text: `${subIndex}. Là ${roleText} đề tài NCKH của HVSV năm học ${namHocFormatted} “${record.tenCongTrinh || ""}”`,
          font: FONT_FAMILY,
          size: 26,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 40, after: 40 },
      children: [
        new TextRun({
          text: `\t- Cán bộ hướng dẫn: ${cbhdList}`,
          font: FONT_FAMILY,
          size: 26,
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 40, after: 40 },
      children: [
        new TextRun({
          text: `\t- Kết quả: ${resultPrefix}`,
          font: FONT_FAMILY,
          size: 26,
        }),
        new TextRun({
          text: resultBold,
          font: FONT_FAMILY,
          size: 26,
          bold: true,
        }),
        new TextRun({
          text: ".",
          font: FONT_FAMILY,
          size: 26,
        }),
      ],
    }),
  ];
}

/**
 * Các mục còn lại (Sáng kiến, Giải thưởng, Đề xuất, Hội đồng...)
 */
function buildGenericParagraphs(record, subIndex) {
  const parts = [];
  parts.push(record.tenCongTrinh || "");
  if (record.phanLoai) parts.push(`(${record.phanLoai})`);
  if (record.maSo) parts.push(`Mã số: ${record.maSo}`);
  if (record.vaiTroGiangVien) parts.push(`Vai trò: ${record.vaiTroGiangVien}`);
  if (record.xepLoai) parts.push(`Xếp loại: ${record.xepLoai}`);

  return [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 40, after: 40 },
      children: [
        new TextRun({
          text: `${subIndex}. ${parts.join(" - ")}`,
          font: FONT_FAMILY,
          size: 26,
        }),
      ],
    }),
  ];
}

/**
 * Helper tạo ô TableCell chuẩn
 */
function createCell(children, width, options = {}) {
  const {
    align = AlignmentType.JUSTIFIED,
    bold = false,
    fontSize = 26, // Mặc định 13pt chuẩn mẫu
    spacingBefore = 40,
    spacingAfter = 40,
    vAlign = VerticalAlign.CENTER,
    borders = tableCellBorders,
  } = options;

  const paragraphs = Array.isArray(children)
    ? children
    : [
        new Paragraph({
          alignment: align,
          spacing: { before: spacingBefore, after: spacingAfter },
          children:
            children !== "" && children !== null && children !== undefined
              ? [
                  new TextRun({
                    text: String(children),
                    font: FONT_FAMILY,
                    size: fontSize,
                    bold,
                  }),
                ]
              : [],
        }),
      ];

  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders,
    verticalAlign: vAlign,
    margins: { top: 40, bottom: 40, left: 100, right: 100 },
    children: paragraphs,
  });
}

/**
 * Hàm chính tạo file Word báo cáo cá nhân giảng viên
 */
async function generateLecturerReport(reportData) {
  const { lecturer, namHoc, sections, grandTotal } = reportData;
  const lecturerName = lecturer.tenNhanVien || "";
  const deptName = formatDepartmentHeader(lecturer);
  const leaderSignName = getDepartmentLeader(lecturer, reportData);

  const namHocFormatted = formatNamHocText(namHoc);
  const isMultiYear =
    reportData.namHocFrom &&
    reportData.namHocTo &&
    reportData.namHocFrom !== reportData.namHocTo;

  const headerPeriodText = isMultiYear
    ? `Kết quả hoạt động khoa học và công nghệ giai đoạn ${namHocFormatted}`
    : `Kết quả hoạt động khoa học và công nghệ năm học ${namHocFormatted}`;
  const titlePeriodText = isMultiYear
    ? `KẾT QUẢ HOẠT ĐỘNG KHOA HỌC VÀ CÔNG NGHỆ GIAI ĐOẠN ${namHocFormatted}`
    : `KẾT QUẢ HOẠT ĐỘNG KHOA HỌC VÀ CÔNG NGHỆ NĂM HỌC ${namHocFormatted}`;

  // Dòng tiêu đề Bảng chính
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      createCell("TT", COL_WIDTHS[0], {
        align: AlignmentType.CENTER,
        bold: true,
        spacingBefore: 60,
        spacingAfter: 60,
      }),
      createCell("Kết quả hoạt động khoa học và công nghệ", COL_WIDTHS[1], {
        align: AlignmentType.CENTER,
        bold: true,
        spacingBefore: 60,
        spacingAfter: 60,
      }),
      createCell("Giờ chuẩn ", COL_WIDTHS[2], {
        align: AlignmentType.CENTER,
        bold: true,
        spacingBefore: 60,
        spacingAfter: 60,
      }),
      createCell("Minh chứng nộp về Viện NCHT", COL_WIDTHS[3], {
        align: AlignmentType.CENTER,
        bold: true,
        spacingBefore: 60,
        spacingAfter: 60,
      }),
      createCell("Ghi chú", COL_WIDTHS[4], {
        align: AlignmentType.CENTER,
        bold: true,
        spacingBefore: 60,
        spacingAfter: 60,
      }),
    ],
  });

  const tableRows = [headerRow];

  // Duyệt qua 8 mục
  sections.forEach((section) => {
    const sectionIndexStr =
      Number(section.index) === 4 ? "4" : `${section.index}.`;

    // 1. Dòng tiêu đề mục (1., 2., 3., 4, 5., 6., 7., 8.)
    tableRows.push(
      new TableRow({
        children: [
          createCell(sectionIndexStr, COL_WIDTHS[0], {
            align: AlignmentType.CENTER,
            bold: true,
          }),
          createCell(section.title, COL_WIDTHS[1], {
            align: AlignmentType.JUSTIFIED,
            bold: true,
          }),
          createCell("", COL_WIDTHS[2], { align: AlignmentType.CENTER }),
          createCell("", COL_WIDTHS[3], { align: AlignmentType.JUSTIFIED }),
          createCell("", COL_WIDTHS[4], { align: AlignmentType.CENTER }),
        ],
      })
    );

    // 2. Các dòng nội dung của mục
    if (section.records && section.records.length > 0) {
      let records = section.records;

      // Riêng Mục 6 (BAIBAO): Sắp xếp các bài báo theo vai trò của giảng viên kê khai:
      // Bài báo là tác giả chính lên đầu, sau đó đến các bài báo không thuộc tác giả chính
      if (section.loaiNckh === "BAIBAO" && records.length > 1) {
        records = [...records].sort((a, b) => {
          const mainA = isLecturerMainAuthor(a, lecturerName) ? 0 : 1;
          const mainB = isLecturerMainAuthor(b, lecturerName) ? 0 : 1;
          if (mainA !== mainB) return mainA - mainB;
          return (a.nckhId || a.id || 0) - (b.nckhId || b.id || 0);
        });
      }

      // Riêng Mục 7 (HUONGDAN): Sắp xếp theo giải thưởng (Giải Nhất -> Giải Nhì -> Giải Ba -> Khuyến khích -> Đạt yêu cầu cấp khoa)
      if (section.loaiNckh === "HUONGDAN" && records.length > 1) {
        records = [...records].sort((a, b) => {
          const rankA = getHuongDanRank(a);
          const rankB = getHuongDanRank(b);
          if (rankA !== rankB) return rankA - rankB;
          return (a.nckhId || a.id || 0) - (b.nckhId || b.id || 0);
        });
      }

      const totalRecs = records.length;

      records.forEach((record, idx) => {
        const subIndex = idx + 1;
        let contentParagraphs = [];

        switch (section.loaiNckh) {
          case "DETAI_DUAN":
            contentParagraphs = buildDeTaiParagraphs(record, subIndex, lecturer);
            break;
          case "SACHGIAOTRINH":
            contentParagraphs = buildSachParagraphs(record, subIndex, totalRecs);
            break;
          case "BAIBAO":
            contentParagraphs = buildBaiBaoParagraphs(record, subIndex, lecturerName);
            break;
          case "HUONGDAN":
            contentParagraphs = buildHuongDanParagraphs(record, subIndex, lecturerName);
            break;
          default:
            contentParagraphs = buildGenericParagraphs(record, subIndex);
            break;
        }

        let minhChung = "";
        if (record.soQuyetDinh) {
          minhChung = `Quyết định ${record.soQuyetDinh}${
            record.ngayQuyetDinh ? ` ngày ${formatDate(record.ngayQuyetDinh)}` : ""
          }`;
        }

        const hoursText = formatHoursNumber(record.soTietGiangVien);

        // Ẩn đường kẻ ngang giữa các công trình trong cùng 1 mục để nhìn liền thành 1 ô như file mẫu
        const rowBorders = {
          top: idx === 0 ? borderThin : borderNone,
          bottom: idx === totalRecs - 1 ? borderThin : borderNone,
          left: borderThin,
          right: borderThin,
        };

        // Gióng số giờ chuẩn ngang với dòng đầu tiên của từng công trình (hoặc căn giữa nếu mục Sách 1 công trình)
        const cellVAlign =
          section.loaiNckh === "SACHGIAOTRINH" && totalRecs === 1
            ? VerticalAlign.CENTER
            : VerticalAlign.TOP;

        tableRows.push(
          new TableRow({
            children: [
              createCell("", COL_WIDTHS[0], {
                align: AlignmentType.CENTER,
                borders: rowBorders,
                vAlign: cellVAlign,
              }),
              createCell(contentParagraphs, COL_WIDTHS[1], {
                align: AlignmentType.JUSTIFIED,
                borders: rowBorders,
                vAlign: cellVAlign,
              }),
              createCell(hoursText, COL_WIDTHS[2], {
                align: AlignmentType.CENTER,
                borders: rowBorders,
                vAlign: cellVAlign,
              }),
              createCell(minhChung, COL_WIDTHS[3], {
                align: AlignmentType.JUSTIFIED,
                borders: rowBorders,
                vAlign: cellVAlign,
              }),
              createCell(record.ghiChu || "", COL_WIDTHS[4], {
                align: AlignmentType.CENTER,
                borders: rowBorders,
                vAlign: cellVAlign,
              }),
            ],
          })
        );
      });
    } else {
      // Nếu mục không có công trình nào, vẫn tạo 1 dòng trống bên dưới đúng theo file mẫu
      tableRows.push(
        new TableRow({
          children: [
            createCell("", COL_WIDTHS[0], { align: AlignmentType.CENTER }),
            createCell("", COL_WIDTHS[1], { align: AlignmentType.JUSTIFIED }),
            createCell("", COL_WIDTHS[2], { align: AlignmentType.CENTER }),
            createCell("", COL_WIDTHS[3], { align: AlignmentType.JUSTIFIED }),
            createCell("", COL_WIDTHS[4], { align: AlignmentType.CENTER }),
          ],
        })
      );
    }
  });

  // Dòng Tổng giờ chuẩn quy đổi
  const grandTotalFormatted = formatHoursNumber(grandTotal) || "0";
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: COL_WIDTHS[0] + COL_WIDTHS[1], type: WidthType.DXA },
          columnSpan: 2,
          borders: tableCellBorders,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 40, bottom: 40, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
              children: [
                new TextRun({
                  text: "Tổng giờ chuẩn quy đổi:",
                  font: FONT_FAMILY,
                  size: 26, // 13pt
                  bold: true,
                }),
              ],
            }),
          ],
        }),
        createCell(grandTotalFormatted, COL_WIDTHS[2], {
          align: AlignmentType.JUSTIFIED,
          bold: true,
        }),
        createCell("", COL_WIDTHS[3], { align: AlignmentType.JUSTIFIED }),
        createCell("", COL_WIDTHS[4], { align: AlignmentType.JUSTIFIED }),
      ],
    })
  );

  const mainTable = new Table({
    width: { size: TOTAL_TABLE_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: noBorders,
    rows: tableRows,
  });

  // Bảng chữ ký cuối trang (3 cột, 2 hàng chuẩn theo mẫu)
  const signatureTable = new Table({
    width: { size: 13825, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 6204, type: WidthType.DXA },
            borders: noBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Cán bộ kê khai",
                    font: FONT_FAMILY,
                    size: 27, // 13.5pt
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "(ký và ghi rõ họ tên)",
                    font: FONT_FAMILY,
                    size: 22, // 11pt
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2376, type: WidthType.DXA },
            borders: noBorders,
            children: [new Paragraph({})],
          }),
          new TableCell({
            width: { size: 5245, type: WidthType.DXA },
            borders: noBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Lãnh đạo đơn vị",
                    font: FONT_FAMILY,
                    size: 27, // 13.5pt
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "(ký và ghi rõ họ tên)",
                    font: FONT_FAMILY,
                    size: 22, // 11pt
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
      new TableRow({
        children: [
          new TableCell({
            width: { size: 6204, type: WidthType.DXA },
            borders: noBorders,
            children: [
              new Paragraph({}),
              new Paragraph({}),
              new Paragraph({}),
              new Paragraph({}),
              new Paragraph({}),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: lecturerName,
                    font: FONT_FAMILY,
                    size: 27, // 13.5pt
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
          new TableCell({
            width: { size: 2376, type: WidthType.DXA },
            borders: noBorders,
            children: [new Paragraph({})],
          }),
          new TableCell({
            width: { size: 5245, type: WidthType.DXA },
            borders: noBorders,
            children: [
              new Paragraph({}),
              new Paragraph({}),
              new Paragraph({}),
              new Paragraph({}),
              new Paragraph({}),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: leaderSignName,
                    font: FONT_FAMILY,
                    size: 27, // 13.5pt
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  // Khởi tạo Document với khổ giấy A4 Ngang (Landscape) và lề chuẩn mẫu
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: 11906, // 21.0 cm (docx tự đảo chiều rộng/cao khi orientation = LANDSCAPE)
              height: 16838, // 29.7 cm
            },
            margin: {
              top: 851, // 1.5 cm
              bottom: 567, // 1.0 cm
              left: 1701, // 3.0 cm
              right: 851, // 1.5 cm
            },
          },
        },
        children: [
          buildHeaderTable(deptName),

          // THỐNG KÊ
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "THỐNG KÊ",
                font: FONT_FAMILY,
                size: 28, // 14pt
                bold: true,
              }),
            ],
          }),
          // Kết quả hoạt động khoa học và công nghệ năm học ...
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: headerPeriodText,
                font: FONT_FAMILY,
                size: 28, // 14pt
                bold: true,
              }),
            ],
          }),
          // Đường kẻ ngang ngắn dưới dòng tiêu đề
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "                           ",
                font: FONT_FAMILY,
                size: 25,
                underline: {},
              }),
            ],
          }),

          // Họ và tên giảng viên
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: "Họ và tên giảng viên: ",
                font: FONT_FAMILY,
                size: 26, // 13pt
              }),
              new TextRun({
                text: lecturerName,
                font: FONT_FAMILY,
                size: 26, // 13pt
                bold: true,
              }),
            ],
          }),

          // KẾT QUẢ HOẠT ĐỘNG KHOA HỌC VÀ CÔNG NGHỆ NĂM HỌC ...
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120 },
            children: [
              new TextRun({
                text: titlePeriodText,
                font: FONT_FAMILY,
                size: 26, // 13pt
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "(Quy đổi nhiệm vụ KH&CN ra giờ chuẩn thực hiện theo Quyết định số: 1267/QĐ-HVM ngày 04/12/2025 của Giám đốc Học viện Kỹ thuật mật mã)",
                font: FONT_FAMILY,
                size: 24, // 12pt
                italics: true,
              }),
            ],
          }),

          // Bảng chính
          mainTable,

          // Khoảng trống trước chữ ký
          new Paragraph({}),

          // Bảng chữ ký
          signatureTable,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

module.exports = { generateLecturerReport };