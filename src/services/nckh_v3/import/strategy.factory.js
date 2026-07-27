const ExcelImportStrategy = require("./excel.strategy");
const ManualInputStrategy = require("./manual.strategy");

/**
 * Strategy Factory for NCKH Imports
 */
class NCKHImportStrategyFactory {
  /**
   * Instantiate and return the matching import strategy.
   * @param {string} sourceType - 'EXCEL' or 'MANUAL'
   * @returns {NCKHImportStrategy}
   */
  static getStrategy(sourceType) {
    if (!sourceType) {
      throw new Error("Source type is required to resolve strategy.");
    }
    const typeUpper = sourceType.toUpperCase();
    if (typeUpper === "EXCEL") {
      return new ExcelImportStrategy();
    }
    if (typeUpper === "MANUAL") {
      return new ManualInputStrategy();
    }
    throw new Error(`Unsupported source type for NCKH strategy: ${sourceType}`);
  }
}

module.exports = NCKHImportStrategyFactory;
