/**
 * Cell Formatter - Common cell formatting utilities
 */

class CellFormatter {
  /**
   * Apply border to cell
   */
  static applyBorder(cell, borderStyle = "thin") {
    cell.border = {
      top: { style: borderStyle },
      left: { style: borderStyle },
      bottom: { style: borderStyle },
      right: { style: borderStyle }
    };
  }

  /**
   * Apply standard header styling
   */
  static applyHeaderStyle(cell, options = {}) {
    const defaultOptions = {
      bold: true,
      fontSize: 11,
      fontColor: "FFFFFF",
      bgColor: "70AD47",
      hAlign: "center",
      vAlign: "middle",
      wrapText: true
    };

    const opts = { ...defaultOptions, ...options };

    cell.font = {
      bold: opts.bold,
      size: opts.fontSize,
      color: { argb: opts.fontColor }
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: opts.bgColor }
    };

    cell.alignment = {
      horizontal: opts.hAlign,
      vertical: opts.vAlign,
      wrapText: opts.wrapText
    };

    this.applyBorder(cell);
  }

  /**
   * Apply standard title styling
   */
  static applyTitleStyle(cell, options = {}) {
    const defaultOptions = {
      bold: true,
      fontSize: 14,
      fontColor: "FFFFFF",
      bgColor: "1F4E79",
      hAlign: "center",
      vAlign: "middle"
    };

    const opts = { ...defaultOptions, ...options };

    cell.font = {
      bold: opts.bold,
      size: opts.fontSize,
      color: { argb: opts.fontColor }
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: opts.bgColor }
    };

    cell.alignment = {
      horizontal: opts.hAlign,
      vertical: opts.vAlign
    };

    this.applyBorder(cell);
  }

  /**
   * Apply data cell styling
   */
  static applyDataStyle(cell, options = {}) {
    const defaultOptions = {
      hAlign: "center",
      vAlign: "middle",
      fontSize: 11
    };

    const opts = { ...defaultOptions, ...options };

    if (opts.fontSize) {
      cell.font = { size: opts.fontSize };
    }

    cell.alignment = {
      horizontal: opts.hAlign,
      vertical: opts.vAlign,
      wrapText: opts.wrapText
    };

    if (opts.numFmt) {
      cell.numFmt = opts.numFmt;
    }

    this.applyBorder(cell);
  }

  /**
   * Apply total row styling
   */
  static applyTotalStyle(cell, options = {}) {
    const defaultOptions = {
      bold: true,
      bgColor: "FFEAECEE",
      hAlign: "center",
      vAlign: "middle",
      numFmt: "#,##0.00"
    };

    const opts = { ...defaultOptions, ...options };

    cell.font = { bold: opts.bold };

    if (opts.bgColor) {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: opts.bgColor }
      };
    }

    cell.alignment = {
      horizontal: opts.hAlign,
      vertical: opts.vAlign,
      shrinkToFit: true
    };

    if (opts.numFmt) {
      cell.numFmt = opts.numFmt;
    }

    this.applyBorder(cell);
  }

  /**
   * Merge cells and apply styling
   */
  static mergeAndStyle(worksheet, startRow, startCol, endRow, endCol, value, options = {}) {
    const range = `${this.columnToLetter(startCol)}${startRow}:${this.columnToLetter(endCol)}${endRow}`;
    worksheet.mergeCells(range);
    
    const cell = worksheet.getCell(startRow, startCol);
    cell.value = value;

    if (options.title) {
      this.applyTitleStyle(cell, options);
    } else if (options.header) {
      this.applyHeaderStyle(cell, options);
    } else if (options.total) {
      this.applyTotalStyle(cell, options);
    } else {
      this.applyDataStyle(cell, options);
    }
  }

  /**
   * Convert column number to Excel letter
   */
  static columnToLetter(column) {
    let result = '';
    while (column > 0) {
      column--;
      result = String.fromCharCode(65 + (column % 26)) + result;
      column = Math.floor(column / 26);
    }
    return result;
  }

  /**
   * Truncate number to specified decimal places
   */
  static truncDecimals(value, digits = 2) {
    const factor = Math.pow(10, digits);
    return Math.trunc(value * factor) / factor;
  }

  /**
   * Write an Excel formula to a cell with optional pre-calculated result.
   *
   * The `result` field is used by ExcelJS as a cached value so that the file
   * renders correctly even when opened by tools that do not evaluate formulas
   * (e.g. LibreOffice in headless PDF conversion mode).
   *
   * @param {ExcelJS.Cell} cell    - Target cell
   * @param {string}       formula - Formula string WITHOUT leading "=", e.g. "SUM(H9:H12)"
   * @param {number}       [result=0] - Pre-calculated result for cache
   * @param {object}       [options={}] - Forwarded to applyDataStyle
   */
  static applyFormula(cell, formula, result = 0, options = {}) {
    cell.value = { formula, result };
    this.applyDataStyle(cell, options);
  }
}

module.exports = CellFormatter;