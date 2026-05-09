const { ExcelJS, BORDERS, COLOR, mergeAndStyle, richText, styleCell, cellAddr, sumFormula } = require("./excel-style.utils");
const { EXCEL_GLOBAL_BLOCKS_LAYOUT } = require("./excel-global-layout.config");
const { renderBlockGroups } = require("./excel-block.renderer");
const {
  columnsA1, columnsA2, columnsB, columnsC,
  columnsD1, columnsD2, columnsD3, columnsD4,
  columnsD5, columnsD6, columnsD7, columnsD8, columnsD9,
} = require("./excel-columns.constants");
const {
  filterA1, mapA1Row, filterA2, mapA2Row,
  filterB, bFilterMatMa, bFilterDongHP, mapBRow,
  filterC, cFilterMatMa, cFilterDongHP, mapCRow,
  filterD, mapDRow, ensureRows, numberRows, toNum,
} = require("./sdo-data.helpers");

// ═══════════════════════════════════════════════════════════════════════════════
// Header
// ═══════════════════════════════════════════════════════════════════════════════

const buildHeader = (summary) => ({
  leftTop: "HỌC VIỆN KỸ THUẬT MẬT MÃ",
  leftSub: `KHOA: ${summary?.khoa || summary?.maKhoa || ""}`,
  rightTop: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
  rightSub: "Độc lập - Tự do - Hạnh phúc",
  dateLine: `Hà Nội, ngày ...... tháng ...... năm ${new Date().getFullYear()}`,
  title: "KÊ KHAI",
  subtitle: `Khối lượng thực hiện nhiệm vụ đào tạo, khoa học và công nghệ năm học ${summary?.nam_hoc || summary?.namHoc || ""}`,
  legalNote:
    "(Căn cứ theo QĐ 1267/QĐ-HVM ngày 04 tháng 12 năm 2025 về việc ban hành Quy định mức giờ chuẩn giảng dạy và nghiên cứu khoa học đối với nhà giáo và trợ lý nghiên cứu tại Học viện Kỹ thuật mật mã)",
  personalFields: [
    { label: "Họ và tên:", value: summary?.giangVien || "" },
    { label: "Ngày sinh:", value: summary?.ngaySinh || "" },
    { label: "Học hàm/ Học vị:", value: summary?.hocVi || "", fullWidth: true },
    { label: "Chức vụ hiện nay (Đảng, CQ, đoàn thể):", value: summary?.chucVu || "", fullWidth: true },
    { label: "Hệ số lương:", value: summary?.hsl ? String(summary.hsl) : "", fullWidth: true, highlightValue: true },
    { label: "Thu nhập (lương thực nhận, không tính phụ cấp học hàm, học vị):", value: "", fullWidth: true },
  ],
  totalCols: EXCEL_GLOBAL_BLOCKS_LAYOUT.totalCols,
});

// ═══════════════════════════════════════════════════════════════════════════════
// Section builders (A → D) — directly from SDO
// ═══════════════════════════════════════════════════════════════════════════════

const buildSectionFromFilter = (data, mapFn, label, annotation, subtotalLabel, opts = {}) => ({
  label,
  annotation: annotation || undefined,
  subtotalLabel,
  subtotalColIndexes: opts.subtotalColIndexes,
  rows: ensureRows(numberRows(data.map(mapFn))),
});

const buildAGroup = (summary) => ({
  title: { label: "GIẢNG DẠY VÀ ĐÁNH GIÁ HỌC PHẦN (không thống kê số giờ đã được thanh toán)" },
  disableTitlePrefix: true,
  blocks: [
    {
      title: { label: "Giảng dạy" },
      columns: columnsA1(),
      sections: [
        buildSectionFromFilter(filterA1(summary, 1, true), mapA1Row, "Học kỳ I - Đào tạo chuyên ngành Kỹ thuật mật mã", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (1):"),
        buildSectionFromFilter(filterA1(summary, 1, false), mapA1Row, "Học kỳ I - Đào tạo hệ đóng học phí", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (2):"),
        buildSectionFromFilter(filterA1(summary, 2, true), mapA1Row, "Học kỳ II - Đào tạo chuyên ngành Kỹ thuật mật mã", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (3):"),
        buildSectionFromFilter(filterA1(summary, 2, false), mapA1Row, "Học kỳ II - Đào tạo hệ đóng học phí", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (4):"),
      ],
      finalTotal: { label: "Tổng A.1= (1) + (2) + (3) + (4)", colIndexes: [5, 6] },
    },
    {
      title: { label: "Đánh giá kết thúc học phần (theo tổng hợp của phòng Khảo thí và đảm bảo chất lượng)" },
      columns: columnsA2(),
      sections: [
        buildSectionFromFilter(filterA2(summary, 1, true), mapA2Row, "Học kỳ I - Đào tạo chuyên ngành Kỹ thuật mật mã", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (5):", { subtotalColIndexes: [6] }),
        buildSectionFromFilter(filterA2(summary, 1, false), mapA2Row, "Học kỳ I - Đào tạo hệ đóng học phí", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (6):", { subtotalColIndexes: [6] }),
        buildSectionFromFilter(filterA2(summary, 2, true), mapA2Row, "Học kỳ II - Đào tạo chuyên ngành Kỹ thuật mật mã", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (7):", { subtotalColIndexes: [6] }),
        buildSectionFromFilter(filterA2(summary, 2, false), mapA2Row, "Học kỳ II - Đào tạo hệ đóng học phí", "(ghi rõ đối tượng cho từng lớp)", "Tổng cộng (8):", { subtotalColIndexes: [6] }),
      ],
      finalTotal: { label: "Tổng A.2= (5) + (6) + (7) + (8)", colIndexes: [6] },
    },
  ],
  finalTotal: { label: "TỔNG A = A.1 + A.2", colIndexes: [6] },
});

const buildBGroup = (summary) => {
  const makeBlock = (title, filterFn, subtotalLabel) => ({
    title: { label: title },
    disableTitlePrefix: true,
    columns: columnsB(),
    sections: [{ label: "", subtotalLabel, rows: ensureRows(numberRows(filterB(summary, filterFn).map(mapBRow))) }],
  });
  return {
    title: { label: "HƯỚNG DẪN LUẬN ÁN, LUẬN VĂN, ĐỒ ÁN TỐT NGHIỆP" },
    blocks: [
      makeBlock("B.1. Hướng dẫn cho sinh viên Mật mã đối tượng Việt Nam", bFilterMatMa("viet_nam"), "TỔNG B.1:"),
      makeBlock("B.2. Hướng dẫn cho sinh viên Mật mã đối tượng Lào", bFilterMatMa("lao"), "TỔNG B.2:"),
      makeBlock("B.3. Hướng dẫn cho sinh viên Mật mã đối tượng Cuba", bFilterMatMa("cuba"), "TỔNG B.3:"),
      makeBlock("B.4. Hướng dẫn cho sinh viên Mật mã đối tượng Campuchia", bFilterMatMa("campuchia"), "TỔNG B.4:"),
      makeBlock("B.5. Hướng dẫn cho sinh viên hệ đóng học phí", bFilterDongHP, "TỔNG B.5:"),
    ],
    finalTotal: { label: "TỔNG B = B.1 + B.2 + B.3 + B.4 + B.5", colIndexes: [6] },
  };
};

const buildCGroup = (summary) => {
  const makeBlock = (title, filterFn, subtotalLabel) => ({
    title: { label: title },
    disableTitlePrefix: true,
    columns: columnsC(),
    sections: [{ label: "", subtotalLabel, rows: ensureRows(numberRows(filterC(summary, filterFn).map(mapCRow))) }],
  });
  return {
    title: { label: "HƯỚNG DẪN THAM QUAN THỰC TẾ CỦA HỌC VIÊN, SINH VIÊN" },
    blocks: [
      makeBlock("C.1. Hướng dẫn cho sinh viên Mật mã đối tượng Việt Nam", cFilterMatMa("viet_nam"), "TỔNG C.1:"),
      makeBlock("C.2. Hướng dẫn cho sinh viên Mật mã đối tượng Lào", cFilterMatMa("lao"), "TỔNG C.2:"),
      makeBlock("C.3. Hướng dẫn cho sinh viên Mật mã đối tượng Cuba", cFilterMatMa("cuba"), "TỔNG C.3:"),
      makeBlock("C.4. Hướng dẫn cho sinh viên Mật mã đối tượng Campuchia", cFilterMatMa("campuchia"), "TỔNG C.4:"),
      makeBlock("C.5. Hướng dẫn cho sinh viên Đóng học phí", cFilterDongHP, "TỔNG C.5:"),
    ],
    finalTotal: { label: "TỔNG C = C.1 + C.2 + C.3 + C.4 + C.5", colIndexes: [6] },
  };
};

const buildDGroup = (summary) => {
  const makeBlock = (title, bucketKey, colsFn) => ({
    title: { label: title },
    disableTitlePrefix: true,
    columns: colsFn(),
    sections: [{
      label: "",
      subtotalLabel: `Tổng ${bucketKey}:`,
      rows: ensureRows(numberRows(filterD(summary, bucketKey).map((r) => mapDRow(bucketKey, r)))),
    }],
  });
  return {
    title: { label: "NGHIÊN CỨU KHOA HỌC" },
    blocks: [
      makeBlock("D.1 Đề tài, dự án", "D1", columnsD1),
      makeBlock("D.2 Sáng kiến", "D2", columnsD2),
      makeBlock("D.3 Giải thưởng khoa học và công nghệ; Bằng sáng chế, giải pháp hữu ích", "D3", columnsD3),
      makeBlock("D.4 Đề xuất nghiên cứu (theo đúng mẫu đề xuất quy định)", "D4", columnsD4),
      makeBlock("D.5 Sách, giáo trình, tài liệu dạy học, tài liệu huấn luyện, điều lệ, điều lệnh", "D5", columnsD5),
      makeBlock("D.6 Bài báo, báo cáo khoa học", "D6", columnsD6),
      makeBlock("D.7 Hướng dẫn học viên, sinh viên NCKH do GĐ Học viện phê duyệt", "D7", columnsD7),
      makeBlock("D.8 Thành viên hội đồng khoa học các cấp", "D8", columnsD8),
      makeBlock("D.9 Các nhiệm vụ khoa học và công nghệ khác", "D9", columnsD9),
    ],
    finalTotal: { label: "Tổng D = D.1+D.2+D.3+D.4+D.5+D.6+D.7+D.8+D.9", colIndexes: [5, 6] },
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// Section E: Summary (formula-based)
// ═══════════════════════════════════════════════════════════════════════════════

const renderSummarySectionE = (sheet, startRow, summary) => {
  let row = startRow;

  mergeAndStyle(sheet, row, 1, row, 7, "E. TỔNG HỢP KHỐI LƯỢNG ĐÃ THỰC HIỆN VÀ ĐỀ NGHỊ THANH TOÁN VƯỢT GIỜ", {
    bold: true, hAlign: "left", borders: BORDERS.noBorder(), fontSize: 12,
  });
  row += 1;

  // Header row
  styleCell(sheet.getCell(row, 1), { bgColor: COLOR.HEADER_BG, bold: true, hAlign: "center" });
  sheet.getCell(row, 1).value = "TT";
  mergeAndStyle(sheet, row, 2, row, 4, "Nội dung công việc", { bgColor: COLOR.HEADER_BG, bold: true, hAlign: "center", wrapText: true });
  styleCell(sheet.getCell(row, 5), { bgColor: COLOR.HEADER_BG, bold: true, hAlign: "center" });
  sheet.getCell(row, 5).value = "Số tiết";
  mergeAndStyle(sheet, row, 6, row, 7, "Lý do giảm trừ tại mục IV", { bgColor: COLOR.HEADER_BG, bold: true, hAlign: "center", wrapText: true });
  row += 1;

  // Use pre-calculated values from SDO (tableE)
  const E = summary.tableE || {};
  const rows = [
    { tt: "I", label: "Tổng số tiết thực hiện (A+B+C)", value: E.i || 0 },
    { tt: "II", label: "Số tiết định mức phải giảng", value: E.ii || 0 },
    { tt: "III", label: "Số tiết chưa hoàn thành NCKH", value: E.iii || 0 },
    { tt: "IV", label: "Số tiết được giảm trừ (theo lý do giảm trừ)", value: E.iv || 0 },
    { tt: "V", label: "Tổng số tiết vượt giờ (I - II - III + IV)", value: E.v || 0 },
    { tt: "VI", label: "Tổng số tiết vượt giờ đề nghị thanh toán", value: E.vi || 0 },
  ];

  rows.forEach((item) => {
    sheet.getCell(row, 1).value = item.tt;
    styleCell(sheet.getCell(row, 1), { hAlign: "center" });
    mergeAndStyle(sheet, row, 2, row, 4, item.label, { hAlign: "left" });
    sheet.getCell(row, 5).value = item.value;
    sheet.getCell(row, 5).numFmt = "#,##0.00";
    styleCell(sheet.getCell(row, 5), { hAlign: "center", fontColor: COLOR.BLUE, bold: true });
    mergeAndStyle(sheet, row, 6, row, 7, item.tt === "IV" ? (E.ly_do || "") : "", { hAlign: "left" });
    row += 1;
  });

  return row;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Section F: Stats table
// ═══════════════════════════════════════════════════════════════════════════════

const renderStatsTableF = (sheet, startRow, summary, useFormulas) => {
  let row = startRow;
  const tableF = summary.tableF || { rows: [], totals: {} };

  mergeAndStyle(sheet, row, 1, row, 7, "F. TỔNG SỐ TIẾT THỐNG KÊ THEO TỪNG HỆ ĐÀO TẠO", {
    bold: true, hAlign: "left", borders: BORDERS.noBorder(), fontSize: 12,
  });
  row += 1;

  const headers = ["TT", "Đối tượng", "Số tiết thực hiện HK 1", "Số tiết thực hiện HK 2", "Hướng dẫn ĐATN", "Tham quan thực tế", "Tổng số tiết cả năm"];
  headers.forEach((label, index) => {
    const cell = sheet.getCell(row, 1 + index);
    cell.value = label;
    styleCell(cell, { bgColor: COLOR.STATS_HEADER_BG, bold: true, hAlign: "center", wrapText: true });
  });
  row += 1;

  const dataStartRow = row;
  (tableF.rows || []).forEach((item) => {
    sheet.getCell(row, 1).value = item.tt;
    styleCell(sheet.getCell(row, 1), { hAlign: "center" });
    sheet.getCell(row, 2).value = item.doi_tuong || "";
    styleCell(sheet.getCell(row, 2), { hAlign: "left" });
    sheet.getCell(row, 3).value = item.hk1 || 0;
    sheet.getCell(row, 4).value = item.hk2 || 0;
    sheet.getCell(row, 5).value = item.do_an || 0;
    sheet.getCell(row, 6).value = item.tham_quan || 0;
    sheet.getCell(row, 7).value = item.tong || 0;
    for (let col = 3; col <= 7; col += 1) {
      sheet.getCell(row, col).numFmt = "#,##0.00";
      styleCell(sheet.getCell(row, col), { hAlign: "center" });
    }
    row += 1;
  });

  // Totals row
  mergeAndStyle(sheet, row, 1, row, 2, "Tổng:", { bold: true, hAlign: "center" });
  [3, 4, 5, 6, 7].forEach((col, index) => {
    const cell = sheet.getCell(row, col);
    if (useFormulas && dataStartRow < row) {
      const letter = String.fromCharCode(64 + col);
      cell.value = { formula: `SUM(${letter}${dataStartRow}:${letter}${row - 1})` };
    } else {
      const vals = [tableF.totals?.hk1, tableF.totals?.hk2, tableF.totals?.do_an, tableF.totals?.tham_quan, tableF.totals?.tong];
      cell.value = vals[index] || 0;
    }
    cell.numFmt = "#,##0.00";
    styleCell(cell, { bold: true, hAlign: "center" });
  });
  row += 1;

  return row;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Signatures
// ═══════════════════════════════════════════════════════════════════════════════

const renderSignatures = (sheet, startRow, summary) => {
  let row = startRow + 1;

  const signatures = [
    { title: "CHỦ NHIỆM KHOA", subtitle: "(ký, ghi rõ họ tên)", name: "", colStart: 1, colEnd: 3 },
    { title: "NGƯỜI KÊ KHAI", subtitle: "(ký, ghi rõ họ tên)", name: summary?.giangVien || "", colStart: 5, colEnd: 7 },
  ];

  signatures.forEach((sig) => {
    mergeAndStyle(sheet, row, sig.colStart, row, sig.colEnd, sig.title, {
      bold: true, hAlign: "center", borders: BORDERS.noBorder(),
    });
  });
  row += 1;

  signatures.forEach((sig) => {
    if (sig.subtitle) {
      mergeAndStyle(sheet, row, sig.colStart, row, sig.colEnd, sig.subtitle, {
        italic: true, hAlign: "center", borders: BORDERS.noBorder(),
      });
    }
  });
  row += 4;

  signatures.forEach((sig) => {
    if (sig.name) {
      mergeAndStyle(sheet, row, sig.colStart, row, sig.colEnd, sig.name, {
        bold: true, hAlign: "center", borders: BORDERS.noBorder(),
      });
    }
  });

  return row + 1;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main: render worksheet
// ═══════════════════════════════════════════════════════════════════════════════

const renderKeKhaiWorksheet = (workbook, summary, sheetName, renderOptions = {}) => {
  const header = buildHeader(summary);
  const groups = [buildAGroup(summary), buildBGroup(summary), buildCGroup(summary), buildDGroup(summary)];

  const sheet = workbook.addWorksheet(sheetName, {
    pageSetup: { orientation: "portrait", paperSize: 9, fitToPage: true, fitToWidth: 1 },
  });

  const headerRow = require("./excel-header.renderer").renderDocumentHeader(sheet, header, 1, 1);
  let nextRow = headerRow + 1;

  const renderOpts = {
    ...renderOptions,
    codeSeparator: ". ",
    sectionNumbering: false,
    sectionSubtotalGap: 1,
  };

  // Render groups A, B, C
  const abcResults = renderBlockGroups(sheet, groups.slice(0, 3), nextRow, 1, 0, EXCEL_GLOBAL_BLOCKS_LAYOUT, renderOpts);
  if (abcResults.length) {
    // renderBlockGroups returns block-level nextRow, but also renders group-level finalTotal rows after.
    // The last group's finalTotal sits on the returned nextRow, so we skip past it.
    nextRow = abcResults[abcResults.length - 1].nextRow + 1;
  }

  // TỔNG A + B + C row
  mergeAndStyle(sheet, nextRow, 1, nextRow, 6, "TỔNG A + B + C:", {
    bgColor: COLOR.FINAL_TOTAL_BG, bold: true, hAlign: "center", borders: BORDERS.allMedium(),
  });
  const abcCell = sheet.getCell(nextRow, 7);
  abcCell.value = toNum(summary.tongThucHien);
  abcCell.numFmt = "#,##0.00";
  styleCell(abcCell, { bgColor: COLOR.FINAL_TOTAL_BG, bold: true, hAlign: "center", borders: BORDERS.allMedium() });
  nextRow += 2;

  // Render group D
  const dResults = renderBlockGroups(sheet, groups.slice(3), nextRow, 1, 0, EXCEL_GLOBAL_BLOCKS_LAYOUT, renderOpts);
  if (dResults.length) {
    nextRow = dResults[dResults.length - 1].nextRow + 1;
  }

  // E & F & Signatures
  nextRow = renderSummarySectionE(sheet, nextRow + 1, summary);
  nextRow = renderStatsTableF(sheet, nextRow + 1, summary, renderOptions.useFormulas);
  renderSignatures(sheet, nextRow + 1, summary);

  return sheet;
};

const buildWorkbook = (summaries, options = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VuotGioV2";
  workbook.created = new Date();

  summaries.forEach((summary, index) => {
    const name = summary?.giangVien || `GiangVien_${index + 1}`;
    const trimmed = String(name).replace(/[\\/?*:[\]]/g, " ").slice(0, 31).trim();
    const sheetName = trimmed || `GiangVien_${index + 1}`;
    renderKeKhaiWorksheet(workbook, summary, sheetName, options);
  });

  return workbook;
};

module.exports = {
  buildWorkbook,
  renderKeKhaiWorksheet,
};
