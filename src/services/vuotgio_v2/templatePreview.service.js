const path = require("path");
const os = require("os");
const fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { buildWorkbook } = require("./excel/keKhaiReport.generator");


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
  const sofficePath = getAvailableSofficePath();
  if (!sofficePath) {
    throw new Error("Không tìm thấy LibreOffice (soffice.exe) để render preview PDF");
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "vg-preview-"));
  const xlsxPath = path.join(tempDir, "preview.xlsx");
  const pdfPath = path.join(tempDir, "preview.pdf");

  try {
    fs.writeFileSync(xlsxPath, xlsxBuffer);

    await execFileAsync(
      sofficePath,
      ["--headless", "--convert-to", "pdf", "--outdir", tempDir, xlsxPath],
      { timeout: 60000 },
    );

    if (!fs.existsSync(pdfPath)) {
      throw new Error("LibreOffice không sinh ra file PDF");
    }

    return fs.readFileSync(pdfPath);
  } finally {
    try {
      if (fs.existsSync(xlsxPath)) fs.unlinkSync(xlsxPath);
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_cleanupError) {
      // Ignore cleanup errors.
    }
  }
};

const buildWorkbookFromSummary = (summary, useFormulas) => {
  const workbook = buildWorkbook([summary], { useFormulas });
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Workbook không có worksheet");
  }
  return { workbook, worksheet };
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

module.exports = {
  buildTemplatePreview,
  buildTemplatePreviewPdf,
};
