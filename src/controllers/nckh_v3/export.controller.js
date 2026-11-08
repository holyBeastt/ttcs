const exportService = require("../../services/nckh_v3/export.service");
const { STATS_SCOPE } = require("../../config/nckh_v3/statsScope");

class ExportController {
  /**
   * Export lecturer statistics to Excel.
   * GET /v3/nckh/export/stats/giang-vien?namHoc=...&khoaId=...&keyword=...
   */
  async exportLecturerStats(req, res, scope = STATS_SCOPE.OFFICIAL) {
    try {
      const { namHoc, namHocFrom, namHocTo, khoaId = "ALL", keyword = "", lecturerId = "" } = req.query;
      if (!namHoc && (!namHocFrom || !namHocTo)) return res.status(400).json({ success: false, message: "Thiếu năm học" });

      const workbook = await exportService.exportLecturerStats(namHoc || namHocFrom, khoaId, keyword, scope, {
        namHocFrom,
        namHocTo,
        lecturerId,
      });
      const yearLabel = namHocFrom && namHocTo ? `${namHocFrom}_den_${namHocTo}` : namHoc;
      const filename = `ThongKe_NCKH_GiangVien_${yearLabel}.xlsx`;

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
      const { namHoc, namHocFrom, namHocTo, khoaId = "ALL" } = req.query;
      if (!namHoc && (!namHocFrom || !namHocTo)) throw new Error("Thiếu năm học");

      const workbook = await exportService.exportFacultyStats(namHoc || namHocFrom, khoaId, scope, { namHocFrom, namHocTo });
      const yearLabel = namHocFrom && namHocTo ? `${namHocFrom}_den_${namHocTo}` : namHoc;
      const filename = `ThongKe_NCKH_Khoa_${yearLabel}.xlsx`;

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
      const { namHoc, namHocFrom, namHocTo } = req.query;
      if (!namHoc && (!namHocFrom || !namHocTo)) throw new Error("Thiếu năm học");

      const workbook = await exportService.exportInstituteStats(namHoc || namHocFrom, scope, { namHocFrom, namHocTo });
      const yearLabel = namHocFrom && namHocTo ? `${namHocFrom}_den_${namHocTo}` : namHoc;
      const filename = `ThongKe_NCKH_HocVien_${yearLabel}.xlsx`;

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
