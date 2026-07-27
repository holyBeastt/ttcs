/**
 * NCKH V3 Import Service
 * Refactored using Factory & Strategy pattern. Delegates execution to concrete strategies.
 */

const NCKHImportStrategyFactory = require("./import/strategy.factory");
const NCKHSaveService = require("./import/save.service");

/**
 * Parse Excel and return preview data.
 */
const buildPreview = async (fileBuffer, type, namHocFromUI) => {
  const strategy = NCKHImportStrategyFactory.getStrategy("EXCEL");
  const records = await strategy.process(fileBuffer, { type, namHoc: namHocFromUI });

  return {
    totalRows: records.length,
    errorCount: records.filter((r) => r.status === "error").length,
    duplicateCount: records.filter((r) => r.status === "duplicate").length,
    records,
  };
};

/**
 * Save records to database.
 */
const saveToDatabase = async (records, userContext) => {
  return NCKHSaveService.save(records, userContext, "per-record");
};

module.exports = {
  buildPreview,
  saveToDatabase,
};
