/**
 * NCKH V3 Import Controller
 * Handles rendering import page, previewing Excel, and saving data.
 */

const importService = require("../../services/nckh_v3/import.service");
const { IMPORT_TYPES } = require("../../mappers/nckh_v3/import.mapper");

class ImportController {
  /**
   * GET /v3/nckh/import
   * Render the import page.
   */
  renderImportPage(req, res) {
    res.render("nckh_v3/import.ejs", {
      importTypes: IMPORT_TYPES,
    });
  }

  /**
   * POST /v3/nckh/import/preview
   * Upload Excel file, parse and return JSON preview.
   */
  async previewExcel(req, res) {
    try {
      const type = req.body.type;
      const namHoc = req.body.namHoc;
      if (!type) {
        return res.status(400).json({ success: false, message: "Chưa chọn loại NCKH." });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: "Vui lòng chọn file Excel." });
      }

      const preview = await importService.buildPreview(req.file.buffer, type, namHoc);

      return res.json({
        success: true,
        message: `Đọc file thành công: ${preview.totalRows} bản ghi`,
        data: preview,
      });
    } catch (error) {
      console.error("[NCKH V3 Import] Preview error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi khi xử lý file Excel.",
      });
    }
  }

  /**
   * POST /v3/nckh/import/save
   * Save validated records to database.
   */
  async saveImportData(req, res) {
    try {
      const records = req.body.records;
      if (!Array.isArray(records) || records.length === 0) {
        return res.status(400).json({ success: false, message: "Không có dữ liệu để lưu." });
      }

      const userContext = {
        userId: req.session?.userId || 1,
        userName: req.session?.TenNhanVien || req.session?.username || "ADMIN",
      };

      const result = await importService.saveToDatabase(records, userContext);

      const hasFailures = result.failedCount > 0;
      return res.json({
        success: !hasFailures, // success = true nếu tất cả OK; false nếu có record lỗi
        message: hasFailures
          ? `Import thành công ${result.savedCount} công trình, ${result.failedCount} bản ghi lỗi.`
          : `Import thành công ${result.savedCount} công trình NCKH.`,
        savedCount: result.savedCount,
        failedCount: result.failedCount,
        failedRecords: result.failedRecords,
      });
    } catch (error) {
      console.error("[NCKH V3 Import] Save error:", error);
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi khi lưu dữ liệu.",
      });
    }
  }
}

module.exports = new ImportController();
