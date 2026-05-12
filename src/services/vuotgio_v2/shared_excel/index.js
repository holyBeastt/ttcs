/**
 * Shared Excel Module
 * Common utilities for Excel generation
 */

module.exports = {
  // Core utilities
  WorkbookFactory: require('./core/workbook.factory'),
  CellFormatter: require('./core/cell.formatter'),
  PDFConverter: require('./core/pdf.converter')
};