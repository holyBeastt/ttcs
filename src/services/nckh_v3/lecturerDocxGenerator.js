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
} = require("docx");

const FONT_FAMILY = "Times New Roman";

// Helper: Normalize Vietnamese text for name matching
function normalizeText(str) {
  return String(str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

// Border styles
const borderThin = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const borderNone = { style: BorderStyle.NONE, size: 0, color: "auto" };

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
};

// Column widths in DXA (Total = 9639 twips for A4 portrait with margins)
const COL_WIDTHS = [600, 5239, 1000, 1800, 1000];
const TOTAL_TABLE_WIDTH = COL_WIDTHS.reduce((a, b) => a + b, 0);

// Helper to format date dd/mm/yyyy
function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Build the header section (2-column borderless table):
 * Left: HỌC VIỆN KỸ THUẬT MẬT MÃ / KHOA ...
 * Right: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM / Độc lập – Tự do – Hạnh phúc / Hà Nội, ngày...
 */
function buildHeaderTable(khoaName) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = now.getFullYear();

  const deptUpper = (khoaName || "KHOA CNTT").toUpperCase();

  return new Table({
    width: { size: TOTAL_TABLE_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          // Left cell
          new TableCell({
            width: { size: 4800, type: WidthType.DXA },
            borders: noBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: "HỌC VIỆN KỸ THUẬT MẬT MÃ",
                    font: FONT_FAMILY,
                    size: 24, // 12pt
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: deptUpper,
                    font: FONT_FAMILY,
                    size: 24, // 12pt
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
            ],
          }),
          // Right cell
          new TableCell({
            width: { size: 4839, type: WidthType.DXA },
            borders: noBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
                    font: FONT_FAMILY,
                    size: 24, // 12pt
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 100 },
                children: [
                  new TextRun({
                    text: "Độc lập – Tự do – Hạnh phúc",
                    font: FONT_FAMILY,
                    size: 24, // 12pt
                    bold: true,
                    underline: {},
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: `Hà Nội, ngày ${day} tháng ${month} năm ${year}`,
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
    ],
  });
}

/**
 * Format BAIBAO citation paragraphs with underline for the target lecturer name.
 */
function buildBaiBaoParagraphs(record, subIndex, lecturerName) {
  const normLecturer = normalizeText(lecturerName);

  // If participants are recorded
  let authorsList = [];
  if (record.participants && record.participants.length > 0) {
    authorsList = record.participants.map((p) => p.tenNhanVien || p.tenNgoai || "");
  }

  // Fallback to record.tacGiaChinh / thanhVien if participants array empty
  if (!authorsList.length) {
    const raw = [record.tacGiaChinh, record.thanhVien].filter(Boolean).join(", ");
    authorsList = raw.split(",").map((s) => s.trim()).filter(Boolean);
  }

  // If still empty, use lecturerName
  if (!authorsList.length) {
    authorsList = [lecturerName];
  }

  const runs = [
    new TextRun({
      text: `${subIndex}. `,
      font: FONT_FAMILY,
      size: 22,
    }),
  ];

  // Add author runs, with underline for lecturer
  authorsList.forEach((author, idx) => {
    const isLecturer = normalizeText(author).includes(normLecturer) || normLecturer.includes(normalizeText(author));
    runs.push(
      new TextRun({
        text: author,
        font: FONT_FAMILY,
        size: 22,
        bold: isLecturer,
        underline: isLecturer ? {} : undefined,
      })
    );
    if (idx < authorsList.length - 1) {
      runs.push(new TextRun({ text: ", ", font: FONT_FAMILY, size: 22 }));
    }
  });

  // Title and citation details
  const title = record.tenCongTrinh || "";
  const journal = record.tenTapChi || "";
  const year = record.namHoc ? record.namHoc.split("-")[0] : "";
  const doi = record.maSo ? `Doi: ${record.maSo}` : "";
  const issue = record.soBao ? `, ${record.soBao}` : "";

  let citationTail = "";
  if (journal) citationTail += `, ${journal}`;
  if (year) citationTail += `, ${year}`;
  if (issue) citationTail += `${issue}`;
  if (doi) citationTail += `. ${doi}`;

  runs.push(
    new TextRun({
      text: `, “${title}”`,
      font: FONT_FAMILY,
      size: 22,
    })
  );

  if (citationTail) {
    runs.push(
      new TextRun({
        text: `${citationTail}.`,
        font: FONT_FAMILY,
        size: 22,
      })
    );
  }

  return [
    new Paragraph({
      spacing: { after: 60, line: 260 },
      children: runs,
    }),
  ];
}

/**
 * Format De Tai / Du An paragraphs:
 * 1. [Tên đề tài] (Mã số: ...)
 *    - Chủ nhiệm đề tài: [Học vị] [Tên chủ nhiệm]
 *    - Tổng số thành viên: [count]
 *    - Cấp thực hiện: [cấp]
 *    - Năm thực hiện: [năm]
 */
function buildDeTaiParagraphs(record, subIndex) {
  const runsTitle = [
    new TextRun({
      text: `${subIndex}. ${record.tenCongTrinh || ""}${record.maSo ? ` (Mã số: ${record.maSo})` : ""}`,
      font: FONT_FAMILY,
      size: 22,
      bold: true,
    }),
  ];

  // Find leader (vai_tro === 'tac_gia' or 'chu_nhiem')
  let leader = null;
  if (record.participants && record.participants.length > 0) {
    leader = record.participants.find((p) =>
      ["tac_gia", "chu_nhiem", "tac_gia_chinh"].includes(String(p.vaiTro || "").toLowerCase())
    ) || record.participants[0];
  }

  const leaderName = leader ? (leader.tenNhanVien || leader.tenNgoai || "") : "";
  const totalMembers = record.participants ? String(record.participants.length).padStart(2, "0") : "01";
  const cap = record.capNhiemVu || record.phanLoai || "Cơ sở";
  const nam = record.namHoc ? record.namHoc.split("-")[0] : "";

  return [
    new Paragraph({
      spacing: { after: 40, line: 260 },
      children: runsTitle,
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 30, line: 240 },
      children: [
        new TextRun({
          text: `- Chủ nhiệm đề tài: ${leaderName}`,
          font: FONT_FAMILY,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 30, line: 240 },
      children: [
        new TextRun({
          text: `- Tổng số thành viên: ${totalMembers}`,
          font: FONT_FAMILY,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 30, line: 240 },
      children: [
        new TextRun({
          text: `- Cấp thực hiện: ${cap}`,
          font: FONT_FAMILY,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 60, line: 240 },
      children: [
        new TextRun({
          text: `- Năm thực hiện: ${nam}`,
          font: FONT_FAMILY,
          size: 22,
        }),
      ],
    }),
  ];
}

/**
 * Format Sach / Giao trinh:
 * Giáo trình: ...
 * Loại sách: ...
 * Năm xuất bản: ...
 * Vai trò: ...
 * Nhóm tác giả: ...
 */
function buildSachParagraphs(record, subIndex) {
  const authors = record.participants
    ? record.participants.map((p) => p.tenNhanVien || p.tenNgoai).filter(Boolean).join(", ")
    : "";
  const role = record.vaiTroGiangVien || "Chủ biên";
  const year = record.namHoc ? record.namHoc.split("-")[0] : "";

  return [
    new Paragraph({
      spacing: { after: 40, line: 260 },
      children: [
        new TextRun({
          text: `${subIndex > 1 ? `${subIndex}. ` : ""}Giáo trình/Sách: ${record.tenCongTrinh || ""}`,
          font: FONT_FAMILY,
          size: 22,
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 30, line: 240 },
      children: [
        new TextRun({
          text: `Loại sách: ${record.phanLoai || "Bài giảng"}`,
          font: FONT_FAMILY,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 30, line: 240 },
      children: [
        new TextRun({
          text: `Năm xuất bản: ${year}`,
          font: FONT_FAMILY,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 30, line: 240 },
      children: [
        new TextRun({
          text: `Vai trò: ${role}`,
          font: FONT_FAMILY,
          size: 22,
        }),
      ],
    }),
    new Paragraph({
      indent: { left: 360 },
      spacing: { after: 60, line: 240 },
      children: [
        new TextRun({
          text: `Nhóm tác giả: ${authors}`,
          font: FONT_FAMILY,
          size: 22,
        }),
      ],
    }),
  ];
}

/**
 * Format Huong dan SV NCKH:
 * 1. Là [đồng hướng dẫn / hướng dẫn chính] đề tài NCKH của HVSV năm học [năm] "[Tên đề tài]", số cán bộ hướng dẫn: [số], kết quả: [kết quả].
 */
function buildHuongDanParagraphs(record, subIndex) {
  const count = record.participants ? String(record.participants.length).padStart(2, "0") : "02";
  const roleDesc = record.vaiTroGiangVien ? record.vaiTroGiangVien.toLowerCase() : "đồng hướng dẫn";
  const roleText = roleDesc.includes("chinh") ? "hướng dẫn chính" : "đồng hướng dẫn";
  const xepLoai = record.xepLoai ? `đề tài đạt ${record.xepLoai}` : "đạt yêu cầu";

  return [
    new Paragraph({
      spacing: { after: 60, line: 260 },
      children: [
        new TextRun({
          text: `${subIndex}. Là ${roleText} đề tài NCKH của HVSV năm học ${record.namHoc || ""} “${record.tenCongTrinh || ""}”, số cán bộ hướng dẫn: ${count}, kết quả: ${xepLoai}.`,
          font: FONT_FAMILY,
          size: 22,
        }),
      ],
    }),
  ];
}

/**
 * Generic paragraph for SANGKIEN, GIAITHUONG, DEXUAT, HOIDONG
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
      spacing: { after: 60, line: 260 },
      children: [
        new TextRun({
          text: `${subIndex}. ${parts.join(" - ")}`,
          font: FONT_FAMILY,
          size: 22,
        }),
      ],
    }),
  ];
}

/**
 * Helper to build cell
 */
function createCell(children, width, align = AlignmentType.LEFT, bold = false) {
  const paragraphs = Array.isArray(children)
    ? children
    : [
        new Paragraph({
          alignment: align,
          children: [
            new TextRun({
              text: String(children ?? ""),
              font: FONT_FAMILY,
              size: 22,
              bold,
            }),
          ],
        }),
      ];

  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: tableCellBorders,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children: paragraphs,
  });
}

/**
 * Main Document Generator Function
 *
 * @param {Object} reportData - output from lecturerReport.service.js
 * @returns {Promise<Buffer>}
 */
async function generateLecturerReport(reportData) {
  const { lecturer, namHoc, sections, grandTotal } = reportData;
  const lecturerName = lecturer.tenNhanVien || "";
  const deptName = lecturer.tenPhongBan || lecturer.maPhongBan || "KHOA CNTT";

  // Table Header Row
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      createCell("TT", COL_WIDTHS[0], AlignmentType.CENTER, true),
      createCell("Kết quả hoạt động khoa học và công nghệ", COL_WIDTHS[1], AlignmentType.CENTER, true),
      createCell("Giờ chuẩn", COL_WIDTHS[2], AlignmentType.CENTER, true),
      createCell("Minh chứng nộp về Viện NCHT", COL_WIDTHS[3], AlignmentType.CENTER, true),
      createCell("Ghi chú", COL_WIDTHS[4], AlignmentType.CENTER, true),
    ],
  });

  const tableRows = [headerRow];

  // Process 8 sections
  sections.forEach((section) => {
    // 1. Section title row
    tableRows.push(
      new TableRow({
        children: [
          createCell(`${section.index}.`, COL_WIDTHS[0], AlignmentType.CENTER, true),
          createCell(section.title, COL_WIDTHS[1], AlignmentType.LEFT, true),
          createCell("", COL_WIDTHS[2], AlignmentType.CENTER),
          createCell("", COL_WIDTHS[3], AlignmentType.CENTER),
          createCell("", COL_WIDTHS[4], AlignmentType.CENTER),
        ],
      })
    );

    // 2. Records within section
    if (section.records && section.records.length > 0) {
      section.records.forEach((record, idx) => {
        const subIndex = idx + 1;
        let contentParagraphs = [];

        switch (section.loaiNckh) {
          case "DETAI_DUAN":
            contentParagraphs = buildDeTaiParagraphs(record, subIndex);
            break;
          case "SACHGIAOTRINH":
            contentParagraphs = buildSachParagraphs(record, subIndex);
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

        // Minh chứng text
        let minhChung = "";
        if (record.soQuyetDinh) {
          minhChung = `Quyết định ${record.soQuyetDinh}${record.ngayQuyetDinh ? ` ngày ${formatDate(record.ngayQuyetDinh)}` : ""}`;
        }

        const hoursText = record.soTietGiangVien ? String(Number(record.soTietGiangVien.toFixed(2))) : "";

        tableRows.push(
          new TableRow({
            children: [
              createCell("", COL_WIDTHS[0], AlignmentType.CENTER),
              createCell(contentParagraphs, COL_WIDTHS[1], AlignmentType.LEFT),
              createCell(hoursText, COL_WIDTHS[2], AlignmentType.CENTER),
              createCell(minhChung, COL_WIDTHS[3], AlignmentType.LEFT),
              createCell("", COL_WIDTHS[4], AlignmentType.CENTER),
            ],
          })
        );
      });
    }
  });

  // Total Row
  const grandTotalFormatted = Number(grandTotal || 0).toFixed(2).replace(/\.00$/, "");
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: COL_WIDTHS[0] + COL_WIDTHS[1], type: WidthType.DXA },
          columnSpan: 2,
          borders: tableCellBorders,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: "Tổng giờ chuẩn quy đổi:",
                  font: FONT_FAMILY,
                  size: 24,
                  bold: true,
                }),
              ],
            }),
          ],
        }),
        createCell(grandTotalFormatted, COL_WIDTHS[2], AlignmentType.CENTER, true),
        createCell("", COL_WIDTHS[3], AlignmentType.CENTER),
        createCell("", COL_WIDTHS[4], AlignmentType.CENTER),
      ],
    })
  );

  const mainTable = new Table({
    width: { size: TOTAL_TABLE_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    rows: tableRows,
  });

  // Signature Table (2 columns, borderless)
  const signatureTable = new Table({
    width: { size: TOTAL_TABLE_WIDTH, type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          // Cán bộ kê khai
          new TableCell({
            width: { size: 4800, type: WidthType.DXA },
            borders: noBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 40 },
                children: [
                  new TextRun({
                    text: "Cán bộ kê khai",
                    font: FONT_FAMILY,
                    size: 24,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 1200 }, // blank space for signature (~4-5 lines)
                children: [
                  new TextRun({
                    text: "(ký và ghi rõ họ tên)",
                    font: FONT_FAMILY,
                    size: 22,
                    italics: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: lecturerName,
                    font: FONT_FAMILY,
                    size: 24,
                    bold: true,
                  }),
                ],
              }),
            ],
          }),
          // Lãnh đạo đơn vị
          new TableCell({
            width: { size: 4839, type: WidthType.DXA },
            borders: noBorders,
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 240, after: 40 },
                children: [
                  new TextRun({
                    text: "Lãnh đạo đơn vị",
                    font: FONT_FAMILY,
                    size: 24,
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 1200 }, // blank space for signature
                children: [
                  new TextRun({
                    text: "(ký và ghi rõ họ tên)",
                    font: FONT_FAMILY,
                    size: 22,
                    italics: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
                children: [
                  new TextRun({
                    text: "", // Để trống hoặc điền tên trưởng khoa khi ký
                    font: FONT_FAMILY,
                    size: 24,
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

  // Assemble full Document
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134, // 2cm
              bottom: 1134, // 2cm
              left: 1417, // 2.5cm
              right: 850, // 1.5cm
            },
          },
        },
        children: [
          buildHeaderTable(deptName),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 280, after: 80 },
            children: [
              new TextRun({
                text: "THỐNG KÊ",
                font: FONT_FAMILY,
                size: 28, // 14pt
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `Kết quả hoạt động khoa học và công nghệ năm học ${namHoc}`,
                font: FONT_FAMILY,
                size: 26, // 13pt
                bold: true,
              }),
            ],
          }),

          // Lecturer name
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Họ và tên giảng viên: ",
                font: FONT_FAMILY,
                size: 24,
              }),
              new TextRun({
                text: lecturerName,
                font: FONT_FAMILY,
                size: 24,
                bold: true,
              }),
            ],
          }),

          // Subtitle
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: `KẾT QUẢ HOẠT ĐỘNG KHOA HỌC VÀ CÔNG NGHỆ NĂM HỌC ${namHoc}`,
                font: FONT_FAMILY,
                size: 24,
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: "(Quy đổi nhiệm vụ KH&CN ra giờ chuẩn thực hiện theo Quyết định số: 1267/QĐ-HVM ngày 04/12/2025 của Giám đốc Học viện Kỹ thuật mật mã)",
                font: FONT_FAMILY,
                size: 22,
                italics: true,
              }),
            ],
          }),

          // Main Table
          mainTable,

          // Spacing before signature
          new Paragraph({ spacing: { before: 180 } }),

          // Signature Block
          signatureTable,
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

module.exports = { generateLecturerReport };
