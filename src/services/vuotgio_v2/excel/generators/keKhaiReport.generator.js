const { ExcelJS, BORDERS, COLOR, mergeAndStyle, styleCell } = require("../utils/excel-style.utils");
const { EXCEL_GLOBAL_BLOCKS_LAYOUT } = require("../layouts/excel-global-layout.config");
const { buildTableFFormulaRows } = require("../formulas/tableF.formula.builder");
const { buildHeader, buildGroups } = require("../layout/kekhai.layout.builder");
const { renderPaymentSheet } = require("../components/kekhai-payment.component");
const { renderBlockGroups } = require("../components/excel-block.renderer");
const { toNum } = require("../utils/sdo-data.helpers");
const KeKhaiSummaryComponent = require("../components/kekhai-summary.component");
const KeKhaiFormulaGenerator = require("./kekhai-formula.generator");

const renderSignatures = (sheet, startRow, summary) => {
  let row = startRow + 1;

  const signatures = [
    { title: "CHỦ NHIỆM KHOA", subtitle: "(ký, ghi rõ họ tên)", name: summary?.chuNhiemKhoa || "", colStart: 1, colEnd: 3 },
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

const renderKeKhaiWorksheet = (workbook, summary, sheetName, renderOptions = {}) => {
  const header = buildHeader(summary);
  const groups = buildGroups(summary);

  const sheet = workbook.addWorksheet(sheetName, {
    pageSetup: { orientation: "portrait", paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const headerRow = require("../components/excel-header.renderer").renderDocumentHeader(sheet, header, 1, 1);
  let nextRow = headerRow + 1;

  const useFormulas = renderOptions.useFormulas ?? true;
  const renderOpts = {
    ...renderOptions,
    useFormulas,
    codeSeparator: ". ",
    sectionNumbering: false,
    sectionSubtotalGap: 1,
  };

  const abcResults = renderBlockGroups(sheet, groups.slice(0, 3), nextRow, 1, 1, EXCEL_GLOBAL_BLOCKS_LAYOUT, renderOpts);
  if (abcResults.length) {
    nextRow = abcResults[abcResults.length - 1].nextRow + 1;
  }

  mergeAndStyle(sheet, nextRow, 1, nextRow, 6, "TỔNG A + B + C:", {
    bgColor: COLOR.FINAL_TOTAL_BG, bold: true, hAlign: "center", borders: BORDERS.allMedium(),
  });
  const abcCell = sheet.getCell(nextRow, 7);
  const abcFormula = KeKhaiFormulaGenerator.getSumABCFormula(abcResults.groupMetas);
  abcCell.value = KeKhaiFormulaGenerator.getCellValue(toNum(summary.tongThucHien), abcFormula, useFormulas);
  abcCell.numFmt = "#,##0.00";
  styleCell(abcCell, { bgColor: COLOR.FINAL_TOTAL_BG, bold: true, hAlign: "center", borders: BORDERS.allMedium() });
  nextRow += 2;

  const dResults = renderBlockGroups(sheet, groups.slice(3), nextRow, 1, 1, EXCEL_GLOBAL_BLOCKS_LAYOUT, renderOpts);
  if (dResults.length) {
    nextRow = dResults[dResults.length - 1].nextRow + 1;
  }

  nextRow = KeKhaiSummaryComponent.renderSummarySectionE(sheet, nextRow + 2, summary, abcResults.groupMetas, useFormulas);
  const tableFFormulaRows = useFormulas ? buildTableFFormulaRows(abcResults) : null;
  nextRow = KeKhaiSummaryComponent.renderStatsTableF(sheet, nextRow + 2, summary, useFormulas, tableFFormulaRows);
  renderSignatures(sheet, nextRow + 2, summary);

  return sheet;
};

const buildWorkbook = (summaries, options = {}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VuotGioV2";
  workbook.created = new Date();

  const useFormulas = options.useFormulas ?? true;
  const resolvedOptions = { ...options, useFormulas };

  summaries.forEach((summary, index) => {
    const name = summary?.giangVien || `GiangVien_${index + 1}`;
    const trimmed = String(name).replace(/[\\/?*:[\]]/g, " ").slice(0, 31).trim();
    const sheetName = trimmed || `GiangVien_${index + 1}`;
    renderKeKhaiWorksheet(workbook, summary, sheetName, resolvedOptions);
  });

  if (options.includePaymentSheet) {
    renderPaymentSheet(workbook, summaries);
  }

  return workbook;
};

module.exports = {
  buildWorkbook,
  renderKeKhaiWorksheet,
};
