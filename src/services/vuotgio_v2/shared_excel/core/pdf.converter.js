/**
 * PDF Converter - LibreOffice PDF conversion utilities
 */

const path = require("path");
const os = require("os");
const fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

class PDFConverter {
  static SOFFICE_CANDIDATES = [
    process.env.LIBREOFFICE_PATH,
    // Linux
    "/usr/bin/soffice",
    "/usr/local/bin/soffice",
    // Windows
    "D:\\Libre\\program\\soffice.exe",
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ].filter(Boolean);

  /**
   * Get available LibreOffice path
   */
  static getAvailableSofficePath() {
    for (const candidate of this.SOFFICE_CANDIDATES) {
      try {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      } catch (_error) {
        // Ignore invalid candidate path
      }
    }
    return null;
  }

  /**
   * Convert Excel buffer to PDF buffer
   */
  static async convertXlsxBufferToPdf(xlsxBuffer) {
    const sofficePath = this.getAvailableSofficePath();
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
        { timeout: 60000 }
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
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Wrap stage error for better debugging
   */
  static wrapStageError(stage, error) {
    const originalMessage = error?.message || String(error);
    const wrapped = new Error(`[pdf-converter:${stage}] ${originalMessage}`);
    wrapped.stage = stage;
    wrapped.cause = error;
    return wrapped;
  }
}

module.exports = PDFConverter;