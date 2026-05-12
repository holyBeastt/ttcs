/**
 * Workbook Factory - Common workbook creation utilities
 */

const ExcelJS = require("exceljs");

class WorkbookFactory {
  /**
   * Create a new workbook with standard metadata
   */
  static createWorkbook(options = {}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = options.creator || "VuotGioV2";
    workbook.created = new Date();
    workbook.modified = new Date();
    
    if (options.title) {
      workbook.title = options.title;
    }
    
    if (options.subject) {
      workbook.subject = options.subject;
    }
    
    return workbook;
  }

  /**
   * Create worksheet with standard page setup
   */
  static createWorksheet(workbook, name, options = {}) {
    const defaultPageSetup = {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: {
        left: 0.2,
        right: 0.2,
        top: 0.25,
        bottom: 0.25,
        header: 0.1,
        footer: 0.1
      }
    };

    const worksheet = workbook.addWorksheet(name, {
      pageSetup: { ...defaultPageSetup, ...options.pageSetup }
    });

    // Default properties
    worksheet.properties.defaultRowHeight = options.defaultRowHeight || 22;
    
    if (options.frozenRows) {
      worksheet.views = [{ state: "frozen", ySplit: options.frozenRows }];
    }

    return worksheet;
  }

  /**
   * Sanitize worksheet name to be Excel-compatible
   */
  static sanitizeWorksheetName(name, fallback = "Sheet1") {
    const trimmed = String(name || fallback)
      .replace(/[\\/?*:[\]]/g, " ")
      .trim();
    return (trimmed || fallback).slice(0, 31);
  }
}

module.exports = WorkbookFactory;