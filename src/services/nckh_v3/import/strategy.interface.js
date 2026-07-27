/**
 * NCKH Import Strategy Interface
 * Base class for concrete processing strategies.
 */
class NCKHImportStrategy {
  /**
   * Process raw input into unified NCKHUnifiedRecord objects.
   * @param {Object} input - Raw input payload (Excel buffer, or Form JSON body)
   * @param {Object} options - Common options (e.g. type, namHoc)
   * @returns {Promise<Array<Object>>} - Array of processed unified records
   */
  async process(input, options) {
    throw new Error("Method 'process(input, options)' must be implemented.");
  }
}

module.exports = NCKHImportStrategy;
