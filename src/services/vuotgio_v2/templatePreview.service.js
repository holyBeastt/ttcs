const path = require("path");
const os = require("os");
const fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");
const ExcelJS = require("exceljs");
const { buildWorkbook } = require("./excel/keKhaiReport.generator");
const { ConsolidatedGenerator, DepartmentGenerator } = require("./department_excel");
const { PDFConverter } = require("./shared_excel");

const execFileAsync = promisify(execFile);

const SOFFICE_CANDIDATES = [
  process.env.LIBREOFFICE_PATH,
  "D:\\Libre\\program\\soffice.exe",
  "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
  "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
].filter(Boolean);

const wrapStageError = (stage, error) => {
  const originalMessage = error?.message || String(error);
  const wrapped = new Error(`[template-preview:${stage}] ${originalMessage}`);
  wrapped.stage = stage;
  wrapped.cause = error;
  return wrapped;
};

const valueToText = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : "";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (value instanceof Date) return normalizeDateText(value);
  if (value && typeof value === "object") {
    if (value.richText) {
      return value.richText.map((part) => part.text || "").join("");
    }
    if (Object.prototype.hasOwnProperty.call(value, "result")) {
      return value.result ?? "";
    }
    if (Object.prototype.hasOwnProperty.call(value, "text")) {
      return value.text || "";
    }
  }
  return String(value);
};

const normalizeDateText = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const excelWidthToHotWidth = (excelWidth) => {
  const numericWidth = Number(excelWidth);
  if (!Number.isFinite(numericWidth) || numericWidth <= 0) {
    return 100;
  }

  return Math.max(40, Math.round(numericWidth * 7.2 + 12));
};

const toHotData = (worksheet) => {
  const maxRow = worksheet.rowCount;
  let maxCol = 0;

  for (let row = 1; row <= maxRow; row += 1) {
    const rowObj = worksheet.getRow(row);
    maxCol = Math.max(maxCol, rowObj.cellCount || 0);
  }

  const hotData = [];
  for (let row = 1; row <= maxRow; row += 1) {
    const rowData = [];
    for (let col = 1; col <= maxCol; col += 1) {
      const cell = worksheet.getCell(row, col);
      rowData.push(valueToText(cell.value));
    }
    hotData.push(rowData);
  }

  const colWidths = [];
  for (let col = 1; col <= maxCol; col += 1) {
    colWidths.push(excelWidthToHotWidth(worksheet.getColumn(col)?.width));
  }

  const mergeCells = [];
  const merges = worksheet.model?.merges || [];
  merges.forEach((address) => {
    const [start, end] = address.split(":");
    const startCell = worksheet.getCell(start);
    const endCell = worksheet.getCell(end || start);
    mergeCells.push({
      row: startCell.row - 1,
      col: startCell.col - 1,
      rowspan: endCell.row - startCell.row + 1,
      colspan: endCell.col - startCell.col + 1,
    });
  });

  return { hotData, mergeCells, colWidths };
};

const getAvailableSofficePath = () => {
  for (const candidate of SOFFICE_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (_error) {
      // Ignore invalid candidate path.
    }
  }
  return null;
};

const convertXlsxBufferToPdf = async (xlsxBuffer) => {
  return PDFConverter.convertXlsxBufferToPdf(xlsxBuffer);
};

const buildWorkbookFromSummary = (summary, useFormulas) => {
  const workbook = buildWorkbook([summary], { useFormulas });
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Workbook không có worksheet");
  }
  return { workbook, worksheet };
};

const sanitizeWorksheetName = (value, fallback) => {
  const trimmed = String(value || fallback || "Sheet1")
    .replace(/[\\/?*:[\]]/g, " ")
    .trim();
  return (trimmed || fallback || "Sheet1").slice(0, 31);
};

const PAYMENT_RATE = 100000;

const trainingSystemMapper = require("../../mappers/vuotgio_v2/trainingSystem.mapper");

const parseTrainingSystemBreakdown = (tableF) => {
  const breakdown = {
    hk1_vn: 0, hk1_lao: 0, hk1_cuba: 0, hk1_cpc: 0, hk1_dongHP: 0,
    hk2_vn: 0, hk2_lao: 0, hk2_cuba: 0, hk2_cpc: 0, hk2_dongHP: 0,
    year_vn: 0, year_lao: 0, year_cuba: 0, year_cpc: 0, year_dongHP: 0,
  };

  if (!tableF || !Array.isArray(tableF.rows)) {
    return breakdown;
  }

  tableF.rows.forEach((row) => {
    const category = trainingSystemMapper.getCategoryKey(
      row.doi_tuong || row.DoiTuong || row.ten_he_dao_tao || row.he_dao_tao
    );

    // Đồ án & tham quan không có thông tin HK → mặc định tính vào HK1
    breakdown[`hk1_${category}`] += Number(row.hk1 || 0) + Number(row.do_an || 0) + Number(row.tham_quan || 0);
    breakdown[`hk2_${category}`] += Number(row.hk2 || 0);
    breakdown[`year_${category}`] += Number(row.tong || 0);
  });

  return breakdown;
};

const distributeOvertimeProportionally = (breakdown, totalOvertime) => {
  const yearTotal =
    breakdown.year_vn +
    breakdown.year_lao +
    breakdown.year_cuba +
    breakdown.year_cpc +
    breakdown.year_dongHP;

  if (yearTotal === 0) {
    return {
      vuot_vn: 0,
      vuot_lao: 0,
      vuot_cuba: 0,
      vuot_cpc: 0,
      vuot_dongHP: 0,
    };
  }

  return {
    vuot_vn: (breakdown.year_vn / yearTotal) * totalOvertime,
    vuot_lao: (breakdown.year_lao / yearTotal) * totalOvertime,
    vuot_cuba: (breakdown.year_cuba / yearTotal) * totalOvertime,
    vuot_cpc: (breakdown.year_cpc / yearTotal) * totalOvertime,
    vuot_dongHP: (breakdown.year_dongHP / yearTotal) * totalOvertime,
  };
};

const excelNumber = (value) => Number(Number(value || 0).toFixed(2));

const buildPaymentWorksheet = (workbook, summaries, khoa, namHoc) => {
  // Use the new PaymentGenerator from department_excel module
  const { PaymentGenerator } = require("./department_excel");
  
  return PaymentGenerator.createPaymentSheet(workbook, {
    summaries,
    khoa,
    namHoc
  });
};

const attachDepartmentSheet = (workbook, { summaries, khoa, namHoc }) => {
  // Use the new DepartmentGenerator from department_excel module
  return DepartmentGenerator.createDepartmentSheet(workbook, {
    summaries,
    khoa,
    namHoc
  });
};

const buildDepartmentWorkbook = ({ summaries, khoa, namHoc }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "VuotGioV2";
  workbook.created = new Date();
  attachDepartmentSheet(workbook, { summaries, khoa, namHoc });
  return workbook;
};

const buildDepartmentPreviewPdf = async ({ summaries, khoa, namHoc }) => {
  const workbook = DepartmentGenerator.generateDepartmentWorkbook({ summaries, khoa, namHoc });
  let xlsxBuffer;
  try {
    xlsxBuffer = await workbook.xlsx.writeBuffer();
  } catch (error) {
    throw wrapStageError("write-xlsx-buffer", error);
  }

  let pdfBuffer;
  try {
    pdfBuffer = await convertXlsxBufferToPdf(Buffer.from(xlsxBuffer));
  } catch (error) {
    throw wrapStageError("convert-pdf-libreoffice", error);
  }

  return {
    previewType: "pdf",
    pdfBase64: pdfBuffer.toString("base64"),
    warnings: [],
    intermediateJson: null,
    meta: {
      khoa,
      namHoc,
      sheetName: sanitizeWorksheetName(khoa, "PreviewKhoa"),
      totalSummaries: summaries.length,
    },
  };
};

const buildTemplatePreview = async ({ summary }) => {
  const { worksheet } = buildWorkbookFromSummary(summary, false);

  let hotData;
  let mergeCells;
  let colWidths;
  try {
    ({ hotData, mergeCells, colWidths } = toHotData(worksheet));
  } catch (error) {
    throw wrapStageError("build-hot-data", error);
  }

  return {
    hotData,
    mergeCells,
    colWidths,
    styles: [],
    warnings: [],
    intermediateJson: null,
    meta: {
      giangVien: summary.giangVien,
      namHoc: summary.nam_hoc || summary.namHoc,
      khoa: summary.maKhoa,
      templateSheet: worksheet.name,
    },
  };
};

const buildTemplatePreviewPdf = async ({ summary }) => {
  const { workbook, worksheet } = buildWorkbookFromSummary(summary, false);

  let xlsxBuffer;
  try {
    xlsxBuffer = await workbook.xlsx.writeBuffer();
  } catch (error) {
    throw wrapStageError("write-xlsx-buffer", error);
  }

  let pdfBuffer;
  try {
    pdfBuffer = await convertXlsxBufferToPdf(Buffer.from(xlsxBuffer));
  } catch (error) {
    throw wrapStageError("convert-pdf-libreoffice", error);
  }

  return {
    previewType: "pdf",
    pdfBase64: pdfBuffer.toString("base64"),
    warnings: [],
    intermediateJson: null,
    meta: {
      giangVien: summary.giangVien,
      namHoc: summary.nam_hoc || summary.namHoc,
      khoa: summary.maKhoa,
      templateSheet: worksheet.name,
    },
  };
};

const buildConsolidatedPreviewPdf = async ({ namHoc }) => {
  let workbook;
  try {
    workbook = await ConsolidatedGenerator.generateConsolidatedWorkbook(namHoc);
  } catch (error) {
    throw wrapStageError("build-consolidated-workbook", error);
  }

  let xlsxBuffer;
  try {
    xlsxBuffer = await workbook.xlsx.writeBuffer();
  } catch (error) {
    throw wrapStageError("write-xlsx-buffer", error);
  }

  let pdfBuffer;
  try {
    pdfBuffer = await convertXlsxBufferToPdf(Buffer.from(xlsxBuffer));
  } catch (error) {
    throw wrapStageError("convert-pdf-libreoffice", error);
  }

  return {
    previewType: "pdf",
    pdfBase64: pdfBuffer.toString("base64"),
    warnings: [],
    intermediateJson: null,
    meta: {
      namHoc,
      previewType: "consolidated",
      totalSheets: workbook.worksheets.length,
      sheetNames: workbook.worksheets.map(ws => ws.name),
    },
  };
};

module.exports = {
  attachDepartmentSheet,
  buildTemplatePreview,
  buildTemplatePreviewPdf,
  buildDepartmentPreviewPdf,
  buildConsolidatedPreviewPdf,
};
