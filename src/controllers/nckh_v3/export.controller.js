const exportService = require("../../services/nckh_v3/export.service");
const { STATS_SCOPE } = require("../../config/nckh_v3/statsScope");

class ExportController {
  /**
   * Export lecturer statistics to Excel.
   * GET /v3/nckh/export/stats/giang-vien?namHoc=...&khoaId=...&keyword=...
   */
  async exportLecturerStats(req, res, scope = STATS_SCOPE.OFFICIAL) {
    try {
      const { namHoc, khoaId = "ALL", keyword = "" } = req.query;
      if (!namHoc) return res.status(400).json({ success: false, message: "Thiếu năm học" });

      const workbook = await exportService.exportLecturerStats(namHoc, khoaId, keyword, scope);
      const filename = `ThongKe_NCKH_GiangVien_${namHoc}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("[NCKH V3] export lecturer stats error:", error);
      res.status(500).json({ success: false, message: error.message || "Lỗi khi xuất file Excel" });
    }
  }

  /**
   * Export faculty statistics to Excel.
   * GET /v3/nckh/export/stats/khoa?namHoc=...&khoaId=...
   */
  async exportFacultyStats(req, res, scope = STATS_SCOPE.OFFICIAL) {
    try {
      const { namHoc, khoaId = "ALL" } = req.query;
      if (!namHoc) throw new Error("Thiếu năm học");

      const workbook = await exportService.exportFacultyStats(namHoc, khoaId, scope);
      const filename = `ThongKe_NCKH_Khoa_${namHoc}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("[NCKH V3] export faculty stats error:", error);
      res.status(500).json({ success: false, message: error.message || "Lỗi khi xuất file Excel" });
    }
  }

  /**
   * Export institute statistics to Excel.
   * GET /v3/nckh/export/stats/hoc-vien?namHoc=...
   */
  async exportInstituteStats(req, res, scope = STATS_SCOPE.OFFICIAL) {
    try {
      const { namHoc } = req.query;
      if (!namHoc) throw new Error("Thiếu năm học");

      const workbook = await exportService.exportInstituteStats(namHoc, scope);
      const filename = `ThongKe_NCKH_HocVien_${namHoc}.xlsx`;

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error("[NCKH V3] export institute stats error:", error);
      res.status(500).json({ success: false, message: error.message || "Lỗi khi xuất file Excel" });
    }
  }
}

module.exports = new ExportController();
