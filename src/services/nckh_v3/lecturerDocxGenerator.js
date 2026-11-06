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

/**
 * Mục 1: Đề tài, dự án
 * Mẫu:
 * 1. Nghiên cứu, thử nghiệm... (Mã số: 10/2025/CS) [không in đậm]
 *    \t- Chủ nhiệm đề tài: TS. Lê Đức Thuận
 *    \t- Tổng số thành viên: 03
 *    \t- Cấp thực hiện: Cơ sở
 *    \t- Năm thực hiện: 2025
 */
function buildDeTaiParagraphs(record, subIndex) {
  let leader = null;
  if (record.participants && record.participants.length > 0) {
    leader =
      record.participants.find((p) =>
        ["tac_gia", "chu_nhiem", "tac_gia_chinh", "chu_tri"].includes(
          String(p.vaiTro || "").toLowerCase()
        )
      ) || record.participants[0];
  }

  let leaderName = leader ? leader.tenNhanVien || leader.tenNgoai || "" : record.tacGiaChinh || "";
  const leaderHocVi = leader && leader.hocVi ? String(leader.hocVi).trim() : "";
  if (leaderHocVi && leaderName && !leaderName.toLowerCase().startsWith(leaderHocVi.toLowerCase())) {
    leaderName = `${leaderHocVi} ${leaderName}`;
  }

  const totalMembers = record.participants && record.participants.length > 0
    ? String(record.participants.length).padStart(2, "0")
    : "01";
  const cap = record.capNhiemVu || record.phanLoai || "Cơ sở";
  const nam = record.namHoc ? String(record.namHoc).split("-")[0].trim() : "";

  const lines = [
    `${subIndex}. ${record.tenCongTrinh || ""}${record.maSo ? ` (Mã số: ${record.maSo})` : ""}`,
    `\t- Chủ nhiệm đề tài: ${leaderName}`,
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

/**
 * Mục 6: Bài báo, ấn phẩm khoa học
 * Tên tác giả chuyển sang không dấu, tên giảng viên kê khai in đậm & gạch chân
 */
function buildBaiBaoParagraphs(record, subIndex, lecturerName) {
  const normLecturer = normalizeText(lecturerName);

  let authorsList = [];
  if (record.participants && record.participants.length > 0) {
    authorsList = record.participants
      .map((p) => p.tenNhanVien || p.tenNgoai || "")
      .filter(Boolean);
  }

  if (!authorsList.length) {
    const raw = [record.tacGiaChinh, record.thanhVien].filter(Boolean).join(", ");
    authorsList = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
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
        bold: isLecturer,
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
 * Mục 7: Hướng dẫn sinh viên nghiên cứu khoa học
 * Mẫu:
 * 1. Là đồng hướng dẫn đề tài NCKH của HVSV năm học 2025 – 2026 “...”, số cán bộ hướng dẫn: 02, kết quả: đề tài đạt giải Nhất. (chữ "Nhất" / "Nhì" / "đạt yêu cầu cấp khoa" in đậm)
 */
function buildHuongDanParagraphs(record, subIndex) {
  const count =
    record.participants && record.participants.length > 0
      ? String(record.participants.length).padStart(2, "0")
      : "02";

  const roleDesc = String(record.vaiTroGiangVien || "").toLowerCase();
  const roleText =
    roleDesc.includes("chinh") || roleDesc.includes("chính") || roleDesc.includes("tac_gia")
      ? "hướng dẫn chính"
      : "đồng hướng dẫn";

  const namHocFormatted = formatNamHocText(record.namHoc || "");
  const rawXepLoai = String(record.xepLoai || record.phanLoai || "đạt yêu cầu cấp khoa").trim();

  // Tách phần chữ thường và phần chữ in đậm ở kết quả cuối câu
  let resultPrefix = "đề tài ";
  let resultBold = rawXepLoai;

  const lowerXepLoai = rawXepLoai.toLowerCase();
  if (lowerXepLoai.startsWith("đề tài đạt giải ")) {
    resultPrefix = "đề tài đạt giải ";
    resultBold = rawXepLoai.slice("đề tài đạt giải ".length);
  } else if (lowerXepLoai.startsWith("đạt giải ")) {
    resultPrefix = "đề tài đạt giải ";
    resultBold = rawXepLoai.slice("đạt giải ".length);
  } else if (lowerXepLoai.startsWith("giải ")) {
    resultPrefix = "đề tài đạt giải ";
    resultBold = rawXepLoai.slice("giải ".length);
  } else if (["nhất", "nhì", "ba", "khuyến khích"].includes(lowerXepLoai)) {
    resultPrefix = "đề tài đạt giải ";
    resultBold = rawXepLoai;
  } else if (lowerXepLoai.startsWith("đề tài ")) {
    resultPrefix = "đề tài ";
    resultBold = rawXepLoai.slice("đề tài ".length);
  } else if (!lowerXepLoai.startsWith("đạt")) {
    resultPrefix = "đề tài đạt ";
    resultBold = rawXepLoai;
  }

  return [
    new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { before: 40, after: 40 },
      children: [
        new TextRun({
          text: `${subIndex}. Là ${roleText} đề tài NCKH của HVSV năm học ${namHocFormatted} “${record.tenCongTrinh || ""}”, số cán bộ hướng dẫn: ${count}, kết quả: ${resultPrefix}`,
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
  const deptName = lecturer.tenPhongBan || lecturer.maPhongBan || "KHOA CNTT";
  const leaderSignName =
    reportData.lanhDaoDonVi ||
    lecturer.lanhDaoDonVi ||
    (normalizeText(deptName).includes("cntt") || normalizeText(deptName).includes("cong nghe thong tin")
      ? "Phạm Văn Hưởng"
      : "");

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
      const totalRecs = section.records.length;

      section.records.forEach((record, idx) => {
        const subIndex = idx + 1;
        let contentParagraphs = [];

        switch (section.loaiNckh) {
          case "DETAI_DUAN":
            contentParagraphs = buildDeTaiParagraphs(record, subIndex);
            break;
          case "SACHGIAOTRINH":
            contentParagraphs = buildSachParagraphs(record, subIndex, totalRecs);
            break;
          case "BAIBAO":
            contentParagraphs = buildBaiBaoParagraphs(record, subIndex, lecturerName);
            break;
          case "HUONGDAN":
            contentParagraphs = buildHuongDanParagraphs(record, subIndex);
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