/**
 * Department Generator - Generates single department Excel sheets
 *
 * Hybrid mode:
 *   createDepartmentSheet with isExport=false (default) → static values (preview/PDF)
 *   generateDepartmentWorkbook                         → Excel formulas (file export)
 */

const WorkbookFactory = require("../../shared_excel/core/workbook.factory");
const HeaderComponent = require("../components/header.component");
const SummaryComponent = require("../components/summary.component");
const DepartmentLayout = require("../layouts/department.layout");

class DepartmentGenerator {
  /**
   * Generate department sheet in existing workbook.
   *
   * @param {ExcelJS.Workbook} workbook
   * @param {object} opts
   * @param {string}  opts.khoa
   * @param {string}  [opts.maKhoa]
   * @param {Array}   opts.summaries
   * @param {string}  opts.namHoc
   * @param {boolean} [opts.isExport=false] - true → write Excel formulas; false → static values
   */
  static createDepartmentSheet(workbook, { khoa, maKhoa, summaries, namHoc, isExport = false }) {
    const sheetName = WorkbookFactory.sanitizeWorksheetName(khoa || maKhoa || "Khác", "PreviewKhoa");
    const worksheet = WorkbookFactory.createWorksheet(workbook, sheetName, {
      frozenRows: 5,
      pageSetup: {
        orientation: "landscape",
        paperSize: 9, // A4
        fitToPage: true,
        fitToWidth: 1,
        margins: {
          left: 0.2,
          right: 0.2,
          top: 0.25,
          bottom: 0.25,
          header: 0.1,
          footer: 0.1,
        },
      }
    });

    // Apply layout (36 columns)
    DepartmentLayout.applyLayout(worksheet);

    // Create header (rows 1-2)
    let currentRow = HeaderComponent.createDepartmentHeader(worksheet, { khoa, namHoc });
    
    // Create column headers (rows 3-5)
    currentRow = HeaderComponent.createDepartmentColumnHeaders(worksheet, currentRow);

    // Create summary table — pass isExport flag for hybrid formula/value mode
    const result = SummaryComponent.createDepartmentSummaryTable(
      worksheet, summaries, currentRow, { isExport }
    );

    return {
      sheet: worksheet,
      totalThanhToan: result.totalThanhToan,
      totalVuot: result.totalVuot,
      dataRowCount: result.dataRowCount
    };
  }

  /**
   * Generate standalone department workbook for file download.
   * Uses isExport=true → Excel formulas for dynamic recalculation.
   */
  static generateDepartmentWorkbook({ summaries, khoa, namHoc }) {
    const workbook = WorkbookFactory.createWorkbook({
      title: `Department Report - ${khoa}`,
      subject: `Vượt giờ ${namHoc}`
    });

    this.createDepartmentSheet(workbook, { khoa, summaries, namHoc, isExport: true });

    return workbook;
  }
}

module.exports = DepartmentGenerator;